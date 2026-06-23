-- ============================================================
-- FUNCIONES DE BASE DE DATOS, TRIGGERS Y CRON JOBS
-- ============================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ------------------------------------------------------------
-- ÍNDICE PARA RATE LIMITING DE IA (user_behavior_logs)
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_behavior_user_event_time
  ON public.user_behavior_logs (user_id, event_type, created_at DESC);

-- ------------------------------------------------------------
-- 1. CENSURA DE MENSAJES DEL CHAT IN-APP
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sanitize_chat_message()
RETURNS TRIGGER AS $$
DECLARE
  v_strikes INT;
  v_contains_contact BOOLEAN := FALSE;
BEGIN
  -- Verificar si el usuario ya esta baneado (5+ strikes)
  SELECT censorship_strikes INTO v_strikes
    FROM public.profiles WHERE id = NEW.sender_id;

  IF v_strikes >= 5 THEN
    RAISE EXCEPTION 'Usuario bloqueado por acumular 5 infracciones de contacto.' USING ERRCODE = 'CK001';
  END IF;

  -- Escanear patrones de contacto: telefonos, emails
  IF NEW.message_text ~ '\+?\d{10,13}' THEN
    v_contains_contact := TRUE;
  END IF;

  IF NEW.message_text ~ '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}' THEN
    v_contains_contact := TRUE;
  END IF;

  -- Patrones de evasion semantica (numeros escritos con palabras)
  -- Ej: "cinco cinco cinco uno dos tres cuatro cinco seis siete"
  IF NEW.message_text ~* '(uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|cero)[\s-]*(uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|cero)[\s-]*(uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|cero)[\s-]*(uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|cero)' THEN
    v_contains_contact := TRUE;
  END IF;

  -- Patrones de evasion semantica (digitos espaciados con caracteres)
  -- Ej: "5-5-5-1-2-3-4-5-6-7" or "5 5 5 1 2 3 4 5 6 7"
  IF NEW.message_text ~ '\d[\s.-]+\d[\s.-]+\d[\s.-]+\d[\s.-]+\d[\s.-]+\d[\s.-]+\d[\s.-]+\d[\s.-]+\d' THEN
    v_contains_contact := TRUE;
  END IF;

  IF v_contains_contact THEN
    -- Incrementar contador de infracciones
    UPDATE public.profiles
      SET censorship_strikes = v_strikes + 1
      WHERE id = NEW.sender_id;

    -- Si alcanza exactamente 5 strikes, bloquear este mensaje
    IF v_strikes + 1 >= 5 THEN
      RAISE EXCEPTION 'Usuario bloqueado por acumular 5 infracciones de contacto.' USING ERRCODE = 'CK001';
    END IF;

    -- Censurar el mensaje reemplazandolo con asteriscos
    NEW.message_text := '***';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS before_chat_message_insert ON public.chat_messages;
CREATE TRIGGER before_chat_message_insert
  BEFORE INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.sanitize_chat_message();

-- ------------------------------------------------------------
-- 2. CICLO DE VIDA DE PAQUETES DE VIAJE (EXPIRACION)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.expire_travel_packages()
RETURNS void AS $$
BEGIN
  -- Publicados -> Concluidos cuando la fecha de salida ya paso
  UPDATE public.travel_packages
    SET publication_status = 'concluded'
    WHERE publication_status = 'published'
      AND departure_date < TIMEZONE('utc', NOW());

  -- Concluidos -> Archivados despues de 365 dias
  UPDATE public.travel_packages
    SET publication_status = 'archived'
    WHERE publication_status = 'concluded'
      AND created_at < TIMEZONE('utc', NOW()) - INTERVAL '365 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------
-- 3. CONTROL DE MOROSIDAD EN PAGOS DIFERIDOS
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_payment_morosity()
RETURNS void AS $$
BEGIN
  -- Cancelar ordenes que excedieron el periodo de gracia de 14 dias naturales
  UPDATE public.transactions_orders
    SET payment_status = 'cancelled'
    WHERE payment_status IN ('pending', 'partial_paid')
      AND next_payment_due IS NOT NULL
      AND next_payment_due + INTERVAL '14 days' < TIMEZONE('utc', NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------
-- 4. INVALIDACION DE CACHE DE ITINERARIOS IA
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.invalidate_itinerary_cache()
RETURNS TRIGGER AS $$
BEGIN
  -- Si el paquete fue editado, eliminar su cache de itinerarios
  IF (OLD.title <> NEW.title) OR
     (OLD.region <> NEW.region) OR
     (OLD.price <> NEW.price) OR
     (OLD.departure_date <> NEW.departure_date) THEN
    DELETE FROM public.cached_itineraries WHERE package_id = NEW.package_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_travel_package_update ON public.travel_packages;
CREATE TRIGGER on_travel_package_update
  AFTER UPDATE ON public.travel_packages
  FOR EACH ROW EXECUTE FUNCTION public.invalidate_itinerary_cache();

-- ------------------------------------------------------------
-- 5. REGISTRO AUTOMATICO DE ROL Agency_Admin PARA NUEVA AGENCIA
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_agency()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.custom_roles_permissions (
    tenant_id,
    role_name,
    can_manage_catalog,
    can_view_global_leads,
    can_manage_finance,
    can_manage_chat
  ) VALUES (
    NEW.tenant_id,
    'Agency_Admin',
    TRUE,
    TRUE,
    TRUE,
    TRUE
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_agency_created ON public.agencies_tenants;
CREATE TRIGGER on_agency_created
  AFTER INSERT ON public.agencies_tenants
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_agency();

-- ------------------------------------------------------------
-- PROGRAMACION DE CRON JOBS (pg_cron)
-- ------------------------------------------------------------
-- Ejecutar expiracion de paquetes diariamente a la medianoche UTC
SELECT cron.schedule(
  'expire-travel-packages',
  '0 0 * * *',
  'SELECT public.expire_travel_packages();'
);

-- Ejecutar control de morosidad diariamente a la medianoche UTC
SELECT cron.schedule(
  'check-payment-morosity',
  '0 0 * * *',
  'SELECT public.check_payment_morosity();'
);
