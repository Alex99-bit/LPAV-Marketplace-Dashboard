// ============================================================================
// _shared/stripe/accounts.service.ts
// Servicio de Cuentas Express de Stripe (onboarding del vendedor).
//
// Aísla TODAS las llamadas a la API de cuentas de Stripe. Los controladores
// solo orquestan; jamás tocan `stripe.accounts.*` directamente.
//
// Flujo de onboarding (Cuenta Express, la plataforma crea y gestiona la cuenta):
//   1. createExpressAccount()  -> crea la cuenta conectada.
//   2. createAccountLink()     -> devuelve la URL de onboarding Express.
//   3. getOnboardingStatus()   -> consulta detalles_submitted / payouts_enabled.
//   4. createLoginLink()       -> URL temporal al dashboard Express.
// ============================================================================

import type { StripeClient } from "./client.ts";
import { mapStripeError, StripeValidationError } from "./errors.ts";

/** Parámetros para crear una cuenta Express. */
export interface CreateExpressAccountParams {
  /** Email del vendedor (queda como contacto de la cuenta). */
  email: string;
  /** Nombre del negocio (visible en el dashboard Express). */
  businessName?: string;
  /** Código de país ISO 3166-1 alfa-2 (por defecto 'mx'). */
  country?: string;
  /** URL pública del negocio (opcional). */
  businessUrl?: string;
}

/** Estado consolidado de onboarding de una cuenta. */
export interface OnboardingStatus {
  account_id: string;
  details_submitted: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  /** true si el vendedor ya puede recibir pagos (cobros + retiros). */
  ready: boolean;
}

export class StripeAccountService {
  // Inyección de dependencias: el cliente llega por constructor.
  constructor(private readonly stripe: StripeClient) {}

  /**
   * Crea una cuenta Express.
   *
   * IMPORTANTE (Destination Charges):
   *   - `type: 'express'` => cuenta Express gestionada por la plataforma.
   *   - Se solicitan las capabilities `card_payments` y `transfers` para poder
   *     cobrar a los compradores y recibir transferencias desde la plataforma.
   */
  async createExpressAccount(
    params: CreateExpressAccountParams,
  ): Promise<string> {
    try {
      const account = await this.stripe.accounts.create({
        type: "express",
        country: (params.country ?? "mx").toUpperCase(),
        email: params.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: params.businessName
          ? {
              name: params.businessName,
              ...(params.businessUrl ? { url: params.businessUrl } : {}),
            }
          : undefined,
      });

      return account.id;
    } catch (err) {
      throw mapStripeError(err);
    }
  }

  /**
   * Genera un enlace de onboarding Express (Account Link).
   *
   * - refresh_url: a dónde volver si el vendedor abandona a mitad de camino.
   * - return_url:  a dónde volver al terminar (o abandonar) el onboarding.
   */
  async createAccountLink(
    accountId: string,
    opts: { refreshUrl: string; returnUrl: string },
  ): Promise<string> {
    try {
      const link = await this.stripe.accountLinks.create({
        account: accountId,
        refresh_url: opts.refreshUrl,
        return_url: opts.returnUrl,
        type: "account_onboarding",
      });

      return link.url;
    } catch (err) {
      throw mapStripeError(err);
    }
  }

  /**
   * Consulta el estado de onboarding de una cuenta.
   * Devuelve un objeto plano (no el objeto Stripe) para desacoplar la capa HTTP.
   */
  async getOnboardingStatus(accountId: string): Promise<OnboardingStatus> {
    try {
      const account = await this.stripe.accounts.retrieve(accountId);

      const detailsSubmitted = account.details_submitted ?? false;
      const chargesEnabled = account.charges_enabled ?? false;
      const payoutsEnabled = account.payouts_enabled ?? false;

      return {
        account_id: account.id,
        details_submitted: detailsSubmitted,
        charges_enabled: chargesEnabled,
        payouts_enabled: payoutsEnabled,
        ready: detailsSubmitted && chargesEnabled && payoutsEnabled,
      };
    } catch (err) {
      throw mapStripeError(err);
    }
  }

  /**
   * Genera un enlace temporal al dashboard Express del vendedor.
   * Útil para que el vendedor vea saldos, pagos o actualice datos bancarios.
   */
  async createLoginLink(accountId: string): Promise<string> {
    try {
      const link = await this.stripe.accounts.createLoginLink(accountId);
      return link.url;
    } catch (err) {
      throw mapStripeError(err);
    }
  }
}

/** Valida el país antes de crear la cuenta (evita llamadas fallidas a Stripe). */
export function assertValidCountry(country: string): void {
  if (!/^[A-Za-z]{2}$/.test(country)) {
    throw new StripeValidationError(
      "country debe ser un código ISO 3166-1 alfa-2 (ej. 'mx', 'us')",
      { country },
    );
  }
}
