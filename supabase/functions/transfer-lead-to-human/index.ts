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

  let leadId: string;
  let conversationId: string;
  try {
    const body = await req.json();
    leadId = body.lead_id;
    conversationId = body.conversation_id;
  } catch {
    return new Response(JSON.stringify({ error: "Body JSON invalido" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!leadId || !conversationId) {
    return new Response(JSON.stringify({ error: "lead_id y conversation_id son requeridos" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createServiceClient();

  try {
    const { data: lead, error: leadError } = await supabase
      .from("crm_leads")
      .select("lead_id, tenant_id, assigned_to, status")
      .eq("lead_id", leadId)
      .single();

    if (leadError || !lead) {
      return new Response(JSON.stringify({ error: "Lead no encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase
      .from("crm_ai_qualification_sessions")
      .update({ status: "abandoned", completed_at: new Date().toISOString() })
      .eq("lead_id", leadId)
      .eq("status", "active");

    if (lead.status === "new") {
      await supabase
        .from("crm_leads")
        .update({ status: "contacted" })
        .eq("lead_id", leadId);
    }

    const { data: agent } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const agentName = agent?.full_name ?? "Agente";

    await supabase.from("chat_messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      message_text: `[SYSTEM] ${agentName} ha tomado el control de la conversacion.`,
    });

    await supabase.from("crm_activities").insert({
      lead_id: leadId,
      agent_id: user.id,
      activity_type: "note",
      description: `${agentName} tomo control del chat manualmente`,
      metadata: { transfer_type: "manual_takeover" },
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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
