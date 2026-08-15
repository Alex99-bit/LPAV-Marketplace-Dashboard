// ============================================================================
// Controller: POST /functions/v1/seller-login-link
//
// Genera un enlace temporal (LoginLink) al dashboard Express del vendedor,
// para que pueda ver sus saldos o actualizar sus datos bancarios.
//
// Body (JSON):
//   { "account_id": "acct_..." }   // opcional; si se omite usa la del usuario
//
// Respuesta 200:
//   { "url": "https://connect.stripe.com/express/..." }
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

    let accountId = explicitAccountId;
    if (!accountId) {
      const record = await sellerRepo.findByUserId(user.id);
      accountId = record?.stripe_account_id;
    }

    if (!accountId) {
      throw new StripeNotFoundError("El vendedor no tiene una cuenta conectada");
    }

    const url = await accountService.createLoginLink(accountId);

    return ok({ url }, corsHeaders);
  }),
);
