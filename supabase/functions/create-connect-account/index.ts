// ============================================================================
// create-connect-account
// Crea una cuenta Express de Stripe (API V2) para la agencia y genera el
// enlace de onboarding (account link V2).
//
// NOTA: Stripe deshabilitó la creación de cuentas vía Accounts V1
// (stripe.accounts.create con type: 'express'), por lo que usamos la API V2:
//   - v2.core.accounts.create  (dashboard: 'express', configuración recipient)
//   - v2.core.accountLinks.create (use_case account_onboarding)
//
// La capability `stripe_balance.stripe_transfers` habilita a la agencia para
// recibir transferencias (destination charges). No requiere card_payments:
// el cobro lo procesa la PLATAFORMA.
// ============================================================================

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

  const stripe = getStripeClient();
  const origin = req.headers.get("origin") ?? "http://localhost:5173";

  const refreshUrl = `${origin}/agency/settings?stripe=refresh`;
  const returnUrl = `${origin}/agency/settings?stripe=return`;

  // Si la agencia ya tiene cuenta, solo regeneramos el enlace de onboarding.
  if (tenant.stripe_account_id) {
    const accountLink = await stripe.v2.core.accountLinks.create({
      account: tenant.stripe_account_id,
      use_case: {
        type: "account_onboarding",
        account_onboarding: {
          configurations: ["recipient"],
          refresh_url: refreshUrl,
          return_url: returnUrl,
        },
      },
    });
    return new Response(JSON.stringify({ url: accountLink.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Crear cuenta Express (V2). La plataforma recauda comisiones y asume pérdidas.
  const account = await stripe.v2.core.accounts.create({
    display_name: tenant.business_name ?? "Agencia",
    contact_email: user.email ?? "",
    identity: { country: "mx" },
    dashboard: "express",
    defaults: {
      responsibilities: {
        fees_collector: "application",
        losses_collector: "application",
      },
    },
    configuration: {
      recipient: {
        capabilities: {
          stripe_balance: {
            stripe_transfers: { requested: true },
          },
        },
      },
    },
  });

  // Guardar el mapeo agencia -> cuenta Stripe.
  await supabase
    .from("agencies_tenants")
    .update({ stripe_account_id: account.id })
    .eq("tenant_id", tenant.tenant_id);

  await supabase
    .from("stripe_accounts")
    .upsert(
      {
        stripe_account_id: account.id,
        tenant_id: tenant.tenant_id,
        account_type: "express",
        onboarding_status: "pending",
      },
      { onConflict: "tenant_id" },
    );

  const accountLink = await stripe.v2.core.accountLinks.create({
    account: account.id,
    use_case: {
      type: "account_onboarding",
      account_onboarding: {
        configurations: ["recipient"],
        refresh_url: refreshUrl,
        return_url: returnUrl,
      },
    },
  });

  return new Response(JSON.stringify({ url: accountLink.url, account_id: account.id }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
