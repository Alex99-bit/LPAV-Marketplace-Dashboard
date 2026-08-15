-- ============================================================================
-- Marketplace Stripe Connect — Esquema de base de datos
--
-- Modela la relación entre el usuario vendedor de la plataforma y su cuenta
-- Express de Stripe, además de las órdenes/transacciones ligadas a los
-- PaymentIntents (destination charges).
--
-- Estrategia de pagos:
--   Destination Charge: el comprador paga en la plataforma, la plataforma cobra
--   una comisión (application_fee_amount) y el remanente se transfiere de forma
--   automática a la cuenta conectada (transfer_data.destination). El vendedor
--   NO necesita crear una cuenta de Stripe propia: la plataforma la crea y
--   gestiona por él (Cuenta Express).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Relación usuario vendedor -> cuenta Stripe Express.
--    Guarda el stripe_account_id y el estado de onboarding/verificación.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.seller_stripe_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Usuario vendedor de la plataforma (referencia a auth.users).
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

    -- ID de la cuenta Express en Stripe (acct_...).
    stripe_account_id VARCHAR(255) UNIQUE NOT NULL,

    -- Estado de onboarding / verificación (refleja el account.updated de Stripe).
    details_submitted BOOLEAN DEFAULT FALSE,
    charges_enabled BOOLEAN DEFAULT FALSE,
    payouts_enabled BOOLEAN DEFAULT FALSE,

    -- Snapshot legible del estado (pending / active / restricted / rejected).
    onboarding_status VARCHAR(50) DEFAULT 'pending',

    -- País de la cuenta (por defecto México).
    country VARCHAR(2) DEFAULT 'mx',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

    -- Un solo registro por vendedor.
    CONSTRAINT unique_seller_account UNIQUE (user_id)
);

-- ----------------------------------------------------------------------------
-- 2. Órdenes / transacciones ligadas a un PaymentIntent.
--    Se crean en 'pending' al generar el intent y el webhook las actualiza.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketplace_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ID del PaymentIntent en Stripe (pi_...).
    stripe_payment_intent_id VARCHAR(255) UNIQUE NOT NULL,

    -- Vendedor (cuenta conectada) y comprador.
    seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    buyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Montos en unidad mínima de la divisa (centavos para MXN/USD/EUR).
    amount_minor INTEGER NOT NULL,
    application_fee_minor INTEGER NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL,

    -- Estado del pago (pending / paid / failed / refunded / disputed).
    status VARCHAR(50) NOT NULL DEFAULT 'pending',

    -- Metadata libre (claves de idempotencia, referencias internas, etc.).
    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ----------------------------------------------------------------------------
-- RLS: el vendedor solo ve sus propios registros; el service_role gestiona todo.
-- ----------------------------------------------------------------------------
ALTER TABLE public.seller_stripe_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Seller reads own stripe account"
ON public.seller_stripe_accounts FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Service role manages seller accounts"
ON public.seller_stripe_accounts FOR ALL TO service_role
USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Seller reads own orders"
ON public.marketplace_orders FOR SELECT TO authenticated
USING (seller_id = auth.uid() OR buyer_id = auth.uid());

CREATE POLICY "Service role manages orders"
ON public.marketplace_orders FOR ALL TO service_role
USING (TRUE) WITH CHECK (TRUE);

CREATE INDEX idx_seller_accounts_user ON public.seller_stripe_accounts(user_id);
CREATE INDEX idx_marketplace_orders_seller ON public.marketplace_orders(seller_id);
CREATE INDEX idx_marketplace_orders_pi ON public.marketplace_orders(stripe_payment_intent_id);
