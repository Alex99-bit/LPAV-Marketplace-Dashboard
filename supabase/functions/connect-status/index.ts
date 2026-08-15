// ============================================================================
// connect-status
// Consulta el estado de onboarding de una cuenta conectada DIRECTAMENTE desde
// la API de Stripe (no se cachea en BD, según el spec del demo).
//
// Flujo:
//   POST /functions/v1/connect-status
//   Body: { account_id }
//
//   -> Recupera la cuenta con includes:
//        - configuration.recipient  (para saber si puede recibir transferencias)
//        - requirements             (para saber si faltan requisitos)
//   -> Devuelve:
//        - ready_to_receive_payments: bool
//        - requirements_status: 'currently_due' | 'past_due' | ...
//        - onboarding_complete: bool
// ============================================================================

import { getCorsHeaders } from "../_shared/cors.ts";
import { getUser } from "../_shared/auth.ts";
import { getStripeClient } from "../_shared/stripe.ts";

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

  let body: { account_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Body JSON inválido" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!body.account_id) {
    return new Response(JSON.stringify({ error: "account_id es requerido" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let stripe;
  try {
    stripe = getStripeClient();
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // --------------------------------------------------------------------------
  // Recuperar la cuenta incluyendo la configuración del recipient y los
  // requisitos pendientes.
  // --------------------------------------------------------------------------
  const account = await stripe.v2.core.accounts.retrieve(body.account_id, {
    include: ["configuration.recipient", "requirements"],
  });

  // ¿La capability de transferencias ya está activa? => listo para recibir pagos.
  const readyToReceivePayments =
    account?.configuration?.recipient?.capabilities?.stripe_balance
      ?.stripe_transfers?.status === "active";

  // Estado del plazo mínimo de requisitos (currently_due / past_due / ...).
  const requirementsStatus =
    account.requirements?.summary?.minimum_deadline?.status;

  // El onboarding está completo cuando ya no hay requisitos vencidos/pendientes.
  const onboardingComplete =
    requirementsStatus !== "currently_due" && requirementsStatus !== "past_due";

  return new Response(
    JSON.stringify({
      account_id: body.account_id,
      ready_to_receive_payments: readyToReceivePayments,
      requirements_status: requirementsStatus ?? null,
      onboarding_complete: onboardingComplete,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
