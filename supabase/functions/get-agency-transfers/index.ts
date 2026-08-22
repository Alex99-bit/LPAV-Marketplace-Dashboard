import { getCorsHeaders } from "../_shared/cors.ts";
import { getUser, createServiceClient } from "../_shared/auth.ts";
import { getStripeClient } from "../_shared/stripe/client.ts";

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const user = await getUser(req);
  if (!user) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createServiceClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile?.tenant_id) {
    return new Response(JSON.stringify({ error: "Solo agencias pueden ver transferencias" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: tenant } = await supabase
    .from("agencies_tenants")
    .select("stripe_account_id")
    .eq("tenant_id", profile.tenant_id)
    .single();

  if (!tenant?.stripe_account_id) {
    return new Response(JSON.stringify({ transfers: [], has_more: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripe = getStripeClient();

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "10"), 50);

  try {
    const transfers = await stripe.transfers.list({
      destination: tenant.stripe_account_id,
      limit,
    });

    const result = transfers.data.map((t) => ({
      id: t.id,
      amount: t.amount / 100,
      currency: t.currency.toUpperCase(),
      created: new Date(t.created * 1000).toISOString(),
      destination_payment: (t as unknown as { destination_payment?: string }).destination_payment || "",
    }));

    return new Response(JSON.stringify({
      transfers: result,
      has_more: transfers.has_more,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Error consultando transferencias", transfers: [], has_more: false }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
