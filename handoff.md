# HANDOFF — LPAV Marketplace Dashboard

## Contexto del Proyecto

**LPAV Marketplace Dashboard** es una plataforma SaaS multi-tenant para agencias de viajes mexicanas. Conecta viajeros con agencias, con CRM integrado, chat en tiempo real, pagos vía Stripe Connect, facturación CFDI (México), y un sistema de 4 planes de suscripción.

**Stack:** React 19, TypeScript 5.8, Tailwind CSS 4, Vite 6, Supabase (PostgreSQL 17, Auth, Realtime, Storage, Edge Functions/Deno), Stripe Connect + Billing, Gemini 2.5 Flash (IA), Facturama (CFDI), Vitest (tests unit), Playwright (tests E2E).

**Entorno local:** Supabase local (`http://127.0.0.1:54321`), Vite dev server (`http://localhost:5173`), Docker corriendo.

---

## Estado Actual del Código

### Último commit: `db14a75` (Update .env.example)

### Todos los cambios de esta sesión están commiteados.

---

## Cambios Realizados en Esta Sesión

### 1. Documentación (DOC MAESTRO.md + skills.md + CRM-Embebed.md)

**DOC MAESTRO.md** — Secciones actualizadas/creadas:
- **1.1** Matriz de planes: CRM diferenciado (Básico=sin IA, Fundador=idéntico a Premium)
- **1.1.1** Plan Fundador reescrito: aprobación SuperAdmin, 10 plazas, 1 año gratis
- **1.1.2** Verificación: añadida aprobación manual para Fundador
- **1.1.3** Tasas: añadida excepción Fundador año 2+
- **1.1.5** NUEVA: Transición Post-Año Fundador (3 opciones, auto-migración)
- **2.4.2** NUEVA: Dashboard Contable de Agencia (5 pestañas)
- **2.5.11** NUEVA: Solicitud de Pago en Chat
- **3.2** Motor de Censura ampliado (URLs, CLABE, redes sociales, evasión)
- **6.3.1** NUEVA: Timbrado de CFDI Bajo Demanda
- **6.6** NUEVA: Registro de Gastos de Agencia

**skills.md** — Migrado de 3 tiers a 4 tiers:
- `PLAN_PRICES`, `subscribe_tier` → `plan_type`
- `Corporativo` → `Premium y Fundador` en todas las referencias
- Tabla Stripe Billing actualizada con 4 planes + precios

**CRM-Embebed.md** — Añadida nota de disponibilidad de IA por plan

### 2. Migraciones SQL (3 nuevas)

| Migración | Propósito |
|---|---|
| `20260807000000_fundador_approval_workflow.sql` | Columnas Fundador (`fundador_request_status`, `fundador_requested_at`, `fundador_activated_at`), RPCs `register_agency` (actualizado) y `approve_fundador`, función `check_fundador_expirations` |
| `20260808000000_agency_fiscal_rls.sql` | RLS para agencias en `fiscal_income_records` y `fiscal_expense_records`, columnas `tenant_id`/`created_by` en gastos, CFDI fields, RPC `timbrar_cfdi_ingreso` |
| `20260808000001_chat_payment_and_filters.sql` | `message_type`/`metadata` en `chat_messages`, trigger `sanitize_chat_message` ampliado (URLs, CLABE, redes sociales, evasión), skip para payment messages |
| `20260822000000_fix_agency_rls.sql` | Fix RLS `agencies_tenants` (SuperAdmin via `get_current_user_role()` en vez de `auth.jwt()`) |
| `20260822000001_seed_profile_helper.sql` | RPC helper para seed de profiles |

### 3. Edge Functions (2 nuevas, 3 modificadas)

| Edge Function | Cambio |
|---|---|
| `create-chat-payment/index.ts` (NUEVA) | Solicitud de pago desde chat: comisión de plataforma, validación de órdenes diferidos, creación Stripe Checkout, mensaje `payment_request` en chat |
| `get-agency-transfers/index.ts` (NUEVA) | Lista transfers de Stripe Connect para la agencia |
| `fundador-continuity/index.ts` (NUEVA) | Cron: procesa agencias Fundador con `fundador_continuity_pending`, crea suscripción Stripe Continuidad ($2,999/mes), periodo de gracia 15 días |
| `generate-cfdi/index.ts` (MODIFICADO) | Persiste `cfdi_uuid`, `cfdi_status`, `cfdi_pdf_url`, `cfdi_xml_url` en `fiscal_income_records` |
| `stripe-webhook/index.ts` (MODIFICADO) | Nueva rama `chat_payment=true` en `checkout.session.completed`: actualiza balance de orden, crea registro fiscal, inserta `payment_confirmed` en chat, notifica. Añadida idempotencia. |
| `manage-subscription/index.ts` (MODIFICADO) | Bloqueado auto-upgrade a Fundador (403: "solo SuperAdmin") |
| `ai-qualify-lead/index.ts` (MODIFICADO) | Gating por plan: Plan Básico retorna 403 "no incluye pre-calificación con IA" |

### 4. Frontend (6 archivos modificados, 5 nuevos)

| Archivo | Cambio |
|---|---|
| `src/pages/AgencyFinance.tsx` | Reorganizado con 5 pestañas: Resumen, Ingresos Fiscales, Gastos, P&L, Conversión |
| `src/pages/Chat.tsx` | Botón "Solicitar Pago" + modal, mensajes `payment_request`/`payment_confirmed`, validación cliente `validateChatMessage()`, fallback `conversationId` desde URL params post-pago |
| `src/pages/AgencySettings.tsx` | `subscription_tier` → `plan_type`, pasa `commission_rate` y `preferential_rate_active` |
| `src/pages/AgencyRoles.tsx` | `subscription_tier` → query a `agencies_tenants.plan_type` |
| `src/pages/SuperAdminDashboard.tsx` | Badge de plan_type, botones Aprobar/Rechazar Fundador, filtro "Fundador Pendientes" (con search corregido) |
| `src/pages/auth/AgencyAuth.tsx` | Aviso ámbar al seleccionar Fundador ("Sujeto a aprobación"), eliminado import no usado |
| `src/components/agency/AgencyFiscalIncome.tsx` (NUEVA) | Tabla ingresos fiscales + timbrado CFDI + export CSV |
| `src/components/agency/AgencyExpenseTracking.tsx` (NUEVA) | Registro de gastos operativos por agencia |
| `src/components/agency/AgencyPnlStatement.tsx` (NUEVA) | Estado de resultados (P&L) con 4 KPIs |
| `src/components/agency/AgencyConversionMetrics.tsx` (NUEVA) | Métricas de conversión con progreso hacia tasa preferencial |
| `src/components/agency/StripeConnectStatus.tsx` | Sección "Últimas Transferencias Recibidas" |

### 5. Tipos y Utilidades

| Archivo | Cambio |
|---|---|
| `src/types/database.ts` | `ChatMessageType`, `FundadorRequestStatus`, `cfdi_pdf_url`/`cfdi_xml_url` en `FiscalIncomeRecord`, `tenant_id`/`created_by` en `FiscalExpenseRecord`, campos Fundador en `AgencyTenant` |
| `src/types/api.ts` | `CreateChatPaymentRequest/Response`, `AgencyTransfer`, `GetAgencyTransfersResponse`, `ChatViolation` |
| `src/lib/validation.ts` | `validateChatMessage()` — 14 patrones de detección (URLs, teléfonos, CLABE, redes sociales, evasión) |
| `src/lib/constants.ts` | `GRACE_PERIOD_DAYS` = 5 → 15 |

### 6. Tests (21 archivos E2E, 68 tests)

| Suite | Archivos | Tests |
|---|---|---|
| Auth | `login.spec.ts`, `registration.spec.ts` | 10 |
| Marketplace | `browse.spec.ts`, `package-detail.spec.ts` | 5 |
| Agency | `dashboard.spec.ts`, `crm.spec.ts`, `chat.spec.ts`, `finance.spec.ts`, `settings.spec.ts`, `roles.spec.ts` | 22 |
| Traveler | `checkout.spec.ts` | 3 |
| Admin | `agencies.spec.ts`, `moderation.spec.ts`, `fiscal.spec.ts` | 10 |
| Cross-cutting | `auth-guards.spec.ts`, `censorship.spec.ts` | 11 |
| Setup | `auth.setup.ts` | 5 (login por rol) |
| **Total** | **19 archivos** | **68** |

**Fix crítico en auth.setup.ts:** Login real via Supabase REST API + `page.reload()` para que el Supabase client reconozca la sesión.

### 7. Configuración MCP

`cline_mcp_settings.json` — Añadido servidor MCP Playwright (`@modelcontextprotocol/server-playwright`).

### 8. DevDependencies añadidos

- `playwright@1.62.1`
- `@midscene/web@1.12.0`
- `@playwright/test@1.62.1`

---

## Bugs Encontrados y Corregidos

| # | Bug | Fix |
|---|---|---|
| 1 | `approve_fundador` usa `is_super_admin` (columna inexistente) | → `role_name = 'SuperAdmin'` |
| 2 | `sanitize_chat_message` censuraba `payment_request`/`payment_confirmed` | Añadido `IF message_type != 'text' THEN RETURN NEW` |
| 3 | `create-chat-payment` lee `created_at` sin select | Añadido al `.select()` |
| 4 | RLS `agencies_tenants` bloqueaba inserts (SuperAdmin via `auth.jwt()`) | Nueva migración con `get_current_user_role()` |
| 5 | Post-payment redirect pierde `conversationId` | Fallback a `URLSearchParams` |
| 6 | Webhook sin idempotencia | Verificación de `payment_confirmed` existente |
| 7 | `create-chat-payment` sin role check | Validación de `role_name` ∈ agency roles |
| 8 | Search ignorado con filtro Fundador | Fix en `filteredAgencies` |
| 9 | "Pagar ahora" URL manual incorrecta | Uso de `session.url` de Stripe |
| 10 | `GRACE_PERIOD_DAYS = 5` (inconsistente con doc) | → `15` |

---

## Bugs Pendientes (no bloqueantes)

| # | Bug | Severidad |
|---|---|---|
| 1 | `register_agency` hardcodea legal acceptances a TRUE (parámetros no guardados) | Media |
| 2 | 10-cap Fundador solo cuenta `verified` (no pending) | Media |
| 3 | `agency_commission` variable naming confuso en `create-chat-payment` | Baja |
| 4 | Client validation es subconjunto de server trigger (3 patrones extra en server) | Baja |
| 5 | `fundador-continuity` edge function no tiene cron job programado en migraciones | Media |

---

## Usuarios de Prueba (seed)

**Password para todos:** `Test1234!`

| Email | Rol | Agencia |
|---|---|---|
| `admin@lpav.com` | SuperAdmin | — |
| `agencia1@viajes.com` | Agency_Admin | Viajes Increíbles (Intermedio) |
| `agencia2@tours.com` | Agency_Admin | Tours del Caribe (Premium) |
| `ventas1@viajes.com` | Agency_Collaborator | Viajes Increíbles |
| `ventas2@viajes.com` | Agency_Agent | Viajes Increíbles |
| `viajero1@test.com` | EndUser | — |

---

## Comandos Útiles

```bash
# Entorno
supabase start              # Levantar Supabase local
pnpm dev                    # Levantar Vite dev server

# Datos
SEED_SKIP_STRIPE=1 npx tsx scripts/seed.ts   # Poblar seed data
supabase db reset            # Resetear DB + migraciones

# Tests
pnpm typecheck               # Verificar TypeScript
pnpm test                    # Tests unitarios (263 tests)
npx playwright test          # Tests E2E (68 tests)
npx playwright test --reporter=list  # Ver resultados detallados

# Ver reporte Playwright
npx playwright show-report
```

---

## Archivos Clave para Navegar

| Ruta | Propósito |
|---|---|
| `DOC MAESTRO.md` | PRD completo del proyecto |
| `skills.md` | Guía de implementación |
| `CRM-Embebed.md` | Documentación del CRM |
| `src/lib/constants.ts` | Constantes de negocio (planes, comisiones, IVA, Stripe fees). Nota: las constantes de puntos fueron retiradas temporalmente (septiembre 2026). |
| `src/types/database.ts` | Tipos TypeScript de todas las tablas |
| `supabase/migrations/` | Todas las migraciones SQL |
| `supabase/functions/` | Todas las edge functions |
| `tests/e2e/` | Tests E2E con Playwright |
| `scripts/seed.ts` | Script de seed de datos de prueba |

---

## Próximos Pasos Sugeridos

1. **Fix auth state para tests E2E autenticados** — El approach actual (API + reload) funciona pero es lento. Podría optimizarse con `supabase.auth.setSession()` desde el contexto del navegador.
2. **Añadir tests E2E de flujos completos** — Login → Dashboard → CRM → Chat → Solicitud Pago → Confirmación. Actualmente los tests son unitarios por página.
3. **Fix bug #5 del fundador-continuity** — Añadir cron job en migración para invocar la edge function diariamente.
4. **Fix bug #1 de register_agency** — Guardar los parámetros de legal acceptances en vez de hardcodear TRUE.
5. **Mejorar coverage de tests** — Tests de edge functions con curl/HTTP (requiere Supabase local corriendo).
6. **Documentar API de edge functions** — Crear OpenAPI spec o documentación Swagger para las edge functions.
