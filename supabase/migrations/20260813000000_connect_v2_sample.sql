-- ============================================================================
-- Muestra de integración Stripe Connect (API V2)
--
-- Tablas mínimas para demostrar los flujos de Connect:
--   1. connect_accounts: mapeo usuario (auth.users) -> cuenta conectada Stripe.
--   2. connect_orders:   registro de cumplimiento de compras (checkout).
--
-- La relación producto -> cuenta conectada se guarda en el `metadata` del
-- producto en Stripe (ver connect-products), por lo que no se requiere una
-- tabla extra aquí. Podrías replicarla en BD si prefieres consultar sin pegar
-- a la API de Stripe.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Mapeo usuario -> cuenta conectada
--    El spec pide: "If there is a DB already setup, store a mapping from the
--    user object to the account ID."
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.connect_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Usuario dueño de la cuenta conectada (referencia a auth.users).
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    -- ID de la cuenta en Stripe (acct_...).
    stripe_account_id VARCHAR(255) UNIQUE NOT NULL,
    -- Datos usados al crear la cuenta (display_name, contact_email, country).
    display_name VARCHAR(255),
    contact_email VARCHAR(255),
    country VARCHAR(2) DEFAULT 'us',
    -- Estado de onboarding que actualiza el webhook de thin events.
    onboarding_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ----------------------------------------------------------------------------
-- 2. Registro de compras completadas (checkout.session.completed)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.connect_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checkout_session_id VARCHAR(255) UNIQUE NOT NULL,
    product_id VARCHAR(255),
    connected_account_id VARCHAR(255),
    amount_total INTEGER,
    currency VARCHAR(3),
    application_fee_amount INTEGER,
    customer_email VARCHAR(255),
    status VARCHAR(50) DEFAULT 'paid',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ----------------------------------------------------------------------------
-- RLS: los usuarios solo ven sus propias cuentas; el service_role gestiona todo.
-- ----------------------------------------------------------------------------
ALTER TABLE public.connect_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connect_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own connect accounts"
ON public.connect_accounts FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Service role manages connect accounts"
ON public.connect_accounts FOR ALL TO service_role
USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Service role manages connect orders"
ON public.connect_orders FOR ALL TO service_role
USING (TRUE) WITH CHECK (TRUE);

CREATE INDEX idx_connect_accounts_user ON public.connect_accounts(user_id);
CREATE INDEX idx_connect_orders_account ON public.connect_orders(connected_account_id);
