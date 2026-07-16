import Stripe from "https://esm.sh/stripe@17?target=deno";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getUser, createServiceClient } from "../_shared/auth.ts";

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
    .select("tenant_id, role_name")
    .eq("id", user.id)
    .single();

  if (!profile?.tenant_id || profile.role_name !== "Agency_Admin") {
    return new Response(JSON.stringify({ error: "Solo administradores" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: tenant } = await supabase
    .from("agencies_tenants")
    .select("*")
    .eq("tenant_id", profile.tenant_id)
    .single();

  if (!tenant) {
    return new Response(JSON.stringify({ error: "Tenant no encontrado" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-04-30.basil" });

  if (tenant.stripe_account_id) {
    const accountLink = await stripe.accountLinks.create({
      account: tenant.stripe_account_id,
      refresh_url: `${req.headers.get("origin")}/agency/settings?stripe=refresh`,
      return_url: `${req.headers.get("origin")}/agency/settings?stripe=return`,
      type: "account_onboarding",
    });
    return new Response(JSON.stringify({ url: accountLink.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const account = await stripe.accounts.create({
    type: "express",
    country: "MX",
    email: user.email,
    capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
    business_profile: { name: tenant.business_name, url: (tenant as unknown as { website_url?: string }).website_url || undefined },
  });

  await supabase
    .from("agencies_tenants")
    .update({ stripe_account_id: account.id })
    .eq("tenant_id", tenant.tenant_id);

  await supabase.from("stripe_accounts").insert({
    stripe_account_id: account.id,
    tenant_id: tenant.tenant_id,
    onboarding_status: "pending",
  });

  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${req.headers.get("origin")}/agency/settings?stripe=refresh`,
    return_url: `${req.headers.get("origin")}/agency/settings?stripe=return`,
    type: "account_onboarding",
  });

  return new Response(JSON.stringify({ url: accountLink.url, account_id: account.id }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
