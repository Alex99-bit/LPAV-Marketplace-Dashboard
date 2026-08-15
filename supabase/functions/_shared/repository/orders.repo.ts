// ============================================================================
// _shared/repository/orders.repo.ts
// Repositorio de acceso a datos para la tabla marketplace_orders.
//
// Separa el acceso a la base de datos de la lógica de negocio. El cliente de
// Supabase se inyecta por constructor.
// ============================================================================

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

/** Registro persistido de una orden de marketplace. */
export interface MarketplaceOrderRow {
  id: string;
  stripe_payment_intent_id: string;
  seller_id: string;
  buyer_id: string | null;
  amount_minor: number;
  application_fee_minor: number;
  currency: string;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export class OrderRepository {
  constructor(private readonly db: SupabaseClient) {}

  /** Crea una orden en estado 'pending' al generar el PaymentIntent. */
  async create(input: {
    stripePaymentIntentId: string;
    sellerId: string;
    buyerId?: string | null;
    amountMinor: number;
    applicationFeeMinor: number;
    currency: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const { error } = await this.db.from("marketplace_orders").insert({
      stripe_payment_intent_id: input.stripePaymentIntentId,
      seller_id: input.sellerId,
      buyer_id: input.buyerId ?? null,
      amount_minor: input.amountMinor,
      application_fee_minor: input.applicationFeeMinor,
      currency: input.currency,
      status: "pending",
      metadata: input.metadata ?? {},
    });

    if (error) throw new Error(`[orders.repo] ${error.message}`);
  }

  /** Busca una orden por su PaymentIntent de Stripe. */
  async findByPaymentIntent(
    stripePaymentIntentId: string,
  ): Promise<MarketplaceOrderRow | null> {
    const { data, error } = await this.db
      .from("marketplace_orders")
      .select("*")
      .eq("stripe_payment_intent_id", stripePaymentIntentId)
      .maybeSingle();

    if (error) throw new Error(`[orders.repo] ${error.message}`);
    return (data as MarketplaceOrderRow) ?? null;
  }

  /** Actualiza el estado de la orden (usado por el webhook). */
  async updateStatusByPaymentIntent(
    stripePaymentIntentId: string,
    status: string,
    extra?: Record<string, unknown>,
  ): Promise<void> {
    const { error } = await this.db
      .from("marketplace_orders")
      .update({
        status,
        updated_at: new Date().toISOString(),
        ...(extra ?? {}),
      })
      .eq("stripe_payment_intent_id", stripePaymentIntentId);

    if (error) throw new Error(`[orders.repo] ${error.message}`);
  }
}
