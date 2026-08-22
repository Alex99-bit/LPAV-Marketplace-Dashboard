-- ============================================================
-- MIGRATION: Corrección de Comisiones y Membresías
--  1) Limpieza del modelo de comisión legado (6% viajero / 8% agencia)
--  2) Trial de 30 días (Intermedio/Premium, una sola vez por tenant)
--  3) Continuidad Fundador (auto-migración Opción A)
--  4) Tabla platform_settings (toggle de solicitudes Fundador)
--  5) Agendado de cron jobs faltantes
-- ============================================================

-- ------------------------------------------------------------
-- 1. LIMPIEZA DEL MODELO DE COMISIÓN (un solo cargo: comisión de plataforma)
--    Se eliminan las columnas del modelo legado de fee dividido.
-- ------------------------------------------------------------
ALTER TABLE public.transactions_orders
    DROP COLUMN IF EXISTS traveler_service_fee,
    DROP COLUMN IF EXISTS agency_commission_fee;

-- Quitar 'service_fee' del enum de income_type (solo queda 'agency_commission',
-- que representa la comisión que Avimo percibe de la agencia vendedora).
ALTER TABLE public.fiscal_income_records
    DROP CONSTRAINT IF EXISTS fiscal_income_records_income_type_check;

ALTER TABLE public.fiscal_income_records
    ADD CONSTRAINT fiscal_income_records_income_type_check
    CHECK (income_type IN ('agency_commission'));

-- ------------------------------------------------------------
-- 2. TRIAL DE 30 DÍAS (una sola vez por tenant)
-- ------------------------------------------------------------
ALTER TABLE public.agencies_tenants
    ADD COLUMN IF NOT EXISTS trial_used_at TIMESTAMP WITH TIME ZONE;

-- ------------------------------------------------------------
-- 3. CONTINUIDAD FUNDADOR
-- ------------------------------------------------------------
ALTER TABLE public.agencies_tenants
    ADD COLUMN IF NOT EXISTS fundador_continuity_pending BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS fundador_continuity_active BOOLEAN NOT NULL DEFAULT FALSE;

-- ------------------------------------------------------------
-- 4. PLATFORM_SETTINGS (toggle de solicitudes Fundador)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SuperAdmin manages platform settings"
ON public.platform_settings FOR ALL TO authenticated
USING (public.get_current_user_role() = 'SuperAdmin')
WITH CHECK (public.get_current_user_role() = 'SuperAdmin');

-- Lectura pública (frontend necesita saber si el toggle está activo)
CREATE POLICY "Anyone reads platform settings"
ON public.platform_settings FOR SELECT TO authenticated
USING (TRUE);

INSERT INTO public.platform_settings (key, value)
VALUES ('fundador_requests_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ------------------------------------------------------------
-- 5. REESCRIBIR check_fundador_expirations()
--    Al vencer el año (día 365), marcar fundador_continuity_pending
--    para que la edge function fundador-continuity cree la suscripción.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_fundador_expirations()
RETURNS void AS $$
DECLARE
    r RECORD;
    v_days_since_activation NUMERIC;
    v_days_until_expiry NUMERIC;
    v_already_notified BOOLEAN;
BEGIN
    FOR r IN (
        SELECT tenant_id, business_name, owner_user_id, fundador_activated_at,
               fundador_continuity_pending, fundador_continuity_active
        FROM public.agencies_tenants
        WHERE plan_type = 'Fundador'
          AND fundador_activated_at IS NOT NULL
          AND fundador_request_status = 'approved'
          AND status = 'Activo'
    ) LOOP
        -- Días transcurridos desde la activación (cálculo exacto)
        v_days_since_activation := EXTRACT(EPOCH FROM (NOW() - r.fundador_activated_at)) / 86400.0;
        v_days_until_expiry := 365 - v_days_since_activation;

        -- 30 días antes: notificación de renovación
        IF v_days_until_expiry <= 30 AND v_days_until_expiry > 0 THEN
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
                    'Renovación Plan Fundador — ' || FLOOR(v_days_until_expiry)::INTEGER || ' días restantes',
                    'Tu año gratuito del Plan Fundador está por terminar. Tienes ' || FLOOR(v_days_until_expiry)::INTEGER || ' días para elegir tu plan de continuidad. Si no eliges, serás migrado automáticamente a Continuidad Fundador ($2,999/mes, comisión 7.5%).',
                    jsonb_build_object(
                        'tenant_id', r.tenant_id,
                        'days_remaining', FLOOR(v_days_until_expiry)::INTEGER,
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

        -- Vencimiento (día 365): marcar para auto-migración a Continuidad Fundador
        -- (la edge function fundador-continuity procesa este flag y crea la suscripción).
        IF v_days_since_activation >= 365
           AND r.fundador_continuity_pending = FALSE
           AND r.fundador_continuity_active = FALSE THEN

            UPDATE public.agencies_tenants
            SET fundador_continuity_pending = TRUE
            WHERE tenant_id = r.tenant_id;

            INSERT INTO public.notifications (user_id, type, title, message, metadata)
            VALUES (
                r.owner_user_id,
                'payment_received',
                'Continuidad Fundador — Migración automática',
                'Tu año gratuito del Plan Fundador ha finalizado. Serás migrado automáticamente a Continuidad Fundador ($2,999/mes, comisión 7.5%). Si no tienes un método de pago registrado, tendrás un periodo de gracia de 15 días.',
                jsonb_build_object(
                    'tenant_id', r.tenant_id,
                    'requires_billing', true,
                    'monthly_price', 2999
                )
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------
-- 6. AGENDAR CRON JOBS FALTANTES (pg_cron)
-- ------------------------------------------------------------
-- Evaluación de tasas preferenciales: primer día de cada mes (Secc 1.1.3)
SELECT cron.schedule(
    'evaluate-conversion-rates',
    '0 0 1 * *',
    'SELECT public.evaluate_conversion_rates();'
);

-- Vencimiento de Plan Fundador: diario
SELECT cron.schedule(
    'check-fundador-expirations',
    '0 0 * * *',
    'SELECT public.check_fundador_expirations();'
);
