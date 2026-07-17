-- ============================================================
-- MIGRATION: Upgrade agency registration flow
-- Adds: subscription_tier param, legal acceptances, post-registro flags
-- ============================================================

-- 1. Drop old register_agency function
DROP FUNCTION IF EXISTS public.register_agency(
    VARCHAR(255), VARCHAR(13), TEXT, TEXT, VARCHAR(100)
);

-- 2. Create upgraded register_agency function
CREATE OR REPLACE FUNCTION public.register_agency(
    p_business_name VARCHAR(255),
    p_rfc VARCHAR(13),
    p_address_text TEXT,
    p_fiscal_pdf_url TEXT,
    p_certification_key VARCHAR(100),
    p_subscription_tier VARCHAR(20),
    p_accept_no_refunds BOOLEAN,
    p_accept_ai_data_usage BOOLEAN,
    p_accept_nda BOOLEAN
) RETURNS UUID AS $$
DECLARE
    v_tenant_id UUID;
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado';
    END IF;

    IF (SELECT tenant_id FROM public.profiles WHERE id = v_user_id) IS NOT NULL THEN
        RAISE EXCEPTION 'Usuario ya pertenece a una agencia';
    END IF;

    -- Validate subscription tier
    IF p_subscription_tier NOT IN ('Gratuito', 'Comercial', 'Corporativo') THEN
        RAISE EXCEPTION 'Plan de suscripción no válido';
    END IF;

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

    INSERT INTO public.agencies_tenants (
        business_name,
        rfc,
        address_text,
        fiscal_pdf_url,
        certification_key,
        subscription_tier,
        owner_user_id,
        status,
        accept_no_refunds,
        accept_ai_data_usage,
        accept_nda,
        legal_acceptances_at
    ) VALUES (
        p_business_name,
        UPPER(p_rfc),
        p_address_text,
        p_fiscal_pdf_url,
        p_certification_key,
        p_subscription_tier,
        v_user_id,
        'En Revisión',
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

-- 3. Add new columns to agencies_tenants
ALTER TABLE public.agencies_tenants
    ADD COLUMN IF NOT EXISTS accept_no_refunds BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS accept_ai_data_usage BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS accept_nda BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS legal_acceptances_at TIMESTAMPTZ;

-- 4. Create storage bucket for fiscal documents if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('fiscal-documents', 'fiscal-documents', false)
ON CONFLICT (id) DO NOTHING;

-- 5. RLS policy: agencies can upload their own fiscal docs
CREATE POLICY "Agency can upload own fiscal documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'fiscal-documents'
    AND (storage.foldername(name))[1] = (
        SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid()
    )
);

-- 6. RLS policy: agencies can read their own fiscal docs
CREATE POLICY "Agency can read own fiscal documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'fiscal-documents'
    AND (storage.foldername(name))[1] = (
        SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid()
    )
);
