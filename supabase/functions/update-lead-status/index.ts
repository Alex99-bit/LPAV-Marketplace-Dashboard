import { getCorsHeaders } from "../_shared/cors.ts";
import { getUser, createServiceClient } from "../_shared/auth.ts";

const VALID_STATUSES = ["new", "contacted", "qualified", "proposal_sent", "won", "lost"];

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
  let status: string;
  try {
    const body = await req.json();
    leadId = body.lead_id;
    status = body.status;
  } catch {
    return new Response(JSON.stringify({ error: "Body JSON invalido" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!leadId || !status) {
    return new Response(JSON.stringify({ error: "lead_id y status son requeridos" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!VALID_STATUSES.includes(status)) {
    return new Response(JSON.stringify({ error: `Status invalido. Valores permitidos: ${VALID_STATUSES.join(", ")}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createServiceClient();

  try {
    const { data: lead, error: leadError } = await supabase
      .from("crm_leads")
      .select("lead_id, tenant_id, status")
      .eq("lead_id", leadId)
      .single();

    if (leadError || !lead) {
      return new Response(JSON.stringify({ error: "Lead no encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase
      .from("crm_leads")
      .update({ status })
      .eq("lead_id", leadId);

    if (status === "won" || status === "lost") {
      const { data: session } = await supabase
        .from("crm_ai_qualification_sessions")
        .select("session_id")
        .eq("lead_id", leadId)
        .eq("status", "active")
        .maybeSingle();

      if (session) {
        await supabase
          .from("crm_ai_qualification_sessions")
          .update({ status: status === "won" ? "completed" : "abandoned", completed_at: new Date().toISOString() })
          .eq("session_id", session.session_id);
      }
    }

    return new Response(JSON.stringify({ success: true, lead_id: leadId, status }), {
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
