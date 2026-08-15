// ============================================================================
// connect-onboard
// Genera un "Account Link" (API V2) para iniciar el onboarding de una cuenta
// conectada. El enlace redirige al usuario al flujo Express de Stripe.
//
// Flujo:
//   POST /functions/v1/connect-onboard
//   Body: { account_id }
//
//   -> Crea el account link (v2.core.accountLinks.create) con use_case
//      'account_onboarding' y la configuración 'recipient'.
//   -> Devuelve { url } para redirigir al usuario.
//
// Las URLs de refresh/return apuntan a la página de demostración, para que el
// usuario retorne a la app una vez termine (o abandone) el onboarding.
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

  // Origen de la app para construir las URLs de retorno/refresh.
  const origin = req.headers.get("origin") || "http://localhost:5173";

  // --------------------------------------------------------------------------
  // Crear el account link con la API V2.
  // `configurations: ['recipient']` indica que solo se recolectarán los
  // requisitos necesarios para recibir transferencias (stripe_balance).
  // --------------------------------------------------------------------------
  const accountLink = await stripe.v2.core.accountLinks.create({
    account: body.account_id,
    use_case: {
      type: "account_onboarding",
      account_onboarding: {
        configurations: ["recipient"],
        refresh_url: `${origin}/connect-demo?onboarding=refresh`,
        return_url: `${origin}/connect-demo?accountId=${body.account_id}`,
      },
    },
  });

  return new Response(JSON.stringify({ url: accountLink.url }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
