// ============================================================================
// _shared/stripe.ts
// Fábrica del cliente de Stripe compartida por todas las Edge Functions de la
// integración de Stripe Connect (API V2).
//
// Responsabilidades:
//   1. Centralizar la construcción del cliente (una sola fuente de verdad).
//   2. Validar temprano que las claves estén configuradas y devolver un error
//      descriptivo en lugar de un fallo confuso en tiempo de ejecución.
//
// NOTA SOBRE VERSIONADO:
//   El SDK más reciente (stripe-node v22) fija automáticamente la versión de
//   la API de Stripe más reciente soportada (p. ej. 2026-07-29.dahlia), por lo
//   que NO es necesario —ni recomendable— pasar `apiVersion` manualmente.
// ============================================================================

import Stripe from "https://esm.sh/stripe@22?target=deno";

// ----------------------------------------------------------------------------
// getStripeClient
// Devuelve una instancia del cliente de Stripe usando STRIPE_SECRET_KEY.
// Lanza un error claro si la clave no está configurada o sigue con el valor
// placeholder.
// ----------------------------------------------------------------------------
export function getStripeClient() {
  const secretKey = Deno.env.get("STRIPE_SECRET_KEY");

  if (!secretKey || secretKey === "sk_placeholder") {
    throw new Error(
      "STRIPE_SECRET_KEY no está configurada. " +
        "Obtén tu clave en https://dashboard.stripe.com/apikeys y agrégala: " +
        "localmente en .env, o en Supabase con " +
        "`supabase secrets set STRIPE_SECRET_KEY=sk_test_...`",
    );
  }

  return new Stripe(secretKey);
}

// ----------------------------------------------------------------------------
// getWebhookSecret
// Devuelve el secreto de firma de los webhooks (tanto eventos V1 como thin
// events V2 se verifican con el mismo "Signing secret").
// ----------------------------------------------------------------------------
export function getWebhookSecret(): string {
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!secret || secret === "whsec_placeholder") {
    throw new Error(
      "STRIPE_WEBHOOK_SECRET no está configurada. " +
        "Crea un endpoint en https://dashboard.stripe.com/webhooks y copia su " +
        "'Signing secret' (empieza con whsec_...).",
    );
  }

  return secret;
}
