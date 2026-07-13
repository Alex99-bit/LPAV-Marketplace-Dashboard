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
  let agentId: string;
  try {
    const body = await req.json();
    leadId = body.lead_id;
    agentId = body.agent_id;
  } catch {
    return new Response(JSON.stringify({ error: "Body JSON invalido" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!leadId || !agentId) {
    return new Response(JSON.stringify({ error: "lead_id y agent_id son requeridos" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createServiceClient();

  try {
    const { data: lead, error: leadError } = await supabase
      .from("crm_leads")
      .select("lead_id, tenant_id, assigned_to")
      .eq("lead_id", leadId)
      .single();

    if (leadError || !lead) {
      return new Response(JSON.stringify({ error: "Lead no encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: agent } = await supabase
      .from("profiles")
      .select("id, tenant_id, full_name")
      .eq("id", agentId)
      .single();

    if (!agent || agent.tenant_id !== lead.tenant_id) {
      return new Response(JSON.stringify({ error: "Agente no valido o no pertenece a la misma agencia" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase
      .from("crm_leads")
      .update({ assigned_to: agentId })
      .eq("lead_id", leadId);

    await supabase.from("crm_activities").insert({
      lead_id: leadId,
      agent_id: user.id,
      activity_type: "assignment",
      description: `Lead asignado a ${agent.full_name ?? "agente"}`,
      metadata: { assigned_by: user.id, assigned_to: agentId },
    });

    return new Response(JSON.stringify({ success: true, lead_id: leadId, assigned_to: agentId }), {
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
