// ============================================================================
// _shared/repository/seller-accounts.repo.ts
// Repositorio de acceso a datos para la tabla seller_stripe_accounts.
//
// Separa el acceso a la base de datos (Supabase/Postgres) de la lógica de
// negocio. El cliente de Supabase se inyecta por constructor.
// ============================================================================

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

/** Registro persistido de la relación vendedor -> cuenta Stripe. */
export interface SellerStripeAccountRow {
  id: string;
  user_id: string;
  stripe_account_id: string;
  details_submitted: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  onboarding_status: string;
  country: string;
  created_at: string;
  updated_at: string;
}

export class SellerAccountRepository {
  constructor(private readonly db: SupabaseClient) {}

  /** Busca la cuenta Stripe asociada a un usuario vendedor. */
  async findByUserId(userId: string): Promise<SellerStripeAccountRow | null> {
    const { data, error } = await this.db
      .from("seller_stripe_accounts")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw new Error(`[seller-accounts.repo] ${error.message}`);
    return (data as SellerStripeAccountRow) ?? null;
  }

  /** Busca la cuenta Stripe por su stripe_account_id. */
  async findByStripeAccountId(
    stripeAccountId: string,
  ): Promise<SellerStripeAccountRow | null> {
    const { data, error } = await this.db
      .from("seller_stripe_accounts")
      .select("*")
      .eq("stripe_account_id", stripeAccountId)
      .maybeSingle();

    if (error) throw new Error(`[seller-accounts.repo] ${error.message}`);
    return (data as SellerStripeAccountRow) ?? null;
  }

  /** Crea la relación vendedor -> cuenta Stripe. */
  async create(input: {
    userId: string;
    stripeAccountId: string;
    country: string;
  }): Promise<void> {
    const { error } = await this.db.from("seller_stripe_accounts").insert({
      user_id: input.userId,
      stripe_account_id: input.stripeAccountId,
      country: input.country,
      onboarding_status: "pending",
    });

    if (error) throw new Error(`[seller-accounts.repo] ${error.message}`);
  }

  /**
   * Actualiza el estado de onboarding/verificación a partir de un evento
   * account.updated de Stripe.
   */
  async updateOnboardingState(
    stripeAccountId: string,
    state: {
      details_submitted: boolean;
      charges_enabled: boolean;
      payouts_enabled: boolean;
      onboarding_status: string;
    },
  ): Promise<void> {
    const { error } = await this.db
      .from("seller_stripe_accounts")
      .update({
        details_submitted: state.details_submitted,
        charges_enabled: state.charges_enabled,
        payouts_enabled: state.payouts_enabled,
        onboarding_status: state.onboarding_status,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_account_id", stripeAccountId);

    if (error) throw new Error(`[seller-accounts.repo] ${error.message}`);
  }
}
