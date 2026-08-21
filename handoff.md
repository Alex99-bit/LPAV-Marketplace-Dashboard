# AGENT HANDOFF PROTOCOL

## 1. META & ROUTING
- **Source Agent:** opencode (Asistente de Ingeniería — Stack Completo)
- **Target Agent:** Agente de Backend / Integración Stripe Connect
- **Timestamp:** 2026-08-20T00:00:00Z
- **Priority Level:** High
- **Reason for Handoff:** Completar la migración del SDK de Stripe (eliminar `apiVersion: "2025-04-30.basil"` deprecado en 5 Edge Functions restantes) y validar el flujo de checkout con destination charge de punta a punta en entorno local antes de producción.

## 2. USER PROFILE & CONTEXT
- **User ID/Name:** Alex (proyecto "LPAV Marketplace" — plataforma de agencias de viaje)
- **Language / Tone:** Español / Práctico, enfocado en "que funcione" (casi lanzando a producción)
- **Key Constraints:**
  - NO tocar el proyecto Supabase remoto `qmcpaqbxbmkhxjezhlch` (es compartido/producción).
  - Probar todo en entorno local (Docker + `supabase start` + `pnpm dev`).
  - NO usar `supabase stop --no-backup` (borra la data local).
  - Cuentas Express de Stripe: el TOS solo se acepta en el flujo alojado (no programáticamente).

## 3. EXECUTIVE CONVERSATION SUMMARY
- **Primary Goal:** Tener listo el marketplace local para probar como cualquier rol (viajero, agencia, superadmin) con Stripe Connect (destination charges), previo a producción.
- **Key Insights & Progress:**
  - Entorno local 100% funcional: Supabase local (`http://127.0.0.1:54321`), Vite (`http://localhost:5173`), Stripe CLI listener reenviando a `stripe-webhook`.
  - Corregido: migración duplicada `20260805000000`, GRANTs de Data API (`20260815000000`), CSP (`connect-src` local), `stripe_accounts` `.single()`→`.maybeSingle()`, UI de notificaciones (align + ancho + sin scroll/truncate).
  - Corregido `create-connect-account` (V1→V2 accounts) y `transactions_orders` 400 (columna `package_id` + FK + seed + webhook).
  - Creado `scripts/simulate-connected-account.ts` y corregido `create-checkout` (se eliminó `{ stripeAccount }` para destination charge; usa `getStripeClient()` de `_shared/stripe/client.ts` — stripe@22; try/catch con mensaje claro). Verificado: `create-checkout` responde 400 limpio con "La agencia aún no completó su onboarding de Stripe".
- **Unresolved Issues / Blockers:**
  - 5 Edge Functions aún usan `import Stripe from "https://esm.sh/stripe@17"` + `apiVersion: "2025-04-30.basil"`: `create-chat-payment`, `stripe-webhook`, `get-agency-transfers`, `manage-subscription` (dormant/410), `installment-reminder`.
  - `installment-reminder` además usa `{ stripeAccount }` (cargo directo) — requiere capability `card_payments`, pero la cuenta V2 solo pide `stripe_transfers` (recipient). Es un problema de negocio/consistencia por decidir, NO corregir unilateralmente.
  - La cuenta conectada de `agencia1` (`acct_1U60qu0FcayoHdbn`) aún NO completó onboarding (stripe_transfers `restricted`) — el usuario debe abrir el account link y aceptar TOS con "datos de prueba".

## 4. EXTRACTED DATA PAYLOAD
```json
{
  "key_variables": {
    "supabase_local_url": "http://127.0.0.1:54321",
    "frontend_url": "http://localhost:5173",
    "stripe_api_version_direct": "2026-07-29.dahlia",
    "stripe_sdk_pin": "stripe@22 (sin apiVersion explícito)",
    "stripe_account_agencia1": "acct_1U60qu0FcayoHdbn",
    "test_password": "Test1234!",
    "agency_admin_emails": "agencia1@viajes.com, agencia2@tours.com",
    "superadmin_email": "admin@lpav.com",
    "traveler_emails": "viajero1@test.com, viajero2@test.com, viajero3@test.com",
    "functions_with_deprecated_apiVersion": ["create-chat-payment", "stripe-webhook", "get-agency-transfers", "manage-subscription", "installment-reminder"],
    "shared_stripe_client_path": "supabase/functions/_shared/stripe/client.ts",
    "simulate_script": "scripts/simulate-connected-account.ts"
  },
  "validated_inputs": [
    "destination charge correcto = session en cuenta PLATAFORMA + payment_intent_data.transfer_data.destination + application_fee_amount",
    "para cobrar (destination charge) solo se requiere capability stripe_transfers; cuenta bancaria solo para retiros"
  ]
}
```

## 5. NEXT AGENT INSTRUCTIONS
**Immediate Action Required:**
1. Migrar las 5 funciones restantes a `getStripeClient()` (stripe@22) eliminando `apiVersion: "2025-04-30.basil"`. En `stripe-webhook` conservar el import de tipos (`import type Stripe ...`) porque usa `Stripe.Event`, `Stripe.Checkout.Session`, etc.
2. Reiniciar el edge runtime (`docker restart supabase_edge_runtime_LPAV-Marketplace-Dashboard`) y verificar que compilan sin errores.
3. Reportar el estado del checkout: el usuario debe completar el onboarding de `agencia1` abriendo el account link generado por `node scripts/simulate-connected-account.ts agencia1@viajes.com` y usando "Rellenar con datos de prueba".

**Pending Questions for User:**
- ¿Quieres que `installment-reminder` (abonos) se mantenga como cargo directo (requiere habilitar `card_payments` en la cuenta) o se migre también a destination charge?

**Guardrails / Do NOTs:**
- NO ejecutar `supabase stop --no-backup`.
- NO desplegar/empujar migraciones ni secretos al proyecto remoto `qmcpaqbxbmkhxjezhlch`.
- NO intentar aceptar el TOS de cuentas Express programáticamente (Stripe lo rechaza: `tos_acceptance_on_behalf_not_allowed`).
- NO reintroducir `{ stripeAccount }` junto a `transfer_data.destination` en `create-checkout`.
```
