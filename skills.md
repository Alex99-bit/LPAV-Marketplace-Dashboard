# LPAV Marketplace — Full-Stack Implementation Guide

> **Purpose:** This document is a step-by-step implementation guide for an AI agent to build the complete LPAV ("La Plataforma de las Agencias de Viaje") dashboard and marketplace. Execute phases sequentially — each phase depends on the previous one.

---

## 1. PROJECT CONTEXT

### 1.1 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript 5.8 + Tailwind CSS 4 + Vite 6 |
| Routing | React Router 7 |
| Backend | Supabase (PostgreSQL 17, Auth, Realtime, Storage, Edge Functions/Deno v2) |
| AI | Google Gemini 2.5 Flash |
| Payments | Stripe Connect (Express) + Stripe Billing |
| CRM | Twenty CRM (self-hosted, connected via API Gateway) |
| Email | Resend |
| Fiscal (MX) | Facturama (CFDI) |
| Icons | Lucide React |
| Testing | Vitest + Testing Library |
| Package Manager | pnpm 11 |

### 1.2 Code Conventions

- **Language:** All UI text in Spanish. Code, types, and comments in English.
- **Components:** Functional components with hooks. Export default from page files.
- **Styling:** Tailwind utility classes. No CSS modules. Design tokens via `tailwind.config` theme extension.
- **Color palette:** Greens (`#10B981`, `#059669`), Blues (`#1E40AF`, `#3B82F6`), neutral backgrounds (`#F9FAFB`).
- **File structure:**
  - Pages: `src/pages/`
  - Components: `src/components/{domain}/` (agency, auth, chat, checkout, crm, layout, marketplace, notifications, ui)
  - Hooks: `src/hooks/`
  - Context: `src/context/`
  - Types: `src/types/` (database.ts, api.ts, index.ts barrel)
  - Lib/Utils: `src/lib/`
  - Edge Functions: `supabase/functions/{name}/index.ts`
  - Migrations: `supabase/migrations/{timestamp}_{name}.sql`
- **Edge Functions:** Deno v2 runtime. Import shared modules from `../_shared/`. Use `Deno.serve()`.
- **Types:** All DB tables typed in `src/types/database.ts`. All Edge Function request/response types in `src/types/api.ts`.
- **Auth:** JWT-based via Supabase Auth. Agency routes wrapped in `<AuthGuard requireAgency>`.
- **Multi-tenant:** Every query scoped by `tenant_id`. RLS policies enforced at DB level. Helper functions in `get_current_user_tenant()` and permission checkers (`can_manage_catalog()`, etc.) use `SECURITY DEFINER`.
- **No comments in code** unless explicitly requested.

### 1.3 Multi-Tenant & RLS Security Model

- Every operational table includes a `tenant_id UUID` column referencing `agencies_tenants(tenant_id)`.
- RLS enabled on all tables. Policies use `SECURITY DEFINER` helper functions to avoid recursion.
- Key helper functions (already created in migration `20260715000001`):
  - `get_current_user_tenant()` → returns tenant_id for the authenticated user
  - `get_current_user_role()` → returns role_name
  - `can_manage_catalog()`, `can_view_global_leads()`, `can_manage_finance()`, `can_manage_chat()` → boolean permission checkers
- Agency users see only their tenant's data. Travelers see public packages and their own orders/chats.

### 1.4 Current Implementation Status

#### Fully Implemented
- Marketplace browsing (Home, Hero, CatalogGrid, FlyerCard, PriceFilter, RegionFilter)
- Package detail page with AI itinerary generation and lead creation
- Auth flows (email/password, Google OAuth, agency registration, invitation acceptance)
- Agency flyer CRUD (list, create, publish/unpublish, archive)
- Agency custom roles management (create, delete, permission toggles)
- CRM lead management (list, filters, detail modal, status changes, activity log, AI qualification)
- Real-time chat (send/receive, AI qualification, human takeover, censorship warnings)
- 14 Edge Functions (generate-itinerary, presigned-url, create-role, create-lead, ai-qualify-lead, assign-lead, update-lead-status, add-lead-activity, transfer-lead-to-human, report-package, review-package, crm-exchange-token, create-checkout [mock], stripe-webhook [stub])
- 14 SQL migrations (15 tables, RLS, triggers, cron jobs, round-robin assignment)
- Complete TypeScript type system (all DB tables + API contracts)
- UI component library (Button, Input, Select, Modal, Badge, Spinner, Switch)
- Context providers (AuthContext, CartContext)
- Utility libraries (formatters, validators, constants)

#### Pending Implementation
- **Stripe integration:** `create-checkout` returns mock data; `stripe-webhook` is a stub; no real payment processing
- **Flyer image upload:** `presigned-url` Edge Function exists but frontend drag-and-drop is a placeholder
- **Agency Dashboard:** "Recent Activity" section is placeholder text — notifications not displayed
- **Notifications UI:** Bell icon in navbar but no dropdown/panel component
- **Finance module:** No Stripe Connect dashboard, revenue charts, billing portal, or CFDI invoicing
- **Logistics module:** No traveler document vault, rooming list exporter, or emergency center
- **Corporate settings:** No company profile editor, fiscal doc upload, or plan management
- **SuperAdmin panel:** `review-package` Edge Function exists but no admin dashboard page
- **Onboarding questionnaire:** `user_recommendation_profiles` table exists but no UI
- **Post-trip reviews:** No review tables or UI
- **Installment management:** No payment schedule tables or reminder system
- **Email notifications:** No Resend integration
- **Empty component directories:** `agency/`, `checkout/`, `notifications/`

---

## 2. PHASE 1 — FOUNDATION (Infrastructure & Core Backend)

### 2.1 Environment Variables

Update `.env.example` to include all required secrets:

```
# Supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Gemini AI
GEMINI_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_CONNECT_CLIENT_ID=

# Resend (Email)
RESEND_API_KEY=

# Twenty CRM
TWENTY_CRM_API_KEY=
TWENTY_CRM_URL=
VITE_TWENTY_CRM_URL=
VITE_TWENTY_CRM_SSO_SECRET=

# Facturama (CFDI)
FACTURAMA_API_KEY=
FACTURAMA_API_URL=

# App
VITE_APP_URL=
```

### 2.2 SQL Migration: Stripe & Financial Tables

Create `supabase/migrations/20260716000000_stripe_and_financial.sql`:

```sql
CREATE TABLE IF NOT EXISTS public.stripe_accounts (
    stripe_account_id VARCHAR(255) PRIMARY KEY,
    tenant_id UUID REFERENCES public.agencies_tenants(tenant_id) ON DELETE CASCADE NOT NULL,
    account_type VARCHAR(50) DEFAULT 'express',
    charges_enabled BOOLEAN DEFAULT FALSE,
    payouts_enabled BOOLEAN DEFAULT FALSE,
    onboarding_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT unique_stripe_per_tenant UNIQUE (tenant_id)
);

CREATE TABLE IF NOT EXISTS public.installment_schedules (
    installment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.transactions_orders(order_id) ON DELETE CASCADE NOT NULL,
    installment_number INTEGER NOT NULL,
    amount_due NUMERIC(12, 2) NOT NULL,
    amount_paid NUMERIC(12, 2) DEFAULT 0,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE,
    stripe_checkout_url TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    reminder_sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT unique_installment_per_order UNIQUE (order_id, installment_number)
);

CREATE TABLE IF NOT EXISTS public.payment_reminders (
    reminder_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    installment_id UUID REFERENCES public.installment_schedules(installment_id) ON DELETE CASCADE NOT NULL,
    channel VARCHAR(50) NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    delivered BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.saas_subscriptions (
    subscription_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.agencies_tenants(tenant_id) ON DELETE CASCADE NOT NULL,
    stripe_subscription_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    plan_tier VARCHAR(50) NOT NULL,
    billing_cycle VARCHAR(50) DEFAULT 'monthly',
    status VARCHAR(50) DEFAULT 'active',
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    grace_period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT unique_subscription_per_tenant UNIQUE (tenant_id)
);

ALTER TABLE public.stripe_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency reads own stripe account"
ON public.stripe_accounts FOR SELECT TO authenticated
USING (tenant_id = public.get_current_user_tenant());

CREATE POLICY "Agency reads own installments"
ON public.installment_schedules FOR SELECT TO authenticated
USING (
    order_id IN (
        SELECT order_id FROM public.transactions_orders
        WHERE tenant_id = public.get_current_user_tenant()
    )
    OR user_id = auth.uid()
);

CREATE POLICY "Service role manages installments"
ON public.installment_schedules FOR ALL TO service_role
USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Agency reads own subscriptions"
ON public.saas_subscriptions FOR SELECT TO authenticated
USING (tenant_id = public.get_current_user_tenant());

CREATE INDEX idx_installments_order ON public.installment_schedules(order_id);
CREATE INDEX idx_installments_due_date ON public.installment_schedules(due_date) WHERE status = 'pending';
CREATE INDEX idx_saas_sub_tenant ON public.saas_subscriptions(tenant_id);
```

### 2.3 SQL Migration: Logistics Tables

Create `supabase/migrations/20260716000001_logistics.sql`:

```sql
CREATE TABLE IF NOT EXISTS public.traveler_documents (
    document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.transactions_orders(order_id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS public.rooming_lists (
    rooming_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.transactions_orders(order_id) ON DELETE CASCADE NOT NULL,
    generated_by UUID REFERENCES public.profiles(id) NOT NULL,
    file_url TEXT NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS public.travel_incidents (
    incident_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.transactions_orders(order_id) ON DELETE CASCADE NOT NULL,
    reported_by UUID REFERENCES public.profiles(id) NOT NULL,
    severity VARCHAR(50) DEFAULT 'medium',
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'open',
    resolution TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    resolved_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.traveler_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooming_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own documents"
ON public.traveler_documents FOR ALL TO authenticated
USING (user_id = auth.uid() OR order_id IN (
    SELECT order_id FROM public.transactions_orders
    WHERE tenant_id = public.get_current_user_tenant()
))
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Agency manages rooming lists"
ON public.rooming_lists FOR ALL TO authenticated
USING (order_id IN (
    SELECT order_id FROM public.transactions_orders
    WHERE tenant_id = public.get_current_user_tenant()
))
WITH CHECK (order_id IN (
    SELECT order_id FROM public.transactions_orders
    WHERE tenant_id = public.get_current_user_tenant()
));

CREATE POLICY "Agency and traveler manage incidents"
ON public.travel_incidents FOR ALL TO authenticated
USING (
    reported_by = auth.uid()
    OR order_id IN (
        SELECT order_id FROM public.transactions_orders
        WHERE tenant_id = public.get_current_user_tenant()
    )
)
WITH CHECK (TRUE);

CREATE INDEX idx_traveler_docs_order ON public.traveler_documents(order_id);
CREATE INDEX idx_rooming_order ON public.rooming_lists(order_id);
CREATE INDEX idx_incidents_order ON public.travel_incidents(order_id);
```

### 2.4 SQL Migration: Reviews & Notification Preferences

Create `supabase/migrations/20260716000002_reviews_and_notifications.sql`:

```sql
CREATE TABLE IF NOT EXISTS public.package_reviews (
    review_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID REFERENCES public.travel_packages(package_id) ON DELETE CASCADE NOT NULL,
    order_id UUID REFERENCES public.transactions_orders(order_id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    comment TEXT,
    status VARCHAR(50) DEFAULT 'published',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT unique_review_per_user_order UNIQUE (user_id, order_id)
);

CREATE TABLE IF NOT EXISTS public.notification_preferences (
    pref_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    email_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT TRUE,
    email_payment_reminders BOOLEAN DEFAULT TRUE,
    email_chat_notifications BOOLEAN DEFAULT TRUE,
    email_marketing BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT unique_prefs_per_user UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS public.notification_delivery_log (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID REFERENCES public.notifications(notification_id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    channel VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'sent',
    external_id VARCHAR(255),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE public.package_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_delivery_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads published reviews"
ON public.package_reviews FOR SELECT TO anon, authenticated
USING (status = 'published');

CREATE POLICY "Users create own reviews"
ON public.package_reviews FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users manage own preferences"
ON public.notification_preferences FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users read own delivery log"
ON public.notification_delivery_log FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Service role manages delivery log"
ON public.notification_delivery_log FOR ALL TO service_role
USING (TRUE) WITH CHECK (TRUE);

CREATE INDEX idx_reviews_package ON public.package_reviews(package_id) WHERE status = 'published';
CREATE INDEX idx_reviews_user ON public.package_reviews(user_id);
CREATE INDEX idx_notif_prefs_user ON public.notification_preferences(user_id);

CREATE OR REPLACE FUNCTION public.auto_create_notification_prefs()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notification_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_auto_create_notification_prefs ON public.profiles;
CREATE TRIGGER tr_auto_create_notification_prefs
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_create_notification_prefs();

CREATE OR REPLACE FUNCTION public.inject_post_trip_review_request()
RETURNS void AS $$
BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, metadata)
    SELECT
        o.user_id,
        'review_request',
        '¿Cómo fue tu viaje?',
        'Comparte tu experiencia sobre ' || tp.title,
        jsonb_build_object('package_id', tp.package_id, 'order_id', o.order_id)
    FROM public.transactions_orders o
    JOIN public.travel_packages tp ON tp.package_id = (
        SELECT package_id FROM public.travel_packages
        WHERE tenant_id = o.tenant_id
        AND departure_date <= TIMEZONE('utc', NOW()) - INTERVAL '24 hours'
        AND departure_date > TIMEZONE('utc', NOW()) - INTERVAL '25 hours'
        LIMIT 1
    )
    WHERE o.payment_status = 'paid'
    AND NOT EXISTS (
        SELECT 1 FROM public.package_reviews pr
        WHERE pr.order_id = o.order_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2.5 SQL Migration: Agency Settings Extension

Create `supabase/migrations/20260716000003_agency_settings.sql`:

```sql
ALTER TABLE public.agencies_tenants
    ADD COLUMN IF NOT EXISTS logo_url TEXT,
    ADD COLUMN IF NOT EXISTS website_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20),
    ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'America/Mexico_City',
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS social_media JSONB DEFAULT '{}';

CREATE TABLE IF NOT EXISTS public.agency_team_members (
    member_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.agencies_tenants(tenant_id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role_name VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    joined_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT unique_member_per_tenant_email UNIQUE (tenant_id, email)
);

ALTER TABLE public.agency_team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency manages team members"
ON public.agency_team_members FOR ALL TO authenticated
USING (tenant_id = public.get_current_user_tenant())
WITH CHECK (tenant_id = public.get_current_user_tenant());

CREATE INDEX idx_team_members_tenant ON public.agency_team_members(tenant_id);
CREATE INDEX idx_team_members_user ON public.agency_team_members(user_id);
```

### 2.6 Edge Function: Stripe Checkout (Real Implementation)

Replace `supabase/functions/create-checkout/index.ts`:

```typescript
import Stripe from "https://esm.sh/stripe@17?target=deno";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getUser, createServiceClient } from "../_shared/auth.ts";

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const user = await getUser(req);
  if (!user) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await req.json();
  if (!body.package_id) {
    return new Response(JSON.stringify({ error: "package_id es requerido" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createServiceClient();

  const { data: pkg } = await supabase
    .from("travel_packages")
    .select("*, agencies_tenants(stripe_account_id, business_name)")
    .eq("package_id", body.package_id)
    .eq("publication_status", "published")
    .single();

  if (!pkg) {
    return new Response(JSON.stringify({ error: "Paquete no encontrado" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const agency = pkg.agencies_tenants as unknown as { stripe_account_id: string; business_name: string };
  if (!agency?.stripe_account_id) {
    return new Response(JSON.stringify({ error: "Agencia sin Stripe" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")!;
  const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-04-30.basil" });

  const depositPercent = body.deposit_percent ?? 0.2;
  const depositAmount = Math.round(pkg.price * depositPercent * 100);
  const platformFee = Math.round(depositAmount * 0.03);
  const agencyAmount = depositAmount - platformFee;

  const origin = req.headers.get("origin") || "http://localhost:5173";

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [{
      price_data: {
        currency: (pkg.currency || "mxn").toLowerCase(),
        product_data: { name: `Anticipo: ${pkg.title}` },
        unit_amount: depositAmount,
      },
      quantity: 1,
    }],
    mode: "payment",
    success_url: `${origin}/orders?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/checkout`,
    payment_intent_data: {
      application_fee_amount: platformFee,
      transfer_data: { destination: agency.stripe_account_id },
      metadata: {
        package_id: pkg.package_id,
        tenant_id: pkg.tenant_id,
        user_id: user.id,
        order_type: "deposit",
      },
    },
    metadata: {
      package_id: pkg.package_id,
      tenant_id: pkg.tenant_id,
      user_id: user.id,
    },
  }, { stripeAccount: agency.stripe_account_id });

  return new Response(JSON.stringify({
    id: session.id,
    url: session.url,
    amount_total: depositAmount / 100,
    currency: pkg.currency,
    platform_fee: platformFee / 100,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
```

### 2.7 Edge Function: Stripe Webhook (Real Implementation)

Replace `supabase/functions/stripe-webhook/index.ts`:

```typescript
import Stripe from "https://esm.sh/stripe@17?target=deno";
import { createServiceClient } from "../_shared/auth.ts";

Deno.serve(async (req: Request) => {
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")!;
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
  const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-04-30.basil" });
  const supabase = createServiceClient();

  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    return new Response(JSON.stringify({ error: `Webhook Error: ${err.message}` }), { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata!;

      const { data: order } = await supabase
        .from("transactions_orders")
        .insert({
          tenant_id: metadata.tenant_id,
          stripe_checkout_session_id: session.id,
          user_id: metadata.user_id,
          total_amount: session.amount_total! / 100,
          remaining_balance: (session.amount_total! / 100) * (1 / 0.2 - 1),
          currency: (session.currency || "mxn").toUpperCase() as "MXN",
          platform_commission_fee: (session.amount_total! * 0.03) / 100,
          payment_status: "partial_paid",
          next_payment_due: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (order) {
        await supabase.from("notifications").insert({
          user_id: metadata.user_id,
          type: "payment_received",
          title: "Pago confirmado",
          message: `Tu anticipo ha sido procesado exitosamente.`,
        });
      }
      break;
    }

    case "charge.dispute.created": {
      const dispute = event.data.object as Stripe.Dispute;
      await supabase.from("notifications").insert({
        user_id: "system",
        type: "payment_received",
        title: "Disputa bancaria",
        message: `Disputa ${dispute.id} por ${(dispute.amount / 100).toFixed(2)} ${dispute.currency}`,
        metadata: { dispute_id: dispute.id, charge_id: dispute.charge },
      });
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      await supabase
        .from("saas_subscriptions")
        .update({
          status: sub.status,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        })
        .eq("stripe_subscription_id", sub.id);
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await supabase
        .from("saas_subscriptions")
        .update({ status: "cancelled" })
        .eq("stripe_subscription_id", sub.id);

      const { data: tenantSub } = await supabase
        .from("saas_subscriptions")
        .select("tenant_id")
        .eq("stripe_subscription_id", sub.id)
        .single();

      if (tenantSub) {
        await supabase
          .from("agencies_tenants")
          .update({ status: "Suspendido por Pago" })
          .eq("tenant_id", tenantSub.tenant_id);

        await supabase
          .from("travel_packages")
          .update({ publication_status: "draft" })
          .eq("tenant_id", tenantSub.tenant_id)
          .eq("publication_status", "published");
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const { data: sub } = await supabase
        .from("saas_subscriptions")
        .select("tenant_id, agencies_tenants(owner_user_id)")
        .eq("stripe_subscription_id", invoice.subscription as string)
        .single();

      if (sub) {
        const graceEnd = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();
        await supabase
          .from("saas_subscriptions")
          .update({ grace_period_end: graceEnd })
          .eq("tenant_id", (sub as unknown as { tenant_id: string }).tenant_id);

        const agency = (sub as unknown as { agencies_tenants: { owner_user_id: string } }).agencies_tenants;
        if (agency?.owner_user_id) {
          await supabase.from("notifications").insert({
            user_id: agency.owner_user_id,
            type: "payment_received",
            title: "Pago de suscripción fallido",
            message: "Tu pago no pudo procesarse. Tienes 15 días de gracia.",
          });
        }
      }
      break;
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
```

### 2.8 Edge Function: Stripe Connect Account Creation

Create `supabase/functions/create-connect-account/index.ts`:

```typescript
import Stripe from "https://esm.sh/stripe@17?target=deno";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getUser, createServiceClient } from "../_shared/auth.ts";

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const user = await getUser(req);
  if (!user) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createServiceClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, role_name")
    .eq("id", user.id)
    .single();

  if (!profile?.tenant_id || profile.role_name !== "Agency_Admin") {
    return new Response(JSON.stringify({ error: "Solo administradores" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: tenant } = await supabase
    .from("agencies_tenants")
    .select("*")
    .eq("tenant_id", profile.tenant_id)
    .single();

  if (!tenant) {
    return new Response(JSON.stringify({ error: "Tenant no encontrado" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (tenant.stripe_account_id) {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-04-30.basil" });
    const accountLink = await stripe.accountLinks.create({
      account: tenant.stripe_account_id,
      refresh_url: `${req.headers.get("origin")}/agency/settings?stripe=refresh`,
      return_url: `${req.headers.get("origin")}/agency/settings?stripe=return`,
      type: "account_onboarding",
    });
    return new Response(JSON.stringify({ url: accountLink.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-04-30.basil" });
  const account = await stripe.accounts.create({
    type: "express",
    country: "MX",
    email: user.email,
    capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
    business_profile: { name: tenant.business_name, url: tenant.website_url || undefined },
  });

  await supabase
    .from("agencies_tenants")
    .update({ stripe_account_id: account.id })
    .eq("tenant_id", tenant.tenant_id);

  await supabase.from("stripe_accounts").insert({
    stripe_account_id: account.id,
    tenant_id: tenant.tenant_id,
    onboarding_status: "pending",
  });

  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${req.headers.get("origin")}/agency/settings?stripe=refresh`,
    return_url: `${req.headers.get("origin")}/agency/settings?stripe=return`,
    type: "account_onboarding",
  });

  return new Response(JSON.stringify({ url: accountLink.url, account_id: account.id }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
```

### 2.9 Edge Function: Manage SaaS Subscription

Create `supabase/functions/manage-subscription/index.ts`:

```typescript
import Stripe from "https://esm.sh/stripe@17?target=deno";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getUser, createServiceClient } from "../_shared/auth.ts";

const PLAN_PRICES: Record<string, { monthly: string; annual: string }> = {
  Comercial: { monthly: "price_comercial_monthly", annual: "price_comercial_annual" },
  Corporativo: { monthly: "price_corporativo_monthly", annual: "price_corporativo_annual" },
};

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const user = await getUser(req);
  if (!user) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await req.json();
  const { action, plan, billing_cycle } = body;
  const supabase = createServiceClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, role_name")
    .eq("id", user.id)
    .single();

  if (!profile?.tenant_id || profile.role_name !== "Agency_Admin") {
    return new Response(JSON.stringify({ error: "Solo administradores" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-04-30.basil" });
  const origin = req.headers.get("origin") || "http://localhost:5173";

  if (action === "create") {
    const { data: tenant } = await supabase
      .from("agencies_tenants")
      .select("*")
      .eq("tenant_id", profile.tenant_id)
      .single();

    let customerId = tenant?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, name: tenant?.business_name });
      customerId = customer.id;
      await supabase.from("agencies_tenants").update({ stripe_customer_id: customerId }).eq("tenant_id", profile.tenant_id);
    }

    const priceKey = PLAN_PRICES[plan]?.[billing_cycle || "monthly"];
    if (!priceKey) {
      return new Response(JSON.stringify({ error: "Plan o ciclo invalido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [{ price: priceKey, quantity: 1 }],
      success_url: `${origin}/agency/settings?subscription=success`,
      cancel_url: `${origin}/agency/settings?subscription=cancelled`,
      metadata: { tenant_id: profile.tenant_id, plan, billing_cycle: billing_cycle || "monthly" },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (action === "portal") {
    const { data: tenant } = await supabase
      .from("agencies_tenants")
      .select("stripe_customer_id")
      .eq("tenant_id", profile.tenant_id)
      .single();

    if (!tenant?.stripe_customer_id) {
      return new Response(JSON.stringify({ error: "Sin suscripcion activa" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: tenant.stripe_customer_id,
      return_url: `${origin}/agency/settings`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Accion no valida" }), {
    status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
```

### 2.10 Edge Function: Send Email (Resend)

Create `supabase/functions/send-email/index.ts`:

```typescript
import { getCorsHeaders } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/auth.ts";

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Resend no configurado" }), {
      status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await req.json();
  const { to, subject, html, text } = body;

  if (!to || !subject || (!html && !text)) {
    return new Response(JSON.stringify({ error: "Campos requeridos: to, subject, html|text" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "LPAV <noreply@lpav.mx>",
      to: Array.isArray(to) ? to : [to],
      subject,
      html: html || undefined,
      text: text || undefined,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    return new Response(JSON.stringify({ error: data.message || "Error enviando email" }), {
      status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ id: data.id }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
```

### 2.11 Edge Function: Notification Dispatcher

Create `supabase/functions/dispatch-notification/index.ts`:

```typescript
import { getCorsHeaders } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/auth.ts";

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const body = await req.json();
  const { user_id, type, title, message, metadata } = body;
  const supabase = createServiceClient();

  const { data: notification } = await supabase
    .from("notifications")
    .insert({ user_id, type, title, message, metadata })
    .select()
    .single();

  if (!notification) {
    return new Response(JSON.stringify({ error: "Error creando notificacion" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", user_id)
    .single();

  const channels: string[] = [];

  if (prefs?.push_enabled) {
    channels.push("push");
  }

  if (prefs?.email_enabled) {
    const shouldEmail = (
      (type === "payment_received" && prefs.email_payment_reminders) ||
      (type === "new_message" && prefs.email_chat_notifications) ||
      ["package_reported", "package_approved", "package_banned", "order_cancelled"].includes(type)
    );
    if (shouldEmail) channels.push("email");
  }

  for (const channel of channels) {
    await supabase.from("notification_delivery_log").insert({
      notification_id: notification.notification_id,
      user_id,
      channel,
      status: "queued",
    });
  }

  if (channels.includes("email")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", user_id)
      .single();

    if (profile?.email) {
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          to: profile.email,
          subject: title,
          html: `<h2>${title}</h2><p>${message || ""}</p>`,
        }),
      });
    }
  }

  return new Response(JSON.stringify({ notification_id: notification.notification_id, channels }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
```

### 2.12 Edge Function: Installment Reminder

Create `supabase/functions/installment-reminder/index.ts`:

```typescript
import { getCorsHeaders } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/auth.ts";
import Stripe from "https://esm.sh/stripe@17?target=deno";

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createServiceClient();
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-04-30.basil" });

  const now = new Date();
  const { data: dueInstallments } = await supabase
    .from("installment_schedules")
    .select("*, transactions_orders(user_id, tenant_id, currency, agencies_tenants(stripe_account_id, business_name))")
    .eq("status", "pending")
    .lte("due_date", new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString())
    .is("reminder_sent_at", null);

  if (!dueInstallments?.length) {
    return new Response(JSON.stringify({ reminded: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let reminded = 0;
  const origin = Deno.env.get("VITE_APP_URL") || "http://localhost:5173";

  for (const inst of dueInstallments) {
    const order = inst.transactions_orders as unknown as {
      user_id: string; tenant_id: string; currency: string;
      agencies_tenants: { stripe_account_id: string; business_name: string };
    };

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: (order.currency || "mxn").toLowerCase(),
          product_data: { name: `Abono ${inst.installment_number} - LPAV` },
          unit_amount: Math.round(inst.amount_due * 100),
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: `${origin}/orders?installment=${inst.installment_id}`,
      cancel_url: `${origin}/orders`,
      metadata: {
        installment_id: inst.installment_id,
        order_id: inst.order_id,
        user_id: order.user_id,
        tenant_id: order.tenant_id,
      },
    }, { stripeAccount: order.agencies_tenants.stripe_account_id });

    await supabase
      .from("installment_schedules")
      .update({ stripe_checkout_url: session.url, reminder_sent_at: now.toISOString() })
      .eq("installment_id", inst.installment_id);

    await supabase.from("payment_reminders").insert({
      installment_id: inst.installment_id,
      channel: "email",
    });

    await supabase.from("notifications").insert({
      user_id: order.user_id,
      type: "payment_received",
      title: `Abono ${inst.installment_number} pendiente`,
      message: `Tu abono de $${inst.amount_due} ${order.currency} vence el ${new Date(inst.due_date).toLocaleDateString("es-MX")}.`,
      metadata: { checkout_url: session.url, installment_id: inst.installment_id },
    });

    reminded++;
  }

  return new Response(JSON.stringify({ reminded }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
```

### 2.13 Edge Function: CFDI Invoice (Facturama)

Create `supabase/functions/generate-cfdi/index.ts`:

```typescript
import { getCorsHeaders } from "../_shared/cors.ts";
import { getUser, createServiceClient } from "../_shared/auth.ts";

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const user = await getUser(req);
  if (!user) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const facturamaKey = Deno.env.get("FACTURAMA_API_KEY");
  const facturamaUrl = Deno.env.get("FACTURAMA_API_URL") || "https://api.facturama.mx/2/";
  if (!facturamaKey) {
    return new Response(JSON.stringify({ error: "Facturama no configurado" }), {
      status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await req.json();
  const { concept, amount, currency, tenant_id } = body;

  const supabase = createServiceClient();

  const { data: tenant } = await supabase
    .from("agencies_tenants")
    .select("rfc, business_name, address_text")
    .eq("tenant_id", tenant_id)
    .single();

  if (!tenant) {
    return new Response(JSON.stringify({ error: "Tenant no encontrado" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const cfdiPayload = {
    Name: tenant.business_name,
    CfdiType: "I",
    PaymentForm: "99",
    Currency: currency || "MXN",
    Receiver: {
      Rfc: tenant.rfc,
      Name: tenant.business_name,
      CfdiUse: "G03",
      FiscalRegime: "601",
      TaxZipCode: "06700",
    },
    Items: [{
      ProductCode: "84111506",
      Description: concept,
      UnitCode: "E48",
      UnitPrice: amount,
      Quantity: 1,
      Subtotal: amount,
      Total: amount * 1.16,
      Taxes: [{
        Name: "IVA",
        Rate: 0.16,
        Type: "Traslado",
        Total: amount * 0.16,
      }],
    }],
  };

  const res = await fetch(`${facturamaUrl}cfi/33`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${btoa(facturamaKey)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cfdiPayload),
  });

  const data = await res.json();

  if (!res.ok) {
    return new Response(JSON.stringify({ error: data.Message || "Error timbrando CFDI" }), {
      status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({
    cfdi_id: data.Id,
    uuid: data.Complement?.TaxStamp?.Uuid,
    pdf_url: data.PdfUrl,
    xml_url: data.XmlUrl,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
```

### 2.14 Update TypeScript Types

Add to `src/types/database.ts`:

```typescript
export interface StripeAccount {
  stripe_account_id: string;
  tenant_id: string;
  account_type: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  onboarding_status: string;
  created_at: string;
}

export interface InstallmentSchedule {
  installment_id: string;
  order_id: string;
  installment_number: number;
  amount_due: number;
  amount_paid: number;
  due_date: string;
  paid_at: string | null;
  stripe_checkout_url: string | null;
  status: "pending" | "paid" | "overdue" | "cancelled";
  reminder_sent_at: string | null;
  created_at: string;
}

export interface SaasSubscription {
  subscription_id: string;
  tenant_id: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  plan_tier: SubscriptionTier;
  billing_cycle: "monthly" | "annual";
  status: "active" | "past_due" | "cancelled" | "trialing";
  current_period_start: string | null;
  current_period_end: string | null;
  grace_period_end: string | null;
  created_at: string;
}

export interface TravelerDocument {
  document_id: string;
  order_id: string;
  user_id: string;
  document_type: string;
  file_url: string;
  file_name: string;
  uploaded_at: string;
}

export interface RoomingList {
  rooming_id: string;
  order_id: string;
  generated_by: string;
  file_url: string;
  generated_at: string;
}

export interface TravelIncident {
  incident_id: string;
  order_id: string;
  reported_by: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string | null;
  status: "open" | "in_progress" | "resolved" | "closed";
  resolution: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface PackageReview {
  review_id: string;
  package_id: string;
  order_id: string;
  user_id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  status: "published" | "hidden";
  created_at: string;
}

export interface NotificationPreference {
  pref_id: string;
  user_id: string;
  email_enabled: boolean;
  push_enabled: boolean;
  email_payment_reminders: boolean;
  email_chat_notifications: boolean;
  email_marketing: boolean;
  created_at: string;
}

export interface AgencyTeamMember {
  member_id: string;
  tenant_id: string;
  user_id: string | null;
  email: string;
  full_name: string | null;
  role_name: string;
  status: "active" | "invited" | "deactivated";
  invited_at: string;
  joined_at: string | null;
}
```

Update the `Database` interface to include all new tables.

Add to `src/types/api.ts`:

```typescript
export interface CreateConnectAccountResponse {
  url: string;
  account_id?: string;
}

export interface ManageSubscriptionRequest {
  action: "create" | "portal";
  plan?: string;
  billing_cycle?: "monthly" | "annual";
}

export interface ManageSubscriptionResponse {
  url: string;
}

export interface GenerateCfdiRequest {
  concept: string;
  amount: number;
  currency?: string;
  tenant_id: string;
}

export interface GenerateCfdiResponse {
  cfdi_id: string;
  uuid: string;
  pdf_url: string;
  xml_url: string;
}

export interface DispatchNotificationRequest {
  user_id: string;
  type: string;
  title: string;
  message?: string;
  metadata?: Record<string, unknown>;
}
```

### 2.15 Verification

After Phase 1, run:
```bash
supabase db reset
pnpm typecheck
pnpm test
```

---

## 3. PHASE 2 — B2B DASHBOARD COMPLETION

### 3.1 Agency Dashboard — Full KPI Panel

Replace `src/pages/AgencyDashboard.tsx` with a complete implementation:

**KPIs to display (max 15):**
1. Monthly gross revenue (from `transactions_orders` where `tenant_id` matches)
2. Lead conversion rate (won / total leads from `crm_leads`)
3. Active flyers count vs plan limit
4. Active chats awaiting response
5. Total leads this month
6. New leads this week
7. Average response time
8. Packages with pending reports
9. Overdue installments count
10. SaaS subscription status + renewal date
11. Total orders this month
12. Paid vs pending revenue
13. Average package rating
14. Censorship strikes count
15. Team members count

**Recent Activity section:** Replace placeholder with real-time notifications feed using Supabase Realtime subscription on `notifications` table filtered by agency users.

**SaaS Status Banner:** Persistent top banner showing plan tier, subscription status, and renewal date. If `status === "Suspendido por Pago"`, show warning with link to billing portal.

**Components to create:**
- `src/components/agency/KpiCard.tsx` — Reusable metric card with icon, value, label, trend indicator
- `src/components/agency/RevenueChart.tsx` — Bar/line chart for monthly revenue (use simple CSS bars, no chart library)
- `src/components/agency/RecentActivity.tsx` — Realtime notification feed
- `src/components/agency/SaasStatusBanner.tsx` — Subscription status banner

### 3.2 Flyer Image Upload — Wire Presigned URL

Update `src/pages/AgencyFlyers.tsx` to replace the placeholder image upload area:

**Implementation:**
1. Create `src/components/agency/FlyerImageUpload.tsx`:
   - Drag-and-drop zone accepting `image/jpeg`, `image/png`, `image/webp`
   - On drop, call `POST /functions/v1/presigned-url` with the agent's JWT
   - Use the returned `signedUrl` to `PUT` the file directly to Supabase Storage
   - Show upload progress indicator
   - Validate 3:4 aspect ratio client-side (warn if not matching)
   - Display preview thumbnail after successful upload
   - Store the `path` returned from presigned-url in the form state

2. Integrate into the flyer create/edit modal form
3. After save, trigger the Sharp processing pipeline (handled server-side by storage trigger)

### 3.3 Installment Config in Flyer Form

Add to the flyer create/edit form:
- **Deposit percentage** field (number input, min 20%, default 20%)
- **Max deferred months** field (number input, max 4, default 0 = no installments)
- When installments are enabled, show a visual breakdown of the payment schedule

Update `travel_packages` table (add migration):
```sql
ALTER TABLE public.travel_packages
    ADD COLUMN IF NOT EXISTS deposit_percent NUMERIC(5,2) DEFAULT 0.20,
    ADD COLUMN IF NOT EXISTS max_installments INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS itinerary_text TEXT;
```

### 3.4 Finance Module

Create `src/pages/AgencyFinance.tsx`:

**Sections:**
1. **Stripe Connect Status** — Show connection status, charges/payouts enabled, link to complete onboarding
2. **Revenue Overview** — Total revenue, platform fees deducted, net received. Date range filter.
3. **Per-Trip Profitability** — Table showing each package: gross revenue, costs, net profit
4. **SaaS Subscription** — Current plan, billing cycle, next renewal, link to Stripe Billing portal
5. **CFDI Invoices** — List of generated invoices, button to generate new CFDI

**Components to create:**
- `src/components/agency/StripeConnectStatus.tsx`
- `src/components/agency/RevenueOverview.tsx`
- `src/components/agency/ProfitabilityTable.tsx`
- `src/components/agency/CfdiInvoices.tsx`

**Route:** Add `/agency/finance` with `<AuthGuard requireAgency>` in `App.tsx`

### 3.5 Logistics Module

Create `src/pages/AgencyLogistics.tsx`:

**Sections:**
1. **Active Trips** — List of orders with `payment_status = 'paid'` or `'partial_paid'` and upcoming departure
2. **Document Vault** — Per-order view of uploaded traveler documents (passports, IDs). Download links from encrypted storage.
3. **Rooming List Generator** — Button per order to generate and download CSV/PDF rooming list
4. **Incident Center** — List of open incidents, form to create new incident, ability to update status and add resolution

**Components to create:**
- `src/components/agency/ActiveTripsList.tsx`
- `src/components/agency/DocumentVault.tsx`
- `src/components/agency/RoomingListExporter.tsx`
- `src/components/agency/IncidentCenter.tsx`

**Route:** Add `/agency/logistics` with `<AuthGuard requireAgency>` in `App.tsx`

### 3.6 Corporate Settings Page

Create `src/pages/AgencySettings.tsx`:

**Sections:**
1. **Company Profile** — Edit business name, RFC, address, contact email/phone, website, description, social media links, logo upload, timezone selector
2. **Fiscal Documents** — Upload/view Acta Constitutiva, Constancia de Situación Fiscal
3. **Team Management** — List team members, send invitations, deactivate members. Uses `agency_team_members` table and `agency_invitations` table.
4. **Plan Management** — Current plan display, upgrade/downgrade buttons (calls `manage-subscription` Edge Function)
5. **Stripe Connect** — Onboarding link, account status

**Components to create:**
- `src/components/agency/CompanyProfileForm.tsx`
- `src/components/agency/FiscalDocuments.tsx`
- `src/components/agency/TeamManagement.tsx`
- `src/components/agency/PlanManagement.tsx`

**Route:** Add `/agency/settings` with `<AuthGuard requireAgency>` in `App.tsx`

### 3.7 Payment Default States

Implement state machine for agency payment status:

**In `src/components/agency/SaasStatusBanner.tsx`:**
- `Activo` → Green banner, all features available
- `Período de Gracia` → Yellow banner, block new publishes and new leads, keep chat + payments active
- `Suspendido por Pago` → Red banner, all flyers hidden, redirect to billing portal

**In `AuthGuard.tsx`:** Add logic to check tenant status and restrict navigation based on payment state.

**In `AgencyFlyers.tsx`:** Disable "Create Flyer" button when in grace period or suspended.

**In `AgencyCRM.tsx`:** Disable new lead ingestion when in grace period.

### 3.8 Agency Sidebar Navigation

Replace the current header-only navigation with a sidebar layout for agency pages:

Create `src/components/agency/AgencySidebar.tsx`:
- Dashboard (icon: LayoutDashboard)
- Flyers (icon: Image)
- CRM (icon: Users)
- Chat (icon: MessageSquare)
- Finanzas (icon: DollarSign) — requires `can_manage_finance`
- Logística (icon: Truck) — requires `can_manage_chat`
- Configuración (icon: Settings)

Wrap agency routes in a layout component that includes the sidebar.

### 3.9 Verification

```bash
pnpm typecheck
pnpm test
pnpm dev  # Manual testing of all agency routes
```

---

## 4. PHASE 3 — B2C MARKETPLACE COMPLETION

### 4.1 Onboarding Questionnaire

Create `src/components/marketplace/OnboardingModal.tsx`:

**Trigger:** Before first AI itinerary generation, check if `user_recommendation_profiles.onboarding_completed === false`. If so, show modal.

**Steps:**
1. Interest tags selection (multi-select from `INTEREST_TAGS` constant)
2. Preferred destinations (multi-select from `REGIONS`)
3. Budget range (single select from `BUDGET_RANGES`)
4. Travel style (single select)

**On submit:**
- Calculate `cluster_interests_hash` (SHA-256 of sorted interests + budget + style)
- Upsert into `user_recommendation_profiles`
- Set `onboarding_completed = true`

### 4.2 Checkout Flow — Real Stripe Integration

Update `src/pages/Checkout.tsx`:

1. On "Proceder al Pago" click:
   - For each cart item, call `POST /functions/v1/create-checkout` with `package_id`
   - Redirect to the returned Stripe Checkout URL
   - Handle multiple items by creating separate sessions or a combined session

2. On return from Stripe (via `success_url`):
   - Read `session_id` from URL params
   - Clear cart
   - Show success confirmation
   - Navigate to `/orders`

3. Guest-to-auth cart merge:
   - On successful auth, read `lpav_cart` from localStorage
   - If user has existing DB cart, merge items (deduplicate by `package_id`)
   - Clear localStorage cart

### 4.3 Orders Page — Installment Tracking

Update `src/pages/Orders.tsx`:

1. Show installment schedule per order (from `installment_schedules` table)
2. For each pending installment, show:
   - Due date
   - Amount
   - "Pay Now" button linking to the Stripe Checkout URL from `installment_schedules.stripe_checkout_url`
3. Show morosity status: if past due date + 14 days, show "Cancelado por falta de pago"
4. Show payment history timeline

### 4.4 Post-Trip Reviews

Create `src/components/marketplace/ReviewForm.tsx` and `src/components/marketplace/ReviewList.tsx`:

**ReviewForm:**
- Star rating selector (1-5)
- Title input
- Comment textarea
- Submit calls Supabase insert into `package_reviews`

**ReviewList:**
- Display on `PackageDetailPage.tsx` below itinerary section
- Show average rating, total reviews, individual review cards
- Sort by most recent

**Integration:**
- Add reviews section to `PackageDetailPage.tsx`
- Show average rating on `FlyerCard.tsx` (small star badge)

### 4.5 Verification

```bash
pnpm typecheck
pnpm test
pnpm dev  # Test checkout flow, reviews, onboarding
```

---

## 5. PHASE 4 — CROSS-CUTTING FEATURES

### 5.1 Notification Bell Panel

Create `src/components/notifications/NotificationBell.tsx`:

- Bell icon in navbar with unread count badge
- Click opens dropdown panel
- Realtime subscription on `notifications` table for current user
- Mark as read on click
- "Mark all as read" button
- Notification types with appropriate icons from `NOTIFICATION_ICONS` constant
- Relative timestamps using `formatRelativeTime()`

Create `src/components/notifications/NotificationItem.tsx`:
- Icon based on type
- Title + message
- Time ago
- Read/unread visual state

### 5.2 SuperAdmin Panel

Create `src/pages/SuperAdminDashboard.tsx`:

**Sections:**
1. **Package Moderation Queue** — List of `package_reports` with `status = 'pending'`. Approve/ban buttons calling `review-package` Edge Function.
2. **Agency Audit** — List of all agencies with status, plan, revenue. Ability to suspend/activate.
3. **User Strikes** — List of users with censorship strikes. Ability to reset or ban.
4. **Platform Metrics** — Total agencies, total packages, total revenue, commission earned.

**Route:** Add `/admin` with `<AuthGuard requireSuperAdmin>` in `App.tsx`

### 5.3 Chat Offline Fallback

The chat offline notification logic should be implemented as a Supabase Edge Function triggered by a cron job:

Create `supabase/functions/chat-offline-check/index.ts`:
- Query agents who have active conversations but haven't sent a message in 5+ minutes
- For each, check if they're still connected via Realtime presence
- If offline, dispatch email notification via `dispatch-notification` Edge Function
- Rate limit: max 1 email per agent per hour

### 5.4 AI Agent Toggle (Plan Corporativo)

In `src/pages/Chat.tsx`, add a toggle switch for `Agency_Admin` users on Corporativo plan:
- When enabled, the AI bot handles the conversation automatically
- When disabled, the human agent takes control
- The toggle calls `transfer-lead-to-human` Edge Function when switching from AI to human

### 5.5 Behavior Analytics Dashboard

Create `src/pages/AgencyAnalytics.tsx` (Corporativo plan only):

- Funnel visualization: views → leads → qualified → won
- Average agent response time
- Lead source distribution
- Revenue by package

**Route:** Add `/agency/analytics` with `<AuthGuard requireAgency>` and plan check

### 5.6 Verification

```bash
pnpm typecheck
pnpm test
```

---

## 6. PHASE 5 — DEVOPS & DEPLOYMENT

### 6.1 CI/CD Pipeline

Create `.github/workflows/ci.yml`:

```yaml
name: CI
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
```

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: --prod

  deploy-edge-functions:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - run: supabase functions deploy --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

  deploy-migrations:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - run: supabase db push --linked
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

### 6.2 Environment Configuration

**Vercel environment variables:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_TWENTY_CRM_URL`
- `VITE_TWENTY_CRM_SSO_SECRET`
- `VITE_APP_URL`

**Supabase Edge Function secrets:**
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_CONNECT_CLIENT_ID`
- `RESEND_API_KEY`
- `GEMINI_API_KEY`
- `TWENTY_CRM_API_KEY`
- `TWENTY_CRM_URL`
- `FACTURAMA_API_KEY`
- `FACTURAMA_API_URL`

### 6.3 Stripe Webhook Registration

Register the webhook endpoint in Stripe Dashboard:
- URL: `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`
- Events: `checkout.session.completed`, `charge.dispute.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`

### 6.4 Cron Jobs

Set up Supabase cron jobs (via `supabase/config.toml` or pg_cron):

```sql
-- Package expiration: run daily at midnight UTC
SELECT cron.schedule('expire-packages', '0 0 * * *', 'SELECT public.expire_concluded_packages()');

-- Payment morosity check: run daily at 6am UTC
SELECT cron.schedule('check-morosity', '0 6 * * *', 'SELECT public.check_payment_morosity()');

-- Installment reminders: run daily at 8am UTC
-- (via Edge Function invocation or pg_net)

-- Post-trip review request: run daily at 10am UTC
SELECT cron.schedule('review-requests', '0 10 * * *', 'SELECT public.inject_post_trip_review_request()');

-- Archive concluded packages older than 1 year: run weekly
SELECT cron.schedule('archive-old-packages', '0 0 * * 0', 'SELECT public.archive_old_concluded_packages()');
```

### 6.5 Monitoring

- **Error tracking:** Integrate Sentry or similar in production build
- **Uptime:** Configure Supabase alerts for Edge Function failures
- **Database:** Monitor connection pool usage and slow queries via Supabase dashboard

### 6.6 Verification

```bash
# Test CI locally
pnpm typecheck && pnpm test && pnpm build

# Test Edge Functions locally
supabase functions serve --env-file .env

# Test webhook locally with Stripe CLI
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook
```

---

## 7. TESTING STRATEGY

### 7.1 Unit Tests (Vitest)

**Existing test files to extend:**
- `src/hooks/__tests__/useDebounce.test.ts`
- `src/hooks/__tests__/useLocalStorage.test.ts`
- `src/context/__tests__/CartContext.test.tsx`
- `src/context/__tests__/AuthContext.test.tsx`
- `src/lib/__tests__/` (formatters, validation)

**New unit tests to create:**
- `src/lib/__tests__/formatters.test.ts` — Currency formatting, date formatting, relative time
- `src/lib/__tests__/validation.test.ts` — Email, RFC, password, role name validation
- `src/lib/__tests__/constants.test.ts` — Plan limits consistency

### 7.2 Component Tests (Testing Library)

**Priority components to test:**
- `src/components/ui/Button.test.tsx` — Variants, loading state, disabled state
- `src/components/ui/Modal.test.tsx` — Open/close, escape key, backdrop click
- `src/components/marketplace/FlyerCard.test.tsx` — Aspect ratio, badge rendering
- `src/components/marketplace/PriceFilter.test.tsx` — Range slider behavior
- `src/components/crm/LeadCard.test.tsx` — Status badge, qualification progress
- `src/components/crm/LeadDetailModal.test.tsx` — Status change, activity log
- `src/components/agency/KpiCard.test.tsx` — Value display, trend indicator
- `src/components/agency/FlyerImageUpload.test.tsx` — Drag-drop, validation

### 7.3 Integration Tests

**Edge Function tests (mock Supabase):**
- `create-checkout` — Valid package, missing package, no Stripe account
- `create-role` — Plan limits enforcement, name validation
- `generate-itinerary` — Rate limiting, cache hit, cache miss
- `create-lead` — Round-robin assignment, conversation creation

### 7.4 E2E Tests (Future — Playwright)

**Critical user flows:**
1. Traveler: Browse → Filter → View Detail → Generate Itinerary → Add to Cart → Checkout → Pay
2. Agency: Register → Create Flyer → Upload Image → View Leads → Respond Chat
3. Admin: Review Reported Package → Approve/Ban

### 7.5 Running Tests

```bash
pnpm test              # Run all tests
pnpm test:coverage     # With coverage report
pnpm test:ui           # Vitest UI
```

---

## 8. EXTERNAL API CONTRACTS (Appendix)

### 8.1 Stripe Connect (Express Accounts)

**Account Creation:**
```
POST /v1/accounts
- type: "express"
- country: "MX"
- capabilities: { card_payments: true, transfers: true }
```

**Account Link (Onboarding):**
```
POST /v1/account_links
- account: <stripe_account_id>
- type: "account_onboarding"
- refresh_url, return_url
```

**Split Payment (Checkout Session):**
```
POST /v1/checkout/sessions
- payment_intent_data.application_fee_amount: platform_fee (3%)
- payment_intent_data.transfer_data.destination: agency stripe_account_id
- Stripe-Account header: agency stripe_account_id
```

**Webhook Events:**
| Event | Action |
|---|---|
| `checkout.session.completed` | Create `transactions_orders` record, create installment schedule, notify |
| `charge.dispute.created` | Notify agency, log dispute |
| `customer.subscription.updated` | Update `saas_subscriptions` status |
| `customer.subscription.deleted` | Suspend tenant, hide flyers |
| `invoice.payment_failed` | Start grace period, notify admin |

### 8.2 Stripe Billing (SaaS Subscriptions)

**Plans:**
| Plan | Monthly Price | Annual Price (20% discount) |
|---|---|---|
| Gratuito | Free | Free |
| Comercial | Set in Stripe Dashboard | Set in Stripe Dashboard |
| Corporativo | Set in Stripe Dashboard | Set in Stripe Dashboard |

**Checkout Session (Subscription):**
```
POST /v1/checkout/sessions
- mode: "subscription"
- customer: stripe_customer_id
- line_items: [{ price: price_id }]
```

**Customer Portal:**
```
POST /v1/billing_portal/sessions
- customer: stripe_customer_id
- return_url: app URL
```

### 8.3 Facturama (CFDI Mexico)

**Create CFDI:**
```
POST {FACTURAMA_API_URL}/cfi/33
Authorization: Basic {base64(api_key)}
Content-Type: application/json

{
  "Name": "Business Name",
  "CfdiType": "I",
  "PaymentForm": "99",
  "Currency": "MXN",
  "Receiver": {
    "Rfc": "XAXX010101000",
    "Name": "Business Name",
    "CfdiUse": "G03",
    "FiscalRegime": "601",
    "TaxZipCode": "06700"
  },
  "Items": [{
    "ProductCode": "84111506",
    "Description": "Comisión plataforma LPAV",
    "UnitCode": "E48",
    "UnitPrice": 100.00,
    "Quantity": 1,
    "Subtotal": 100.00,
    "Total": 116.00,
    "Taxes": [{ "Name": "IVA", "Rate": 0.16, "Type": "Traslado", "Total": 16.00 }]
  }]
}
```

**Response:**
```json
{
  "Id": "cfdi_id",
  "Complement": { "TaxStamp": { "Uuid": "sat_uuid" } },
  "PdfUrl": "https://...",
  "XmlUrl": "https://..."
}
```

**Concepts to invoice:**
- SaaS subscription fees (monthly/annual)
- Platform commission (3% per transaction)

### 8.4 Resend (Transactional Email)

**Send Email:**
```
POST https://api.resend.com/emails
Authorization: Bearer {RESEND_API_KEY}
Content-Type: application/json

{
  "from": "LPAV <noreply@lpav.mx>",
  "to": ["user@example.com"],
  "subject": "Email subject",
  "html": "<h1>Content</h1>"
}
```

**Email Templates Needed:**
1. Payment confirmation (traveler)
2. Payment reminder (installment due)
3. New lead notification (agency)
4. Chat message notification (offline agent)
5. Subscription payment failed (agency admin)
6. Trip review request (traveler, 24h post-trip)
7. Invitation to join agency team

### 8.5 Google Gemini (AI)

**Generate Itinerary:**
```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent
Authorization: Bearer {GEMINI_API_KEY}

{
  "contents": [{ "parts": [{ "text": "prompt" }] }],
  "generationConfig": {
    "responseMimeType": "application/json",
    "responseSchema": {
      "type": "OBJECT",
      "properties": {
        "title": { "type": "STRING" },
        "totalDays": { "type": "INTEGER" },
        "description": { "type": "STRING" },
        "days": {
          "type": "ARRAY",
          "items": {
            "type": "OBJECT",
            "properties": {
              "dayNumber": { "type": "INTEGER" },
              "title": { "type": "STRING" },
              "activities": {
                "type": "ARRAY",
                "items": {
                  "type": "OBJECT",
                  "properties": {
                    "time": { "type": "STRING" },
                    "description": { "type": "STRING" },
                    "location": { "type": "STRING" }
                  },
                  "required": ["time", "description"]
                }
              }
            },
            "required": ["dayNumber", "title", "activities"]
          }
        }
      },
      "required": ["title", "totalDays", "days"]
    }
  }
}
```

**Rate Limits:**
- 5 itineraries per user per day
- 3 requests per minute (escalating ban: 15min → 1hr → 24hr)
- Cache key: `{package_id}:{cluster_interests_hash}`

### 8.6 Twenty CRM (Self-Hosted)

**SSO Token Exchange:**
```
POST {TWENTY_CRM_URL}/auth/token
Content-Type: application/json

{
  "grant_type": "client_credentials",
  "client_id": "lpav-marketplace",
  "client_secret": "{VITE_TWENTY_CRM_SSO_SECRET}"
}
```

**Lead Sync:**
- Leads are stored in LPAV's own `crm_leads` table
- Twenty CRM integration is optional and used for advanced analytics
- Sync happens via API Gateway when `TWENTY_CRM_API_KEY` is configured

---

## 9. EXECUTION ORDER SUMMARY

| Phase | Description | Dependencies | Estimated Effort |
|---|---|---|---|
| **1** | Foundation (SQL, Stripe, Email, Edge Functions) | None | 2-3 days |
| **2** | B2B Dashboard (KPIs, Finance, Logistics, Settings) | Phase 1 | 3-4 days |
| **3** | B2C Marketplace (Onboarding, Checkout, Reviews) | Phase 1 | 2-3 days |
| **4** | Cross-cutting (Notifications, SuperAdmin, Analytics) | Phase 2+3 | 2 days |
| **5** | DevOps (CI/CD, Deploy, Monitoring) | Phase 4 | 1 day |

**Total estimated effort: 10-13 days of focused implementation.**

---

## 10. ROUTING MAP (Final State)

```
Public:
  /                           Home (Marketplace)
  /package/:id                Package Detail
  /auth/login                 Login / Register
  /auth/agency                Agency Auth + Registration
  /auth/accept-invite         Invitation Acceptance

Authenticated (Traveler):
  /checkout                   Cart Review + Stripe Checkout
  /orders                     Order History + Installments
  /chat                       Real-time Chat

Agency (Protected):
  /agency/dashboard           KPI Panel + Activity Feed
  /agency/flyers              Catalog Management
  /agency/crm                 Lead Management
  /agency/finance             Stripe Connect + Revenue + CFDI
  /agency/logistics           Documents + Rooming + Incidents
  /agency/settings            Profile + Team + Plan + Stripe
  /agency/analytics           Commercial Analytics (Corporativo)
  /agency/roles               RBAC Management

SuperAdmin:
  /admin                      Moderation + Audit + Metrics
```
