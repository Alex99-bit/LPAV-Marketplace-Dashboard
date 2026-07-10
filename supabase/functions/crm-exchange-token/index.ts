import { getCorsHeaders } from "../_shared/cors.ts";
import { getUser } from "../_shared/auth.ts";

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

  const TWENTY_CRM_URL = Deno.env.get("TWENTY_CRM_URL");
  const TWENTY_CRM_SSO_SECRET = Deno.env.get("TWENTY_CRM_SSO_SECRET");

  if (!TWENTY_CRM_URL || !TWENTY_CRM_SSO_SECRET) {
    return new Response(
      JSON.stringify({ error: "Twenty CRM no configurado" }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const body = await req.json().catch(() => null);
  const email = body?.email ?? user.email;

  if (!email) {
    return new Response(
      JSON.stringify({ error: "Email requerido" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const response = await fetch(`${TWENTY_CRM_URL}/auth/sso/exchange`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TWENTY_CRM_SSO_SECRET}`,
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return new Response(
        JSON.stringify({ error: err.messages?.[0] ?? `CRM error: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
