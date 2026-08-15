// ============================================================================
// Controller: POST /functions/v1/stripe-marketplace-webhook
//
// Endpoint de webhooks de Stripe para el marketplace (destination charges).
//
// IMPORTANTE — verificación de firma:
//   - Se lee el cuerpo RAW de la petición (`await req.text()`), NO se parsea
//     a JSON, porque constructEvent exige el payload exacto firmado.
//   - Se valida el header `Stripe-Signature` contra STRIPE_WEBHOOK_SECRET.
//   - Si la firma es inválida se responde 400 (Stripe no reintentará).
//   - Se responde 200 lo antes posible para confirmar la recepción.
//
// Eventos: payment_intent.succeeded / .payment_failed, account.updated,
//          charge.refunded, charge.dispute.created.
// ============================================================================

import { createServiceClient } from "../_shared/auth.ts";
import { getStripeClient, getWebhookSecret } from "../_shared/stripe/client.ts";
import { StripeWebhookService } from "../_shared/stripe/webhook.service.ts";
import { SellerAccountRepository } from "../_shared/repository/seller-accounts.repo.ts";
import { OrderRepository } from "../_shared/repository/orders.repo.ts";
import { StripeServiceError } from "../_shared/stripe/errors.ts";

Deno.serve(async (req: Request) => {
  // Composición de dependencias (DI).
  const stripe = getStripeClient();
  const supabase = createServiceClient();
  const webhookService = new StripeWebhookService({
    stripe,
    sellerAccounts: new SellerAccountRepository(supabase),
    orders: new OrderRepository(supabase),
  });

  // 1. Leer el payload RAW (requisito para verificar la firma).
  const payload = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response(
      JSON.stringify({ error: { code: "invalid_signature", message: "Falta header Stripe-Signature" } }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    // 2. Verificar firma y construir el evento tipado.
    const event = webhookService.constructEvent(payload, signature, getWebhookSecret());

    // 3. Procesar el evento por su tipo (actualiza BD vía repositorios).
    await webhookService.handle(event);

    // 4. Confirmar recepción (2xx detiene los reintentos de Stripe).
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    // Respondemos con esquema estructurado y status adecuado.
    const serviceError =
      err instanceof StripeServiceError
        ? err
        : new StripeServiceError("internal_error", "Error procesando webhook", 500);

    return new Response(JSON.stringify(serviceError.toJSON()), {
      status: serviceError.status,
      headers: { "Content-Type": "application/json" },
    });
  }
});
