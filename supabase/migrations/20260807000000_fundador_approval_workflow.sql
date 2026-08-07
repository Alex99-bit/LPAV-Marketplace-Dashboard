-- ============================================================
-- MIGRATION: Flujo de Aprobación del Plan Fundador
-- Agrega: fundador_request_status, fundador_requested_at,
--         fundador_activated_at, approve_fundador RPC,
--         check_fundador_expirations, register_agency actualizado
-- ============================================================

-- 1. AGREGAR COLUMNAS DE FUNDADOR A agencies_tenants
ALTER TABLE public.agencies_tenants
    ADD COLUMN IF NOT EXISTS fundador_request_status VARCHAR(50) DEFAULT 'none',
    ADD COLUMN IF NOT EXISTS fundador_requested_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS fundador_activated_at TIMESTAMP WITH TIME ZONE;

-- 2. CHECK CONSTRAINT para fundador_request_status
ALTER TABLE public.agencies_tenants
    DROP CONSTRAINT IF EXISTS agencies_tenants_fundador_request_status_check;
ALTER TABLE public.agencies_tenants
    ADD CONSTRAINT agencies_tenants_fundador_request_status_check
    CHECK (fundador_request_status IN ('none', 'pending', 'approved', 'rejected'));

-- 3. DROP OLD register_agency FUNCTION (versión con 11 params de four_tier_plans)
DROP FUNCTION IF EXISTS public.register_agency(
    VARCHAR(255), VARCHAR(13), TEXT, TEXT, VARCHAR(100), VARCHAR(20),
    BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN
);

-- 4. ACTUALIZAR register_agency: Fundador entra como Básico con solicitud pendiente
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
    v_effective_plan VARCHAR(50);
    v_fundador_request VARCHAR(50) := 'none';
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

    -- Plan Fundador: verificar disponibilidad y marcar como solicitud pendiente
    -- La agencia ingresa como Plan Básico hasta que el SuperAdmin apruebe
    IF p_plan_type = 'Fundador' THEN
        SELECT COUNT(*) INTO v_fundador_count
        FROM public.agencies_tenants
        WHERE plan_type = 'Fundador' AND verification_status = 'verified';

        IF v_fundador_count >= 10 THEN
            RAISE EXCEPTION 'Plan Fundador agotado. Solo 10 plazas disponibles.';
        END IF;

        v_effective_plan := 'Básico';
        v_fundador_request := 'pending';
    ELSE
        v_effective_plan := p_plan_type;
    END IF;

    -- Default commission rate by plan (IVA incluido)
    -- Fundador entra como Básico temporalmente (20%), se ajusta al aprobar
    v_commission_rate := CASE v_effective_plan
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
        legal_acceptances_at,
        fundador_request_status,
        fundador_requested_at
    ) VALUES (
        p_business_name,
        UPPER(p_rfc),
        p_address_text,
        p_fiscal_pdf_url,
        p_certification_key,
        v_effective_plan,
        v_commission_rate,
        v_user_id,
        'En Revisión',
        'pending',
        TRUE,
        TRUE,
        TRUE,
        TRUE,
        NOW(),
        v_fundador_request,
        CASE WHEN v_fundador_request = 'pending' THEN NOW() ELSE NULL END
    ) RETURNING tenant_id INTO v_tenant_id;

    UPDATE public.profiles
    SET tenant_id = v_tenant_id, role_name = 'Agency_Admin'
    WHERE id = v_user_id;

    RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. NUEVO RPC: approve_fundador (solo SuperAdmin)
-- Aprueba o rechaza una solicitud de Plan Fundador
CREATE OR REPLACE FUNCTION public.approve_fundador(
    p_tenant_id UUID,
    p_approved BOOLEAN,
    p_admin_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_agency RECORD;
    v_fundador_count INTEGER;
BEGIN
    -- Verificar que el llamante es SuperAdmin
    IF NOT (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid()) THEN
        RAISE EXCEPTION 'Solo el SuperAdmin puede aprobar solicitudes Fundador';
    END IF;

    SELECT * INTO v_agency
    FROM public.agencies_tenants
    WHERE tenant_id = p_tenant_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Agencia no encontrada';
    END IF;

    IF v_agency.fundador_request_status != 'pending' THEN
        RAISE EXCEPTION 'Esta agencia no tiene una solicitud Fundador pendiente';
    END IF;

    IF p_approved THEN
        -- Verificar que aún hay plazas disponibles
        SELECT COUNT(*) INTO v_fundador_count
        FROM public.agencies_tenants
        WHERE plan_type = 'Fundador'
          AND verification_status = 'verified'
          AND tenant_id != p_tenant_id;

        IF v_fundador_count >= 10 THEN
            RAISE EXCEPTION 'Plan Fundador agotado. Ya existen 10 agencias Fundador verificadas.';
        END IF;

        -- Aprobar: cambiar a Plan Fundador
        UPDATE public.agencies_tenants
        SET plan_type = 'Fundador',
            commission_rate = 7.50,
            fundador_request_status = 'approved',
            fundador_activated_at = NOW()
        WHERE tenant_id = p_tenant_id;

        -- Notificar a la agencia
        INSERT INTO public.notifications (user_id, type, title, message, metadata)
        VALUES (
            v_agency.owner_user_id,
            'package_approved',
            'Plan Fundador Aprobado',
            'Tu solicitud de Plan Fundador ha sido aprobada. Disfruta de comisión 7.5% y todos los beneficios Premium sin costo por 1 año.',
            jsonb_build_object(
                'tenant_id', p_tenant_id,
                'plan_type', 'Fundador',
                'commission_rate', 7.50,
                'admin_notes', p_admin_notes
            )
        );

        RETURN jsonb_build_object(
            'success', true,
            'action', 'approved',
            'plan_type', 'Fundador',
            'commission_rate', 7.50,
            'fundador_activated_at', NOW()
        );
    ELSE
        -- Rechazar solicitud
        UPDATE public.agencies_tenants
        SET fundador_request_status = 'rejected'
        WHERE tenant_id = p_tenant_id;

        -- Notificar a la agencia
        INSERT INTO public.notifications (user_id, type, title, message, metadata)
        VALUES (
            v_agency.owner_user_id,
            'package_reported',
            'Solicitud Fundador Rechazada',
            'Tu solicitud de Plan Fundador no fue aprobada. Continúas en tu plan actual. Contacta a soporte para más información.',
            jsonb_build_object(
                'tenant_id', p_tenant_id,
                'admin_notes', p_admin_notes
            )
        );

        RETURN jsonb_build_object(
            'success', true,
            'action', 'rejected',
            'plan_type', v_agency.plan_type
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. NUEVO RPC: check_fundador_expirations (para pg_cron, ejecutar diariamente)
-- Notifica a agencias Fundador próximas a vencer y aplica transición automática
CREATE OR REPLACE FUNCTION public.check_fundador_expirations()
RETURNS void AS $$
DECLARE
    r RECORD;
    v_days_until_expiry INTEGER;
    v_already_notified BOOLEAN;
BEGIN
    FOR r IN (
        SELECT tenant_id, business_name, owner_user_id, fundador_activated_at
        FROM public.agencies_tenants
        WHERE plan_type = 'Fundador'
          AND fundador_activated_at IS NOT NULL
          AND fundador_request_status = 'approved'
          AND status = 'Activo'
    ) LOOP
        -- Días desde activación hasta hoy
        v_days_until_expiry := 365 - EXTRACT(DAY FROM (NOW() - r.fundador_activated_at));

        -- 30 días antes: enviar notificación de renovación
        IF v_days_until_expiry <= 30 AND v_days_until_expiry > 0 THEN
            -- Verificar si ya se notificó (evitar duplicados)
            SELECT EXISTS (
                SELECT 1 FROM public.notifications
                WHERE user_id = r.owner_user_id
                  AND type = 'package_reported'
                  AND title LIKE 'Renovación Plan Fundador%'
                  AND created_at > NOW() - INTERVAL '25 days'
            ) INTO v_already_notified;

            IF NOT v_already_notified THEN
                INSERT INTO public.notifications (user_id, type, title, message, metadata)
                VALUES (
                    r.owner_user_id,
                    'package_reported',
                    'Renovación Plan Fundador — ' || v_days_until_expiry || ' días restantes',
                    'Tu año gratuito del Plan Fundador está por terminar. Tienes ' || v_days_until_expiry || ' días para elegir tu plan de continuidad. Serás migrado automáticamente a Continuidad Fundador ($2,999/mes, comisión 7.5%).',
                    jsonb_build_object(
                        'tenant_id', r.tenant_id,
                        'days_remaining', v_days_until_expiry,
                        'options', jsonb_build_array(
                            'Continuidad Fundador ($2,999/mes, comisión 7.5%)',
                            'Premium ($2,999/mes, comisión 15%)',
                            'Intermedio ($1,799/mes, comisión 18%)',
                            'Básico ($0/mes, comisión 20%)'
                        )
                    )
                );
            END IF;
        END IF;

        -- Después de 13 meses (1 año + 30 días de gracia): migración automática
        -- a Continuidad Fundador (mismos beneficios, $2,999/mes)
        IF EXTRACT(DAY FROM (NOW() - r.fundador_activated_at)) > 395 THEN
            -- La agencia sigue como Fundador pero ahora debe pagar
            -- La migración a Stripe Billing se maneja cuando el admin configura el pago
            -- Por ahora, mantenemos el plan y comisión, la facturación se activa manualmente
            -- El sistema no cambia automáticamente el plan_type; la agencia conserva Fundador
            -- pero debe configurar Stripe Billing para empezar a pagar $2,999/mes

            -- Notificar que se requiere acción de pago
            SELECT EXISTS (
                SELECT 1 FROM public.notifications
                WHERE user_id = r.owner_user_id
                  AND type = 'payment_received'
                  AND title LIKE 'Acción requerida%'
                  AND created_at > NOW() - INTERVAL '7 days'
            ) INTO v_already_notified;

            IF NOT v_already_notified THEN
                INSERT INTO public.notifications (user_id, type, title, message, metadata)
                VALUES (
                    r.owner_user_id,
                    'payment_received',
                    'Acción requerida — Configura tu facturación Fundador',
                    'Tu año gratuito del Plan Fundador ha finalizado. Para continuar con tus beneficios (comisión 7.5%), debes configurar tu método de pago. La mensualidad es de $2,999 MXN. Ve a Configuración > Plan para activar tu suscripción.',
                    jsonb_build_object(
                        'tenant_id', r.tenant_id,
                        'requires_billing', true,
                        'monthly_price', 2999
                    )
                );
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. ACTUALIZAR evaluate_conversion_rates PARA EXCLUIR FUNDADOR
-- (Fundador tiene tasa fija 7.5%, no participa en preferenciales)
-- La versión actual ya filtra WHERE plan_type IN ('Intermedio', 'Premium'),
-- así que Fundador ya está excluido. No se requiere cambio.
