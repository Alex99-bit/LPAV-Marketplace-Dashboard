import { getCorsHeaders } from "../_shared/cors.ts";
import { getUser, createServiceClient } from "../_shared/auth.ts";

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

  let packageId: string;
  try {
    const body = await req.json();
    packageId = body.package_id;
  } catch {
    return new Response(JSON.stringify({ error: "Body JSON invalido" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!packageId) {
    return new Response(JSON.stringify({ error: "package_id es requerido" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createServiceClient();

  try {
    const { data: pkg, error: pkgError } = await supabase
      .from("travel_packages")
      .select("package_id, tenant_id, title, region, price, currency")
      .eq("package_id", packageId)
      .eq("publication_status", "published")
      .single();

    if (pkgError || !pkg) {
      return new Response(JSON.stringify({ error: "Paquete no encontrado o no disponible" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tenantId = pkg.tenant_id;

    const conversationId = crypto.randomUUID();

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const travelerName = profile?.full_name ?? "Viajero";

    const { data: newLead, error: leadError } = await supabase
      .from("crm_leads")
      .insert({
        tenant_id: tenantId,
        traveler_user_id: user.id,
        package_id: packageId,
        estimated_budget: 0,
        source: "marketplace",
        status: "new",
        conversation_id: conversationId,
      })
      .select("lead_id")
      .single();

    if (leadError || !newLead) {
      return new Response(JSON.stringify({ error: "Error creando lead" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const leadId = newLead.lead_id;

    const { data: assignedAgent } = await supabase.rpc("assign_lead_round_robin", {
      p_tenant_id: tenantId,
      p_lead_id: leadId,
    });

    await supabase.from("crm_activities").insert({
      lead_id: leadId,
      agent_id: null,
      activity_type: "created",
      description: `Lead creado desde marketplace por ${travelerName}`,
      metadata: { traveler_name: travelerName, package_title: pkg.title },
    });

    await supabase.from("crm_ai_qualification_sessions").insert({
      lead_id: leadId,
      conversation_id: conversationId,
      fields_pending: [
        "number_of_travelers",
        "preferred_travel_dates",
        "estimated_budget",
        "travel_type",
        "traveler_origin",
        "preferred_airline",
        "accommodation_type",
      ],
      status: "active",
    });

    const greetingMessage = `Hola ${travelerName}! Soy asesor de viajes y estoy aqui para ayudarte con el paquete "${pkg.title}" (${pkg.region}). Que te gustaria saber?`;

    await supabase.from("chat_messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      message_text: `[SYSTEM] Nuevo lead creado: ${travelerName} esta interesado en "${pkg.title}". Inicia conversacion de cualificacion.`,
    });

    await supabase.from("chat_messages").insert({
      conversation_id: conversationId,
      sender_id: assignedAgent ?? user.id,
      message_text: greetingMessage,
    });

    if (assignedAgent) {
      await supabase.from("notifications").insert({
        user_id: assignedAgent,
        type: "new_message",
        title: "Nuevo lead asignado",
        message: `Se te ha asignado un lead para el paquete "${pkg.title}".`,
        metadata: { lead_id: leadId, package_id: packageId },
      });
    }

    return new Response(
      JSON.stringify({
        lead_id: leadId,
        conversation_id: conversationId,
        assigned_to: assignedAgent,
      }),
      {
        status: 201,
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
