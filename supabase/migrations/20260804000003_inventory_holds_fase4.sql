-- ============================================================
-- FASE 4: Inventory Holds (race conditions en checkout),
--         inventory-first constraint, limpieza de holds
-- ============================================================

-- 1. TABLA DE HOLDS DE INVENTARIO (reserva temporal durante checkout)
CREATE TABLE public.inventory_holds (
    hold_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES public.travel_packages(package_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    units_held INTEGER NOT NULL DEFAULT 1 CHECK (units_held > 0),
    expires_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'released', 'consumed')),
    stripe_session_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

COMMENT ON TABLE public.inventory_holds IS 'Reservas temporales de inventario durante checkout para prevenir race conditions';

CREATE INDEX IF NOT EXISTS idx_inventory_holds_expires
  ON public.inventory_holds (status, expires_at)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_inventory_holds_user_pkg
  ON public.inventory_holds (user_id, package_id, status);

-- 2. RPC: CREAR HOLD DE INVENTARIO
CREATE OR REPLACE FUNCTION public.create_inventory_hold(
  p_package_id UUID,
  p_user_id UUID,
  p_units INTEGER DEFAULT 1,
  p_hold_minutes INTEGER DEFAULT 15
) RETURNS UUID AS $$
DECLARE
  v_hold_id UUID;
  v_available INTEGER;
BEGIN
  SELECT available_rooms INTO v_available
    FROM public.travel_packages
    WHERE package_id = p_package_id
      AND total_rooms > 0
    FOR UPDATE;

  IF v_available IS NULL THEN
    RAISE EXCEPTION 'Package not found or has no inventory limit';
  END IF;

  IF v_available < p_units THEN
    RAISE EXCEPTION 'Insufficient inventory';
  END IF;

  INSERT INTO public.inventory_holds (
    package_id, user_id, units_held, expires_at, status
  ) VALUES (
    p_package_id, p_user_id, p_units,
    timezone('utc', now()) + (p_hold_minutes || ' minutes')::INTERVAL,
    'active'
  ) RETURNING hold_id INTO v_hold_id;

  UPDATE public.travel_packages
    SET available_rooms = available_rooms - p_units
    WHERE package_id = p_package_id;

  INSERT INTO public.inventory_audit_log (
    package_id, change_type, rooms_before, rooms_after, changed_by, metadata
  ) VALUES (
    p_package_id, 'manual_adjustment', v_available, v_available - p_units, p_user_id,
    jsonb_build_object('hold_id', v_hold_id, 'units_held', p_units, 'action', 'hold_created')
  );

  RETURN v_hold_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RPC: CONSUMIR HOLD (tras pago exitoso)
CREATE OR REPLACE FUNCTION public.consume_inventory_hold(
  p_hold_id UUID,
  p_stripe_session_id VARCHAR DEFAULT NULL
) RETURNS void AS $$
BEGIN
  UPDATE public.inventory_holds
    SET status = 'consumed',
        stripe_session_id = p_stripe_session_id
    WHERE hold_id = p_hold_id
      AND status = 'active'
      AND expires_at > timezone('utc', now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RPC: LIBERAR HOLD (por timeout o cancelación)
CREATE OR REPLACE FUNCTION public.release_inventory_hold(p_hold_id UUID)
RETURNS void AS $$
DECLARE
  v_rec RECORD;
  v_available INTEGER;
BEGIN
  SELECT package_id, units_held INTO v_rec
    FROM public.inventory_holds
    WHERE hold_id = p_hold_id AND status = 'active';

  IF v_rec.package_id IS NULL THEN
    RETURN;
  END IF;

  SELECT available_rooms INTO v_available
    FROM public.travel_packages
    WHERE package_id = v_rec.package_id AND total_rooms > 0;

  IF v_available IS NOT NULL THEN
    UPDATE public.travel_packages
      SET available_rooms = LEAST(total_rooms, available_rooms + v_rec.units_held)
      WHERE package_id = v_rec.package_id;

    INSERT INTO public.inventory_audit_log (
      package_id, change_type, rooms_before, rooms_after, metadata
    ) VALUES (
      v_rec.package_id, 'manual_adjustment', v_available,
      LEAST(v_available + v_rec.units_held, (
        SELECT total_rooms FROM public.travel_packages WHERE package_id = v_rec.package_id
      )),
      jsonb_build_object('hold_id', p_hold_id, 'action', 'hold_released')
    );
  END IF;

  UPDATE public.inventory_holds
    SET status = 'released'
    WHERE hold_id = p_hold_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. FUNCIÓN CRON: LIMPIAR HOLDS EXPIRADOS
CREATE OR REPLACE FUNCTION public.cleanup_expired_holds()
RETURNS void AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT hold_id, package_id, units_held
    FROM public.inventory_holds
    WHERE status = 'active' AND expires_at <= timezone('utc', now())
  ) LOOP
    PERFORM public.release_inventory_hold(r.hold_id);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT cron.schedule(
  'cleanup-expired-holds',
  '* * * * *',
  'SELECT public.cleanup_expired_holds();'
);

-- 6. INVENTORY-FIRST: publicar solo si hay inventario configurado
CREATE OR REPLACE FUNCTION public.enforce_inventory_first()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.publication_status = 'published'
     AND NEW.total_rooms > 0
     AND NEW.available_rooms <= 0 THEN
    RAISE EXCEPTION 'No se puede publicar un paquete con inventario agotado'
      USING ERRCODE = 'CK002';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS before_travel_package_publish ON public.travel_packages;
CREATE TRIGGER before_travel_package_publish
  BEFORE UPDATE ON public.travel_packages
  FOR EACH ROW
  WHEN (NEW.publication_status = 'published')
  EXECUTE FUNCTION public.enforce_inventory_first();

-- 7. HABILITAR RLS EN inventory_holds
ALTER TABLE public.inventory_holds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven sus propios holds" ON public.inventory_holds
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "SuperAdmins ven todos los holds" ON public.inventory_holds
  FOR SELECT TO authenticated
  USING ((SELECT role_name FROM public.profiles WHERE id = auth.uid()) = 'SuperAdmin');
