// ============================================================================
// _shared/stripe/payments.service.ts
// Servicio de pagos (Destination Charges).
//
// Aísla la creación de PaymentIntents y la conversión de unidades monetarias.
// El comprador paga a la PLATAFORMA; la plataforma retiene una comisión
// (application_fee_amount) y el remanente se transfiere automáticamente a la
// cuenta conectada del vendedor (transfer_data.destination).
// ============================================================================

import type { StripeClient } from "./client.ts";
import { mapStripeError, StripeValidationError } from "./errors.ts";

/**
 * Divisa de "cero decimales": el monto ya está en su unidad mínima (sin
 * multiplicar por 100). Cubrimos las más comunes para pagos internacionales.
 * (Lista completa de Stripe: JPY, KRW, VND, CLP, UGX, ...).
 */
const ZERO_DECIMAL_CURRENCIES = new Set([
  "bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga",
  "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf",
]);

/** Parámetros para crear un PaymentIntent (destination charge). */
export interface CreatePaymentIntentParams {
  /** Monto total en UNIDADES principales (ej. 1500.50 MXN, 99.99 USD). */
  amount: number;
  /** Código de divisa ISO 4217 en minúsculas (mxn, usd, eur). */
  currency: string;
  /** ID de la cuenta conectada del vendedor (transfer_data.destination). */
  sellerStripeAccountId: string;
  /** Comisión de la plataforma en unidades principales. */
  applicationFeeAmount: number;
  /** Clave de idempotencia opcional (evita cobros duplicados). */
  idempotencyKey?: string;
  /** Referencias internas (seller_id, order_id) para el webhook. */
  metadata?: Record<string, string>;
}

/** Resultado de la creación del PaymentIntent. */
export interface PaymentIntentResult {
  id: string;
  client_secret: string;
  amount_minor: number;
  currency: string;
  application_fee_minor: number;
}

export class StripePaymentService {
  constructor(private readonly stripe: StripeClient) {}

  /**
   * Crea un PaymentIntent con destination charge.
   *
   * El `client_secret` se devuelve al frontend para que confirme el pago con
   * Stripe.js / Elements. El webhook `payment_intent.succeeded` completa la
   * orden en el backend (fuente de verdad).
   */
  async createDestinationPaymentIntent(
    params: CreatePaymentIntentParams,
  ): Promise<PaymentIntentResult> {
    // 1. Validaciones de dominio (defensa en profundidad; la capa HTTP ya valida).
    if (params.amount <= 0) {
      throw new StripeValidationError("amount debe ser mayor a 0");
    }
    if (params.applicationFeeAmount < 0 || params.applicationFeeAmount >= params.amount) {
      throw new StripeValidationError(
        "application_fee_amount debe ser >= 0 y menor a amount",
      );
    }

    // 2. Conversión a unidad mínima de la divisa.
    const currency = params.currency.toLowerCase();
    const amountMinor = toMinorUnits(params.amount, currency);
    const applicationFeeMinor = toMinorUnits(params.applicationFeeAmount, currency);

    try {
      const paymentIntent = await this.stripe.paymentIntents.create(
        {
          amount: amountMinor,
          currency,
          // Comisión de la plataforma retenida por el marketplace.
          application_fee_amount: applicationFeeMinor,
          // El remanente se transfiere a la cuenta conectada del vendedor.
          transfer_data: {
            destination: params.sellerStripeAccountId,
          },
          // Contexto para el webhook.
          metadata: {
            ...(params.metadata ?? {}),
            seller_stripe_account_id: params.sellerStripeAccountId,
          },
        },
        // Opciones de request: clave de idempotencia si fue provista.
        params.idempotencyKey ? { idempotencyKey: params.idempotencyKey } : undefined,
      );

      return {
        id: paymentIntent.id,
        client_secret: paymentIntent.client_secret ?? "",
        amount_minor: amountMinor,
        currency,
        application_fee_minor: applicationFeeMinor,
      };
    } catch (err) {
      throw mapStripeError(err);
    }
  }
}

/**
 * Convierte un monto en unidades principales a la unidad mínima de la divisa.
 *
 * Ejemplos:
 *   toMinorUnits(1500.50, 'mxn') -> 150050
 *   toMinorUnits(1200,   'jpy')  -> 1200   (divisa de cero decimales)
 */
export function toMinorUnits(amount: number, currency: string): number {
  const c = currency.toLowerCase();
  if (ZERO_DECIMAL_CURRENCIES.has(c)) {
    return Math.round(amount);
  }
  return Math.round(amount * 100);
}

/**
 * Convierte de unidad mínima a unidades principales (para respuestas/UI).
 */
export function toMajorUnits(amountMinor: number, currency: string): number {
  const c = currency.toLowerCase();
  if (ZERO_DECIMAL_CURRENCIES.has(c)) {
    return amountMinor;
  }
  return amountMinor / 100;
}
