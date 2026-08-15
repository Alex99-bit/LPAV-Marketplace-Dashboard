// ============================================================================
// Controller: POST /functions/v1/onboard-seller
//
// Inicia el onboarding del vendedor (Cuenta Express + Account Link).
//
// Body (JSON):
//   {
//     "business_name": "Agencia Viajes MX",   // opcional, nombre del negocio
//     "country": "mx",                        // opcional, ISO 3166-1 alfa-2
//     "return_url": "https://app.com/done",   // opcional, URL de retorno
//     "refresh_url": "https://app.com/retry"  // opcional, URL de refresh
//   }
//
// Respuesta 200:
//   { "account_id": "acct_...", "url": "https://connect.stripe.com/..." }
//
// Si el vendedor ya tiene cuenta, devuelve la misma cuenta con un enlace nuevo.
// ============================================================================

import { getUser, createServiceClient } from "../_shared/auth.ts";
import { getStripeClient } from "../_shared/stripe/client.ts";
import { StripeAccountService, assertValidCountry } from "../_shared/stripe/accounts.service.ts";
import { SellerAccountRepository } from "../_shared/repository/seller-accounts.repo.ts";
import { StripeUnauthorizedError, StripeValidationError } from "../_shared/stripe/errors.ts";
import { handle, ok } from "../_shared/http.ts";
import { parseJsonBody, sanitizeString } from "../_shared/validation.ts";

Deno.serve((req: Request) =>
  handle(req, async (corsHeaders) => {
    // 1. Autenticación: solo usuarios registrados pueden ser vendedores.
    const user = await getUser(req);
    if (!user) {
      throw new StripeUnauthorizedError();
    }

    const body = await parseJsonBody(req);

    // 2. Validación / saneamiento de inputs.
    const businessName = sanitizeString(body["business_name"]) || undefined;
    const country = (sanitizeString(body["country"]) || "mx").toLowerCase();
    assertValidCountry(country);

    const email = user.email ?? "";
    if (!email) {
      throw new StripeValidationError("El usuario no tiene email asociado");
    }

    // URLs de retorno del onboarding (defaults a la raíz de la app).
    const origin = req.headers.get("origin") ?? "http://localhost:5173";
    const returnUrl = sanitizeString(body["return_url"]) || `${origin}/sellers/onboarding`;
    const refreshUrl = sanitizeString(body["refresh_url"]) || `${origin}/sellers/onboarding`;

    // 3. Composición de dependencias (DI).
    const stripe = getStripeClient();
    const supabase = createServiceClient();
    const accountService = new StripeAccountService(stripe);
    const sellerRepo = new SellerAccountRepository(supabase);

    // 4. Si el vendedor ya tiene cuenta, solo regeneramos el enlace.
    const existing = await sellerRepo.findByUserId(user.id);
    let accountId = existing?.stripe_account_id;

    if (!accountId) {
      accountId = await accountService.createExpressAccount({
        email,
        businessName,
        country,
      });

      await sellerRepo.create({
        userId: user.id,
        stripeAccountId: accountId,
        country,
      });
    }

    // 5. Generar el enlace de onboarding Express.
    const url = await accountService.createAccountLink(accountId, {
      refreshUrl,
      returnUrl,
    });

    return ok({ account_id: accountId, url }, corsHeaders);
  }),
);
