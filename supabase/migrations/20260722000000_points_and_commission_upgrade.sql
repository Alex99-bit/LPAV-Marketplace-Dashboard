-- ============================================================
-- MIGRATION: Sistema de Puntos Avimo + Upgrade de Comisiones
-- Agrega: user_wallets, wallet_transactions, columns de puntos
-- Actualiza: comisión 13%+IVA, default plan Comercial, gracia 5d
-- ============================================================

-- 1. CARTERA VIRTUAL DE PUNTOS (1 punto = $1.00 MXN)
CREATE TABLE IF NOT EXISTS public.user_wallets (
    wallet_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    points_balance INTEGER NOT NULL DEFAULT 0
        CHECK (points_balance >= -200 AND points_balance <= 15000),
    max_balance_reached INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 2. BITÁCORA DE TRANSACCIONES DE PUNTOS
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES public.user_wallets(wallet_id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    type VARCHAR(20) NOT NULL
        CHECK (type IN ('earn','redeem','reversal','bonus','referral','review')),
    points INTEGER NOT NULL,
    description TEXT,
    reference_order_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 3. AGREGAR COLUMNAS DE PUNTOS A transactions_orders
ALTER TABLE public.transactions_orders
    ADD COLUMN IF NOT EXISTS points_earned INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS points_redeemed INTEGER DEFAULT 0;

-- 4. ACTUALIZAR DEFAULT DE subscription_tier EN agencies_tenants
ALTER TABLE public.agencies_tenants
    ALTER COLUMN subscription_tier SET DEFAULT 'Comercial';

-- 5. RLS POLICIES PARA CARTERAS
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Usuario solo puede leer su propia cartera
CREATE POLICY "User reads own wallet"
ON public.user_wallets FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Usuario solo puede leer sus propias transacciones
CREATE POLICY "User reads own wallet transactions"
ON public.wallet_transactions FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Service role tiene acceso completo
CREATE POLICY "Service manages wallets"
ON public.user_wallets FOR ALL TO service_role
USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Service manages wallet transactions"
ON public.wallet_transactions FOR ALL TO service_role
USING (TRUE) WITH CHECK (TRUE);

-- 6. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_wallet_user
    ON public.user_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_user
    ON public.wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_order
    ON public.wallet_transactions(reference_order_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_type
    ON public.wallet_transactions(type);

-- 7. TRIGGER para actualizar updated_at en user_wallets
CREATE OR REPLACE FUNCTION public.update_wallet_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_wallet_timestamp ON public.user_wallets;
CREATE TRIGGER trg_update_wallet_timestamp
    BEFORE UPDATE ON public.user_wallets
    FOR EACH ROW EXECUTE FUNCTION public.update_wallet_timestamp();

-- 8. FUNCIÓN RPC: obtener o crear cartera del usuario
CREATE OR REPLACE FUNCTION public.get_or_create_wallet(p_user_id UUID)
RETURNS SETOF public.user_wallets AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.user_wallets WHERE user_id = p_user_id) THEN
        INSERT INTO public.user_wallets (user_id) VALUES (p_user_id);
    END IF;
    RETURN QUERY SELECT * FROM public.user_wallets WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. FUNCIÓN RPC: acreditar puntos (con tope 15,000 y notificación de excedente)
CREATE OR REPLACE FUNCTION public.credit_points(
    p_user_id UUID,
    p_points INTEGER,
    p_type VARCHAR(20),
    p_description TEXT DEFAULT NULL,
    p_reference_order_id UUID DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    v_wallet_id UUID;
    v_current_balance INTEGER;
    v_new_balance INTEGER;
    v_credited INTEGER;
BEGIN
    SELECT wallet_id, points_balance INTO v_wallet_id, v_current_balance
    FROM public.user_wallets WHERE user_id = p_user_id;

    IF NOT FOUND THEN
        INSERT INTO public.user_wallets (user_id) VALUES (p_user_id)
        RETURNING wallet_id INTO v_wallet_id;
        v_current_balance := 0;
    END IF;

    v_new_balance := v_current_balance + p_points;

    IF v_new_balance > 15000 THEN
        v_credited := 15000 - v_current_balance;
        v_new_balance := 15000;
    ELSE
        v_credited := p_points;
    END IF;

    UPDATE public.user_wallets
    SET points_balance = v_new_balance,
        max_balance_reached = GREATEST(max_balance_reached, v_new_balance)
    WHERE wallet_id = v_wallet_id;

    INSERT INTO public.wallet_transactions
        (wallet_id, user_id, type, points, description, reference_order_id)
    VALUES
        (v_wallet_id, p_user_id, p_type, v_credited, p_description, p_reference_order_id);

    RETURN v_credited;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. FUNCIÓN RPC: debitar puntos (canje o reversión, permite saldo negativo hasta -200)
CREATE OR REPLACE FUNCTION public.debit_points(
    p_user_id UUID,
    p_points INTEGER,
    p_type VARCHAR(20),
    p_description TEXT DEFAULT NULL,
    p_reference_order_id UUID DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    v_wallet_id UUID;
    v_current_balance INTEGER;
    v_new_balance INTEGER;
BEGIN
    SELECT wallet_id, points_balance INTO v_wallet_id, v_current_balance
    FROM public.user_wallets WHERE user_id = p_user_id;

    IF NOT FOUND THEN
        INSERT INTO public.user_wallets (user_id) VALUES (p_user_id)
        RETURNING wallet_id INTO v_wallet_id;
        v_current_balance := 0;
    END IF;

    v_new_balance := v_current_balance - p_points;

    IF v_new_balance < -200 THEN
        RAISE EXCEPTION 'Saldo insuficiente: no puede exceder -200 puntos';
    END IF;

    UPDATE public.user_wallets
    SET points_balance = v_new_balance
    WHERE wallet_id = v_wallet_id;

    INSERT INTO public.wallet_transactions
        (wallet_id, user_id, type, points, description, reference_order_id)
    VALUES
        (v_wallet_id, p_user_id, p_type, -ABS(p_points), p_description, p_reference_order_id);

    RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
