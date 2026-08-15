// ============================================================================
// _shared/stripe/client.ts
// Fábrica del cliente de Stripe (singleton perezoso).
//
// Es la ÚNICA pieza que conoce la STRIPE_SECRET_KEY. Las capas superiores
// (servicios y controladores) reciben el cliente ya construido mediante
// inyección de dependencias, de modo que el SDK de Stripe queda aislado y es
// trivial reemplazarlo o mockearlo en pruebas.
//
// La STRIPE_SECRET_KEY jamás se expone en el código ni en respuestas HTTP:
// solo se lee desde el entorno (Deno.env).
// ============================================================================

import Stripe from "https://esm.sh/stripe@22?target=deno";
import { StripeConfigurationError } from "./errors.ts";

// Tipo de la instancia del cliente de Stripe (para tipar las dependencias).
export type StripeClient = InstanceType<typeof Stripe>;

// Singleton perezoso: se construye una sola vez por worker de la Edge Function.
let client: StripeClient | null = null;

/**
 * Devuelve la instancia única del cliente de Stripe.
 * Lanza StripeConfigurationError si STRIPE_SECRET_KEY no está configurada.
 */
export function getStripeClient(): StripeClient {
  if (client) return client;

  const secretKey = Deno.env.get("STRIPE_SECRET_KEY");

  if (!secretKey || secretKey.startsWith("sk_placeholder")) {
    throw new StripeConfigurationError(
      "STRIPE_SECRET_KEY no está configurada. " +
        "Obtén tu clave en https://dashboard.stripe.com/apikeys y agrégala al entorno " +
        "(localmente en .env; en producción con `supabase secrets set STRIPE_SECRET_KEY=sk_live_...`).",
    );
  }

  client = new Stripe(secretKey);
  return client;
}

/**
 * Devuelve el secreto de firma de webhooks (usado por constructEvent).
 */
export function getWebhookSecret(): string {
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!secret || secret.startsWith("whsec_placeholder")) {
    throw new StripeConfigurationError(
      "STRIPE_WEBHOOK_SECRET no está configurada. " +
        "Crea un endpoint en https://dashboard.stripe.com/webhooks y copia su 'Signing secret' (whsec_...).",
    );
  }

  return secret;
}
