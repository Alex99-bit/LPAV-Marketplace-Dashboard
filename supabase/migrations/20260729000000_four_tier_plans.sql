-- ============================================================
-- MIGRATION: Sistema de 4 Paquetes con Comisiones Variables
-- Agrega: plan_type, commission_rate, conversion tracking,
--         requisitos de verificación, contrato
-- ============================================================

-- 1. AGREGAR COLUMNAS DE PLAN A agencies_tenants
ALTER TABLE public.agencies_tenants
    ADD COLUMN IF NOT EXISTS plan_type VARCHAR(50) DEFAULT 'Intermedio',
    ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2) NOT NULL DEFAULT 18.00,
    ADD COLUMN IF NOT EXISTS conversion_window_leads INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS conversion_window_sales INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS conversion_rate NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS preferential_rate_active BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS consecutive_months_below_threshold INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS contract_signed_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS contract_pdf_url TEXT,
    ADD COLUMN IF NOT EXISTS years_of_service INTEGER,
    ADD COLUMN IF NOT EXISTS has_physical_location BOOLEAN DEFAULT FALSE;

-- 2. CHECK CONSTRAINT para plan_type
ALTER TABLE public.agencies_tenants
    DROP CONSTRAINT IF EXISTS agencies_tenants_plan_type_check;
ALTER TABLE public.agencies_tenants
    ADD CONSTRAINT agencies_tenants_plan_type_check
    CHECK (plan_type IN ('Básico', 'Intermedio', 'Premium', 'Fundador'));

-- 3. CHECK CONSTRAINT para verification_status
ALTER TABLE public.agencies_tenants
    DROP CONSTRAINT IF EXISTS agencies_tenants_verification_status_check;
ALTER TABLE public.agencies_tenants
    ADD CONSTRAINT agencies_tenants_verification_status_check
    CHECK (verification_status IN ('pending', 'verified', 'rejected'));

-- 4. MIGRAR DATOS EXISTENTES
UPDATE public.agencies_tenants SET plan_type = 'Intermedio' WHERE subscription_tier = 'Comercial';
UPDATE public.agencies_tenants SET plan_type = 'Básico' WHERE subscription_tier = 'Gratuito';
UPDATE public.agencies_tenants SET plan_type = 'Premium' WHERE subscription_tier = 'Corporativo';
UPDATE public.agencies_tenants SET commission_rate = 18.00 WHERE plan_type = 'Intermedio';
UPDATE public.agencies_tenants SET commission_rate = 20.00 WHERE plan_type = 'Básico';
UPDATE public.agencies_tenants SET commission_rate = 15.00 WHERE plan_type = 'Premium';

-- 5. DROP OLD register_agency FUNCTION
DROP FUNCTION IF EXISTS public.register_agency(
    VARCHAR(255), VARCHAR(13), TEXT, TEXT, VARCHAR(100), VARCHAR(20),
    BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN
);

-- 6. CREATE UPGRADED register_agency FUNCTION WITH plan_type
CREATE OR REPLACE FUNCTION public.register_agency(
    p_business_name VARCHAR(255),
    p_rfc VARCHAR(13),
    p_address_text TEXT,
    p_fiscal_pdf_url TEXT,
    p_certification_key VARCHAR(100),
    p_plan_type VARCHAR(20),
    p_accept_no_refunds BOOLEAN,
    p_accept_ai_data_usage BOOLEAN,
    p_accept_nda BOOLEAN,
    p_accept_iva_disclaimer BOOLEAN DEFAULT FALSE
) RETURNS UUID AS $$
DECLARE
    v_tenant_id UUID;
    v_user_id UUID := auth.uid();
    v_commission_rate NUMERIC(5,2);
    v_fundador_count INTEGER;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado';
    END IF;

    IF (SELECT tenant_id FROM public.profiles WHERE id = v_user_id) IS NOT NULL THEN
        RAISE EXCEPTION 'Usuario ya pertenece a una agencia';
    END IF;

    -- Validate plan type
    IF p_plan_type NOT IN ('Básico', 'Intermedio', 'Premium', 'Fundador') THEN
        RAISE EXCEPTION 'Plan no válido. Opciones: Básico, Intermedio, Premium, Fundador';
    END IF;

    -- Plan Fundador: máximo 10 agencias
    IF p_plan_type = 'Fundador' THEN
        SELECT COUNT(*) INTO v_fundador_count
        FROM public.agencies_tenants
        WHERE plan_type = 'Fundador' AND verification_status = 'verified';

        IF v_fundador_count >= 10 THEN
            RAISE EXCEPTION 'Plan Fundador agotado. Solo 10 plazas disponibles.';
        END IF;
    END IF;

    -- Default commission rate by plan (IVA incluido)
    v_commission_rate := CASE p_plan_type
        WHEN 'Básico' THEN 20.00
        WHEN 'Intermedio' THEN 18.00
        WHEN 'Premium' THEN 15.00
        WHEN 'Fundador' THEN 7.50
    END;

    -- Validate legal acceptances (all mandatory)
    IF NOT p_accept_no_refunds THEN
        RAISE EXCEPTION 'Debes aceptar la cláusula de no reembolsos';
    END IF;

    IF NOT p_accept_ai_data_usage THEN
        RAISE EXCEPTION 'Debes aceptar el acuerdo de uso de datos para IA';
    END IF;

    IF NOT p_accept_nda THEN
        RAISE EXCEPTION 'Debes firmar el Convenio de Confidencialidad (NDA)';
    END IF;

    IF NOT p_accept_iva_disclaimer THEN
        RAISE EXCEPTION 'Debes aceptar el Compromiso de Precios con IVA';
    END IF;

    INSERT INTO public.agencies_tenants (
        business_name,
        rfc,
        address_text,
        fiscal_pdf_url,
        certification_key,
        plan_type,
        commission_rate,
        owner_user_id,
        status,
        verification_status,
        accept_no_refunds,
        accept_ai_data_usage,
        accept_nda,
        accept_iva_disclaimer,
        legal_acceptances_at
    ) VALUES (
        p_business_name,
        UPPER(p_rfc),
        p_address_text,
        p_fiscal_pdf_url,
        p_certification_key,
        p_plan_type,
        v_commission_rate,
        v_user_id,
        'En Revisión',
        'pending',
        TRUE,
        TRUE,
        TRUE,
        TRUE,
        NOW()
    ) RETURNING tenant_id INTO v_tenant_id;

    UPDATE public.profiles
    SET tenant_id = v_tenant_id, role_name = 'Agency_Admin'
    WHERE id = v_user_id;

    RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. FUNCIÓN DE EVALUACIÓN DE CONVERSIÓN (para pg_cron)
CREATE OR REPLACE FUNCTION public.evaluate_conversion_rates()
RETURNS void AS $$
DECLARE
    r RECORD;
    v_window_leads INTEGER;
    v_window_sales INTEGER;
    v_conversion_rate NUMERIC(5,2);
    v_new_rate NUMERIC(5,2);
    v_preferential_active BOOLEAN;
    v_consecutive_months INTEGER;
BEGIN
    FOR r IN (
        SELECT tenant_id, plan_type, commission_rate, preferential_rate_active,
               consecutive_months_below_threshold
        FROM public.agencies_tenants
        WHERE plan_type IN ('Intermedio', 'Premium')
          AND status = 'Activo'
    ) LOOP
        -- Contar leads generados en la ventana de 3 meses
        SELECT COUNT(*) INTO v_window_leads
        FROM public.crm_leads
        WHERE tenant_id = r.tenant_id
          AND created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '3 months';

        -- Contar ventas efectivas en la ventana de 3 meses
        SELECT COUNT(*) INTO v_window_sales
        FROM public.transactions_orders
        WHERE tenant_id = r.tenant_id
          AND created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '3 months'
          AND payment_status IN ('paid', 'partial_paid');

        -- Calcular tasa de conversión
        IF v_window_leads > 0 THEN
            v_conversion_rate := (v_window_sales::NUMERIC / v_window_leads::NUMERIC) * 100;
        ELSE
            v_conversion_rate := 0;
        END IF;

        -- Determinar si aplica tasa preferencial
        v_preferential_active := FALSE;
        v_new_rate := r.commission_rate;

        IF r.plan_type = 'Intermedio' AND v_conversion_rate >= 5 THEN
            v_preferential_active := TRUE;
            v_new_rate := 17.00;
        ELSIF r.plan_type = 'Premium' AND v_conversion_rate >= 8 THEN
            v_preferential_active := TRUE;
            v_new_rate := 12.00;
        END IF;

        -- Manejar meses consecutivos bajo umbral
        IF v_preferential_active = FALSE AND r.preferential_rate_active = TRUE THEN
            v_consecutive_months := r.consecutive_months_below_threshold + 1;
        ELSE
            v_consecutive_months := 0;
        END IF;

        -- Si 2+ meses bajo umbral, revertir a tasa base
        IF v_consecutive_months >= 2 THEN
            v_new_rate := CASE r.plan_type
                WHEN 'Intermedio' THEN 18.00
                WHEN 'Premium' THEN 15.00
            END;
            v_preferential_active := FALSE;
        END IF;

        -- Actualizar tenant
        UPDATE public.agencies_tenants
        SET conversion_window_leads = v_window_leads,
            conversion_window_sales = v_window_sales,
            conversion_rate = ROUND(v_conversion_rate, 2),
            commission_rate = v_new_rate,
            preferential_rate_active = v_preferential_active,
            consecutive_months_below_threshold = v_consecutive_months
        WHERE tenant_id = r.tenant_id;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. AGREGAR COLUMNA commission_rate_aplicado A fiscal_income_records PARA TRAZABILIDAD
ALTER TABLE public.fiscal_income_records
    ADD COLUMN IF NOT EXISTS commission_rate_applied NUMERIC(5,2);
