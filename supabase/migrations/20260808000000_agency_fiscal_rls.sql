-- ============================================================
-- MIGRATION: Acceso de Agencia a Registros Fiscales
-- Agrega: RLS para agencias en fiscal_income_records,
--         tenant_id y created_by en fiscal_expense_records,
--         politica RLS para que agencias registren gastos propios
-- ============================================================

-- 1. AGREGAR COLUMNAS DE TENANT A fiscal_expense_records
ALTER TABLE public.fiscal_expense_records
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.agencies_tenants(tenant_id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_fiscal_expense_tenant
    ON public.fiscal_expense_records(tenant_id);

-- 2. AGREGAR COLUMNAS DE CFDI A fiscal_income_records
ALTER TABLE public.fiscal_income_records
    ADD COLUMN IF NOT EXISTS cfdi_pdf_url TEXT,
    ADD COLUMN IF NOT EXISTS cfdi_xml_url TEXT;

-- 3. AGREGAR RLS PARA AGENCIAS EN fiscal_income_records
-- La agencia puede VER solo sus propios registros
CREATE POLICY "Agency views own fiscal income"
ON public.fiscal_income_records FOR SELECT TO authenticated
USING (
    tenant_id IN (
        SELECT tenant_id FROM public.profiles
        WHERE id = auth.uid() AND tenant_id IS NOT NULL
    )
);

-- 4. AGREGAR RLS PARA AGENCIAS EN fiscal_expense_records
-- La agencia puede VER y CREAR sus propios gastos
CREATE POLICY "Agency views own fiscal expenses"
ON public.fiscal_expense_records FOR SELECT TO authenticated
USING (
    tenant_id IN (
        SELECT tenant_id FROM public.profiles
        WHERE id = auth.uid() AND tenant_id IS NOT NULL
    )
    OR
    public.get_current_user_role() = 'SuperAdmin'
);

CREATE POLICY "Agency inserts own fiscal expenses"
ON public.fiscal_expense_records FOR INSERT TO authenticated
WITH CHECK (
    tenant_id IN (
        SELECT tenant_id FROM public.profiles
        WHERE id = auth.uid() AND tenant_id IS NOT NULL
    )
);

-- 5. AGREGAR RPC: timbrar_cfdi_ingreso — timbra CFDI para un registro fiscal existente
-- (invocado por la agencia bajo demanda)
CREATE OR REPLACE FUNCTION public.timbrar_cfdi_ingreso(
    p_income_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_income RECORD;
    v_tenant RECORD;
    v_tenant_user_id UUID := auth.uid();
BEGIN
    -- Verificar que el usuario pertenece al tenant del ingreso
    SELECT fir.* INTO v_income
    FROM public.fiscal_income_records fir
    WHERE fir.income_id = p_income_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Registro de ingreso no encontrado';
    END IF;

    -- Verificar pertenencia al tenant
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = v_tenant_user_id
          AND tenant_id = v_income.tenant_id
    ) THEN
        RAISE EXCEPTION 'No autorizado para timbrar este CFDI';
    END IF;

    -- Verificar que no tenga CFDI previo
    IF v_income.cfdi_status = 'issued' AND v_income.cfdi_uuid IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_issued', true,
            'cfdi_uuid', v_income.cfdi_uuid,
            'cfdi_pdf_url', v_income.cfdi_pdf_url,
            'cfdi_xml_url', v_income.cfdi_xml_url
        );
    END IF;

    -- Obtener datos del tenant para el CFDI
    SELECT rfc, business_name, address_text INTO v_tenant
    FROM public.agencies_tenants
    WHERE tenant_id = v_income.tenant_id;

    -- Retornar datos para que el edge function de Facturama complete el timbrado
    RETURN jsonb_build_object(
        'success', true,
        'ready_to_stamp', true,
        'income_id', p_income_id,
        'tenant_id', v_income.tenant_id,
        'concept', v_income.concept,
        'subtotal', v_income.subtotal,
        'business_name', v_tenant.business_name,
        'rfc', v_tenant.rfc,
        'address_text', v_tenant.address_text
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
