// ============================================================================
// Controller: POST /functions/v1/seller-onboarding-status
//
// Verifica el estado de onboarding del vendedor autenticado (o de una cuenta
// explícita). Consulta Stripe en vivo (fuente de verdad), no la BD.
//
// Body (JSON):
//   { "account_id": "acct_..." }   // opcional; si se omite usa la del usuario
//
// Respuesta 200:
//   {
//     "account_id": "acct_...",
//     "details_submitted": true,
//     "charges_enabled": true,
//     "payouts_enabled": false,
//     "ready": false
//   }
// ============================================================================

import { getUser, createServiceClient } from "../_shared/auth.ts";
import { getStripeClient } from "../_shared/stripe/client.ts";
import { StripeAccountService } from "../_shared/stripe/accounts.service.ts";
import { SellerAccountRepository } from "../_shared/repository/seller-accounts.repo.ts";
import { StripeNotFoundError, StripeUnauthorizedError } from "../_shared/stripe/errors.ts";
import { handle, ok } from "../_shared/http.ts";
import { parseJsonBody, sanitizeString } from "../_shared/validation.ts";

Deno.serve((req: Request) =>
  handle(req, async (corsHeaders) => {
    const user = await getUser(req);
    if (!user) {
      throw new StripeUnauthorizedError();
    }

    const body = await parseJsonBody(req);
    const explicitAccountId = sanitizeString(body["account_id"]) || undefined;

    const stripe = getStripeClient();
    const supabase = createServiceClient();
    const accountService = new StripeAccountService(stripe);
    const sellerRepo = new SellerAccountRepository(supabase);

    // Si no se indica cuenta, resolvemos la del usuario autenticado.
    let accountId = explicitAccountId;
    if (!accountId) {
      const record = await sellerRepo.findByUserId(user.id);
      accountId = record?.stripe_account_id;
    }

    if (!accountId) {
      throw new StripeNotFoundError("El vendedor no tiene una cuenta conectada");
    }

    // Consulta en vivo a Stripe (no cacheamos el estado en este endpoint).
    const status = await accountService.getOnboardingStatus(accountId);

    return ok(status, corsHeaders);
  }),
);
