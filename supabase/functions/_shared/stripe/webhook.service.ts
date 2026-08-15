// ============================================================================
// _shared/stripe/webhook.service.ts
// Servicio de webhooks de Stripe.
//
// Responsabilidades:
//   1. Verificar la firma del webhook con constructEvent (payload raw).
//   2. Enrutar los eventos clave a sus manejadores, actualizando la BD a
//      través de la capa de repositorios.
//
// Eventos manejados:
//   - payment_intent.succeeded   -> marca la orden como 'paid'.
//   - payment_intent.payment_failed -> marca la orden como 'failed' (+notif).
//   - account.updated            -> sincroniza payouts_enabled / charges_enabled.
//   - charge.refunded            -> base para devoluciones.
//   - charge.dispute.created     -> base para disputas.
// ============================================================================

import type Stripe from "https://esm.sh/stripe@22?target=deno";
import type { StripeClient } from "./client.ts";
import { mapStripeError } from "./errors.ts";
import type { SellerAccountRepository } from "../repository/seller-accounts.repo.ts";
import type { OrderRepository } from "../repository/orders.repo.ts";

/** Dependencias inyectadas en el servicio de webhooks. */
export interface WebhookDependencies {
  stripe: StripeClient;
  sellerAccounts: SellerAccountRepository;
  orders: OrderRepository;
}

export class StripeWebhookService {
  constructor(private readonly deps: WebhookDependencies) {}

  /**
   * Verifica la firma y construye el evento tipado.
   * Lanza StripeServiceError (400) si la firma es inválida.
   */
  constructEvent(payload: string, signature: string, secret: string): Stripe.Event {
    try {
      return this.deps.stripe.webhooks.constructEvent(payload, signature, secret);
    } catch (err) {
      throw mapStripeError(err);
    }
  }

  /** Enruta un evento ya verificado a su manejador correspondiente. */
  async handle(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case "payment_intent.succeeded":
        await this.handlePaymentSucceeded(
          event.data.object as Stripe.PaymentIntent,
        );
        break;

      case "payment_intent.payment_failed":
        await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case "account.updated":
        await this.handleAccountUpdated(event.data.object as Stripe.Account);
        break;

      case "charge.refunded":
        await this.handleRefunded(event.data.object as Stripe.Charge);
        break;

      case "charge.dispute.created":
        await this.handleDisputeCreated(event.data.object as Stripe.Dispute);
        break;

      default:
        // Eventos no relevantes para el marketplace: los ignoramos de forma
        // explícita (y logueamos en desarrollo) para no romper la entrega 200.
        console.log(`[webhook] evento ignorado: ${event.type}`);
    }
  }

  // --------------------------------------------------------------------------
  // payment_intent.succeeded
  // --------------------------------------------------------------------------
  private async handlePaymentSucceeded(pi: Stripe.PaymentIntent): Promise<void> {
    // Actualizamos la orden a 'paid' (fuente de verdad del backend).
    await this.deps.orders.updateStatusByPaymentIntent(pi.id, "paid", {
      metadata: { payment_method: pi.payment_method ?? null },
    });
  }

  // --------------------------------------------------------------------------
  // payment_intent.payment_failed
  // --------------------------------------------------------------------------
  private async handlePaymentFailed(pi: Stripe.PaymentIntent): Promise<void> {
    const reason = (pi.last_payment_error as { code?: string; message?: string } | null)
      ?.code ?? "unknown";

    await this.deps.orders.updateStatusByPaymentIntent(pi.id, "failed", {
      metadata: { failure_reason: reason },
    });

    // Aquí iría la notificación al comprador/vendedor (email, push, in-app).
    console.log(`[webhook] pago fallido ${pi.id} razón: ${reason}`);
  }

  // --------------------------------------------------------------------------
  // account.updated
  // Sincroniza el estado de verificación KYC / retiros del vendedor.
  // --------------------------------------------------------------------------
  private async handleAccountUpdated(account: Stripe.Account): Promise<void> {
    const detailsSubmitted = account.details_submitted ?? false;
    const chargesEnabled = account.charges_enabled ?? false;
    const payoutsEnabled = account.payouts_enabled ?? false;

    const status = payoutsEnabled && chargesEnabled
      ? "active"
      : detailsSubmitted
      ? "restricted"
      : "pending";

    await this.deps.sellerAccounts.updateOnboardingState(account.id, {
      details_submitted: detailsSubmitted,
      charges_enabled: chargesEnabled,
      payouts_enabled: payoutsEnabled,
      onboarding_status: status,
    });
  }

  // --------------------------------------------------------------------------
  // charge.refunded — estructura base para devoluciones.
  // --------------------------------------------------------------------------
  private async handleRefunded(charge: Stripe.Charge): Promise<void> {
    if (charge.payment_intent) {
      await this.deps.orders.updateStatusByPaymentIntent(
        charge.payment_intent as string,
        "refunded",
      );
    }
  }

  // --------------------------------------------------------------------------
  // charge.dispute.created — estructura base para disputas.
  // --------------------------------------------------------------------------
  private async handleDisputeCreated(dispute: Stripe.Dispute): Promise<void> {
    if (dispute.payment_intent) {
      await this.deps.orders.updateStatusByPaymentIntent(
        dispute.payment_intent as string,
        "disputed",
        { metadata: { dispute_id: dispute.id } },
      );
    }
  }
}
