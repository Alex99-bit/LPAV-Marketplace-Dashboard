import { getCorsHeaders } from "../_shared/cors.ts";
import { getUser, createServiceClient } from "../_shared/auth.ts";

const QUALIFICATION_SCHEMA = {
  type: "object",
  properties: {
    reply: { type: "string" },
    extracted_fields: {
      type: "object",
      properties: {
        number_of_travelers: { type: ["number", "null"] },
        preferred_travel_dates: { type: ["string", "null"] },
        estimated_budget: { type: ["string", "null"] },
        travel_type: { type: ["string", "null"] },
        traveler_origin: { type: ["string", "null"] },
        preferred_airline: { type: ["string", "null"] },
        accommodation_type: { type: ["string", "null"] },
        special_requirements: { type: ["string", "null"] },
      },
    },
    should_transfer_to_human: { type: "boolean" },
  },
  required: ["reply", "extracted_fields", "should_transfer_to_human"],
};

const REQUIRED_FIELDS = ["estimated_budget"];
const OPTIONAL_FIELDS = [
  "number_of_travelers",
  "preferred_travel_dates",
  "travel_type",
  "traveler_origin",
  "preferred_airline",
  "accommodation_type",
];

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const user = await getUser(req);
  if (!user) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let leadId: string;
  let conversationId: string;
  let latestMessage: string;
  try {
    const body = await req.json();
    leadId = body.lead_id;
    conversationId = body.conversation_id;
    latestMessage = body.latest_message;
  } catch {
    return new Response(JSON.stringify({ error: "Body JSON invalido" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!leadId || !conversationId || !latestMessage) {
    return new Response(
      JSON.stringify({ error: "lead_id, conversation_id y latest_message son requeridos" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const supabase = createServiceClient();

  // Verificar que la agencia tiene un plan con pre-calificación IA
  // Plan Básico no cuenta con agente de IA
  const { data: profileData } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (profileData?.tenant_id) {
    const { data: tenant } = await supabase
      .from("agencies_tenants")
      .select("plan_type")
      .eq("tenant_id", profileData.tenant_id)
      .single();

    if (tenant?.plan_type === "Básico") {
      return new Response(JSON.stringify({ error: "Tu plan no incluye pre-calificación con IA. Actualiza a Plan Intermedio o superior para acceder a esta funcionalidad." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  try {
    const { data: lead, error: leadError } = await supabase
      .from("crm_leads")
      .select("*, travel_packages(title, region, price, currency), agencies_tenants(business_name)")
      .eq("lead_id", leadId)
      .single();

    if (leadError || !lead) {
      return new Response(JSON.stringify({ error: "Lead no encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: session } = await supabase
      .from("crm_ai_qualification_sessions")
      .select("*")
      .eq("lead_id", leadId)
      .eq("status", "active")
      .maybeSingle();

    if (!session) {
      return new Response(JSON.stringify({ error: "Sesion de IA no activa" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: messages } = await supabase
      .from("chat_messages")
      .select("sender_id, message_text, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(30);

    const chatHistory = (messages ?? [])
      .filter((m) => !m.message_text.startsWith("[SYSTEM]"))
      .map((m) => `${m.sender_id === user.id ? "Viajero" : "Agente"}: ${m.message_text}`)
      .join("\n");

    const pkg = lead.travel_packages as unknown as { title: string; region: string; price: number; currency: string } | null;
    const agency = lead.agencies_tenants as unknown as { business_name: string } | null;

    const previouslyExtracted = session.fields_extracted ?? {};
    const extractedSoFar = Object.entries(previouslyExtracted)
      .filter(([, v]) => v !== null && v !== undefined)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");

    const systemPrompt = `Eres un asesor de viajes amable y profesional${agency ? ` de ${agency.business_name}` : ""}. El viajero esta interesado en el paquete: "${pkg?.title ?? "viaje"}" (${pkg?.region ?? "destino"}, desde ${pkg?.price ?? "N/A"} ${pkg?.currency ?? "MXN"}).

Tu objetivo es conversar naturalmente con el viajero, resolver sus dudas sobre el paquete y, de forma organica, obtener la siguiente informacion:

OBLIGATORIO:
- Presupuesto estimado (puede ser monto exacto o rango, ej: "15000" o "15000-25000")

OPCIONAL (pregunta de forma natural, no como interrogatorio):
- Numero de viajeros
- Fechas preferidas de viaje
- Tipo de viaje (Playa, Aventura, Cultural, Familiar, Lujo, Mochilero)
- Ciudad/pais de origen
- Aerolinea preferida
- Tipo de alojamiento (Hotel, Hostel, Airbnb, Resort, All-Inclusive)
- Requerimientos especiales

INFORMACION YA OBTENIDA: ${extractedSoFar || "Nada aun"}

REGLAS:
- NUNCA reveles que eres una IA. Actua como un agente humano.
- No hagas mas de 2 preguntas por mensaje.
- Si el viajero pide hablar con un humano, establece should_transfer_to_human en true.
- Si el viajero se niega a dar informacion, no insistas y establece should_transfer_to_human en true.
- Se conciso, amable y natural.
- Responde siempre en espanol.
- Si ya tienes el presupuesto (obligatorio), puedes mencionar que un agente humano se comunicara pronto con una propuesta personalizada.`;

    const prompt = `${systemPrompt}

HISTORIAL DEL CHAT:
${chatHistory}

ULTIMO MENSAJE DEL VIAJERO:
${latestMessage}

Responde al viajero y extrae la informacion que puedas del contexto.`;

    const API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!API_KEY) throw new Error("GEMINI_API_KEY no configurada");

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": API_KEY,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: QUALIFICATION_SCHEMA,
            temperature: 0.7,
            topP: 0.9,
            maxOutputTokens: 1024,
          },
        }),
      },
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      throw new Error(`Gemini API error: ${geminiResponse.status} - ${errorText}`);
    }

    const geminiData = await geminiResponse.json();
    const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Gemini no genero contenido valido");

    const aiResult = JSON.parse(text) as {
      reply: string;
      extracted_fields: Record<string, unknown>;
      should_transfer_to_human: boolean;
    };

    const newExtracted = { ...previouslyExtracted };
    const fields = aiResult.extracted_fields;
    for (const [key, value] of Object.entries(fields)) {
      if (value !== null && value !== undefined && value !== "") {
        newExtracted[key] = value;
      }
    }

    const hasRequired = REQUIRED_FIELDS.every((f) => newExtracted[f] !== undefined && newExtracted[f] !== null);
    const qualificationCompleted = hasRequired;

    let budgetNumeric: number | undefined;
    const budgetValue = newExtracted.estimated_budget;
    if (budgetValue !== undefined && budgetValue !== null) {
      const budgetStr = String(budgetValue);
      const match = budgetStr.match(/[\d.]+/);
      if (match) {
        budgetNumeric = parseFloat(match[0]);
      }
    }

    const leadUpdate: Record<string, unknown> = {
      ai_qualification_progress: newExtracted,
      ai_qualification_completed: qualificationCompleted,
    };

    if (fields.number_of_travelers !== undefined) leadUpdate.number_of_travelers = Number(fields.number_of_travelers);
    if (fields.preferred_travel_dates !== undefined) leadUpdate.preferred_travel_dates = String(fields.preferred_travel_dates);
    if (budgetNumeric !== undefined) leadUpdate.estimated_budget = budgetNumeric;
    if (fields.travel_type !== undefined) leadUpdate.travel_type = String(fields.travel_type);
    if (fields.traveler_origin !== undefined) leadUpdate.traveler_origin = String(fields.traveler_origin);
    if (fields.preferred_airline !== undefined) leadUpdate.preferred_airline = String(fields.preferred_airline);
    if (fields.accommodation_type !== undefined) leadUpdate.accommodation_type = String(fields.accommodation_type);
    if (fields.special_requirements !== undefined) leadUpdate.special_requirements = String(fields.special_requirements);

    if (qualificationCompleted) {
      leadUpdate.status = "qualified";
    } else if (lead.status === "new") {
      leadUpdate.status = "contacted";
    }

    await supabase.from("crm_leads").update(leadUpdate).eq("lead_id", leadId);

    const fieldsStillPending = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].filter(
      (f) => newExtracted[f] === undefined || newExtracted[f] === null,
    );

    await supabase
      .from("crm_ai_qualification_sessions")
      .update({
        fields_extracted: newExtracted,
        fields_pending: fieldsStillPending,
        status: qualificationCompleted ? "completed" : aiResult.should_transfer_to_human ? "abandoned" : "active",
        completed_at: qualificationCompleted ? new Date().toISOString() : null,
      })
      .eq("session_id", session.session_id);

    if (Object.keys(fields).length > 0) {
      await supabase.from("crm_activities").insert({
        lead_id: leadId,
        agent_id: null,
        activity_type: "ai_extraction",
        description: "IA extrajo informacion del viajero",
        metadata: { fields: aiResult.extracted_fields },
      });
    }

    const agentId = lead.assigned_to ?? user.id;
    await supabase.from("chat_messages").insert({
      conversation_id: conversationId,
      sender_id: agentId,
      message_text: aiResult.reply,
    });

    if (aiResult.should_transfer_to_human && !qualificationCompleted) {
      await supabase
        .from("crm_ai_qualification_sessions")
        .update({ status: "abandoned" })
        .eq("session_id", session.session_id);

      if (lead.assigned_to) {
        await supabase.from("notifications").insert({
          user_id: lead.assigned_to,
          type: "new_message",
          title: "Viajero solicita agente humano",
          message: `El viajero del lead "${pkg?.title ?? "N/A"}" solicita hablar con un humano.`,
          metadata: { lead_id: leadId },
        });
      }
    }

    return new Response(
      JSON.stringify({
        reply: aiResult.reply,
        extracted_fields: newExtracted,
        should_transfer_to_human: aiResult.should_transfer_to_human,
        qualification_completed: qualificationCompleted,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Error interno" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
