// ============================================================================
// Controller: POST /functions/v1/create-payment-intent
//
// Crea un PaymentIntent de destination charge: el comprador paga a la
// plataforma, se retiene la comisión (application_fee_amount) y el remanente
// se transfiere automáticamente a la cuenta conectada del vendedor.
//
// Body (JSON):
//   {
//     "amount": 1500.50,                 // requerido, en unidades principales
//     "currency": "mxn",                 // requerido, ISO 4217
//     "seller_id": "<uuid>",             // requerido, vendedor de la plataforma
//     "application_fee_amount": 90.03,   // requerido, comisión del marketplace
//     "idempotency_key": "clave-unica"   // opcional, evita cobros duplicados
//   }
//
// Respuesta 201:
//   {
//     "id": "pi_...",
//     "client_secret": "pi_..._secret_...",
//     "amount_minor": 150050,
//     "currency": "mxn",
//     "application_fee_minor": 9003
//   }
//
// El frontend usa `client_secret` para confirmar el pago con Stripe.js.
// La orden se crea en estado 'pending'; el webhook la confirma.
// ============================================================================

import { getUser, createServiceClient } from "../_shared/auth.ts";
import { getStripeClient } from "../_shared/stripe/client.ts";
import { StripePaymentService } from "../_shared/stripe/payments.service.ts";
import { SellerAccountRepository } from "../_shared/repository/seller-accounts.repo.ts";
import { OrderRepository } from "../_shared/repository/orders.repo.ts";
import { StripeNotFoundError, StripeUnauthorizedError } from "../_shared/stripe/errors.ts";
import { created, handle } from "../_shared/http.ts";
import {
  parseJsonBody,
  requireAmount,
  requireCurrency,
  requireNonNegativeAmount,
  requireUuid,
  optionalIdempotencyKey,
} from "../_shared/validation.ts";

Deno.serve((req: Request) =>
  handle(req, async (corsHeaders) => {
    // 1. Autenticación del comprador.
    const buyer = await getUser(req);
    if (!buyer) {
      throw new StripeUnauthorizedError();
    }

    // 2. Validación y saneamiento de inputs (defensa en profundidad).
    const body = await parseJsonBody(req);

    const amount = requireAmount(body, "amount");
    const currency = requireCurrency(body);
    const sellerId = requireUuid(body, "seller_id");
    const applicationFeeAmount = requireNonNegativeAmount(body, "application_fee_amount");
    const idempotencyKey = optionalIdempotencyKey(body);

    // 3. Composición de dependencias (DI).
    const stripe = getStripeClient();
    const supabase = createServiceClient();
    const paymentService = new StripePaymentService(stripe);
    const sellerRepo = new SellerAccountRepository(supabase);
    const orderRepo = new OrderRepository(supabase);

    // 4. Resolver la cuenta conectada del vendedor.
    const seller = await sellerRepo.findByUserId(sellerId);
    if (!seller?.stripe_account_id) {
      throw new StripeNotFoundError("El vendedor no tiene una cuenta Stripe conectada");
    }

    // 5. Crear el PaymentIntent (destination charge).
    const intent = await paymentService.createDestinationPaymentIntent({
      amount,
      currency,
      sellerStripeAccountId: seller.stripe_account_id,
      applicationFeeAmount,
      idempotencyKey,
      metadata: {
        seller_id: sellerId,
        buyer_id: buyer.id,
      },
    });

    // 6. Registrar la orden en estado 'pending' para que el webhook la actualice.
    await orderRepo.create({
      stripePaymentIntentId: intent.id,
      sellerId,
      buyerId: buyer.id,
      amountMinor: intent.amount_minor,
      applicationFeeMinor: intent.application_fee_minor,
      currency,
      metadata: {
        seller_id: sellerId,
        buyer_id: buyer.id,
        ...(idempotencyKey ? { idempotency_key: idempotencyKey } : {}),
      },
    });

    return created(intent, corsHeaders);
  }),
);
