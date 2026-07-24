-- ============================================================
-- MIGRATION: Fee Dividido (6% viajero / 8%+IVA agencia)
--            + Módulo de Contabilidad Fiscal SuperAdmin
-- ============================================================

-- PARTE 1: Columnas fiscales en transactions_orders
ALTER TABLE public.transactions_orders
    ADD COLUMN IF NOT EXISTS traveler_service_fee NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS agency_commission_fee NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS package_subtotal NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS package_iva NUMERIC(12,2) DEFAULT 0;

-- PARTE 2: Disclaimer IVA en agencies_tenants
ALTER TABLE public.agencies_tenants
    ADD COLUMN IF NOT EXISTS accept_iva_disclaimer BOOLEAN NOT NULL DEFAULT FALSE;

-- PARTE 3: Tablas de contabilidad fiscal
CREATE TABLE IF NOT EXISTS public.fiscal_income_records (
    income_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.transactions_orders(order_id) ON DELETE SET NULL,
    tenant_id UUID REFERENCES public.agencies_tenants(tenant_id) ON DELETE SET NULL,
    concept VARCHAR(255) NOT NULL,
    income_type VARCHAR(50) NOT NULL
        CHECK (income_type IN ('service_fee','agency_commission')),
    subtotal NUMERIC(12,2) NOT NULL,
    iva_amount NUMERIC(12,2) NOT NULL,
    total NUMERIC(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'MXN',
    stripe_fee NUMERIC(12,2) DEFAULT 0,
    stripe_fee_iva NUMERIC(12,2) DEFAULT 0,
    cfdi_status VARCHAR(50) DEFAULT 'pending'
        CHECK (cfdi_status IN ('pending','issued','cancelled')),
    cfdi_uuid VARCHAR(50),
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    fiscal_period_id UUID
);

CREATE TABLE IF NOT EXISTS public.fiscal_expense_records (
    expense_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    concept VARCHAR(255) NOT NULL,
    expense_category VARCHAR(50) NOT NULL
        CHECK (expense_category IN (
            'infrastructure','ai_api','salaries','rent',
            'software','marketing','legal_accounting','stripe_fees','other'
        )),
    provider_name VARCHAR(255),
    provider_rfc VARCHAR(13),
    subtotal NUMERIC(12,2) NOT NULL,
    iva_amount NUMERIC(12,2) NOT NULL,
    total NUMERIC(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'MXN',
    cfdi_status VARCHAR(50) DEFAULT 'pending'
        CHECK (cfdi_status IN ('pending','received','verified')),
    cfdi_uuid VARCHAR(50),
    cfdi_pdf_url TEXT,
    notes TEXT,
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    fiscal_period_id UUID
);

CREATE TABLE IF NOT EXISTS public.fiscal_periods (
    period_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('monthly','quarterly','annual')),
    period_label VARCHAR(50) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_income_subtotal NUMERIC(12,2) DEFAULT 0,
    total_income_iva NUMERIC(12,2) DEFAULT 0,
    total_expense_subtotal NUMERIC(12,2) DEFAULT 0,
    total_expense_iva NUMERIC(12,2) DEFAULT 0,
    iva_to_declare NUMERIC(12,2) DEFAULT 0,
    isr_base NUMERIC(12,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'open'
        CHECK (status IN ('open','closed','declared')),
    closed_at TIMESTAMPTZ,
    closed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_period UNIQUE (period_type, period_start, period_end)
);

-- PARTE 4: Índices
CREATE INDEX IF NOT EXISTS idx_fiscal_income_order
    ON public.fiscal_income_records(order_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_income_period
    ON public.fiscal_income_records(fiscal_period_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_income_created
    ON public.fiscal_income_records(recorded_at);
CREATE INDEX IF NOT EXISTS idx_fiscal_income_type
    ON public.fiscal_income_records(income_type);
CREATE INDEX IF NOT EXISTS idx_fiscal_expense_period
    ON public.fiscal_expense_records(fiscal_period_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_expense_category
    ON public.fiscal_expense_records(expense_category);
CREATE INDEX IF NOT EXISTS idx_fiscal_expense_created
    ON public.fiscal_expense_records(recorded_at);

-- PARTE 5: RLS — solo SuperAdmin
ALTER TABLE public.fiscal_income_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_expense_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SuperAdmin manages fiscal income"
ON public.fiscal_income_records FOR ALL TO authenticated
USING ((SELECT role_name FROM public.profiles WHERE id = auth.uid()) = 'SuperAdmin')
WITH CHECK ((SELECT role_name FROM public.profiles WHERE id = auth.uid()) = 'SuperAdmin');

CREATE POLICY "SuperAdmin manages fiscal expenses"
ON public.fiscal_expense_records FOR ALL TO authenticated
USING ((SELECT role_name FROM public.profiles WHERE id = auth.uid()) = 'SuperAdmin')
WITH CHECK ((SELECT role_name FROM public.profiles WHERE id = auth.uid()) = 'SuperAdmin');

CREATE POLICY "SuperAdmin manages fiscal periods"
ON public.fiscal_periods FOR ALL TO authenticated
USING ((SELECT role_name FROM public.profiles WHERE id = auth.uid()) = 'SuperAdmin')
WITH CHECK ((SELECT role_name FROM public.profiles WHERE id = auth.uid()) = 'SuperAdmin');

-- PARTE 6: RPCs fiscales
CREATE OR REPLACE FUNCTION public.calculate_period_totals(
    p_start DATE, p_end DATE
) RETURNS TABLE(
    income_subtotal NUMERIC, income_iva NUMERIC,
    expense_subtotal NUMERIC, expense_iva NUMERIC
) AS $$
BEGIN
    SELECT COALESCE(SUM(subtotal),0), COALESCE(SUM(iva_amount),0)
    INTO income_subtotal, income_iva
    FROM public.fiscal_income_records
    WHERE recorded_at::date BETWEEN p_start AND p_end;

    SELECT COALESCE(SUM(subtotal),0), COALESCE(SUM(iva_amount),0)
    INTO expense_subtotal, expense_iva
    FROM public.fiscal_expense_records
    WHERE recorded_at::date BETWEEN p_start AND p_end;

    RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.close_fiscal_period(
    p_period_id UUID
) RETURNS VOID AS $$
DECLARE
    v_start DATE; v_end DATE;
    v_inc_sub NUMERIC; v_inc_iva NUMERIC;
    v_exp_sub NUMERIC; v_exp_iva NUMERIC;
BEGIN
    SELECT period_start, period_end INTO v_start, v_end
    FROM public.fiscal_periods WHERE period_id = p_period_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Periodo no encontrado';
    END IF;

    SELECT income_subtotal, income_iva, expense_subtotal, expense_iva
    FROM public.calculate_period_totals(v_start, v_end)
    INTO v_inc_sub, v_inc_iva, v_exp_sub, v_exp_iva;

    UPDATE public.fiscal_periods SET
        total_income_subtotal = v_inc_sub,
        total_income_iva = v_inc_iva,
        total_expense_subtotal = v_exp_sub,
        total_expense_iva = v_exp_iva,
        iva_to_declare = v_inc_iva - v_exp_iva,
        isr_base = v_inc_sub - v_exp_sub,
        status = 'closed',
        closed_at = NOW(),
        closed_by = auth.uid()
    WHERE period_id = p_period_id;

    UPDATE public.fiscal_income_records
    SET fiscal_period_id = p_period_id
    WHERE recorded_at::date BETWEEN v_start AND v_end
    AND fiscal_period_id IS NULL;

    UPDATE public.fiscal_expense_records
    SET fiscal_period_id = p_period_id
    WHERE recorded_at::date BETWEEN v_start AND v_end
    AND fiscal_period_id IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
