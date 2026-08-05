-- ============================================================
-- FASE 2: Ventas externas, conciliación, auto-conclusión,
--         notificaciones de inventario bajo, overbooking
-- ============================================================

-- 1. TABLA DE VENTAS EXTERNAS (reportadas manualmente por la agencia)
CREATE TABLE public.external_sales_log (
    sale_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.agencies_tenants(tenant_id) ON DELETE CASCADE,
    package_id UUID REFERENCES public.travel_packages(package_id) ON DELETE SET NULL,
    rooms_sold INTEGER NOT NULL DEFAULT 1,
    total_amount NUMERIC(12,2),
    currency VARCHAR(3) DEFAULT 'MXN',
    sale_date TIMESTAMPTZ DEFAULT timezone('utc', now()),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

COMMENT ON TABLE public.external_sales_log IS 'Registro de ventas realizadas fuera de la plataforma, reportadas por la agencia para conciliación de inventario';

-- 2. AGREGAR overbooking_incidents A agencies_tenants
ALTER TABLE public.agencies_tenants
  ADD COLUMN IF NOT EXISTS overbooking_incidents INTEGER DEFAULT 0;

COMMENT ON COLUMN public.agencies_tenants.overbooking_incidents IS 'Contador de incidentes de sobreventa. Al superar umbral se suspende la agencia';

-- 3. RPC: DECREMENTAR HABITACIONES DISPONIBLES (usado en stripe-webhook)
CREATE OR REPLACE FUNCTION public.decrement_available_rooms(p_package_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.travel_packages
    SET available_rooms = available_rooms - 1
    WHERE package_id = p_package_id
      AND total_rooms > 0
      AND available_rooms > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RPC: INCREMENTAR HABITACIONES DISPONIBLES (usado en disputas/reembolsos)
CREATE OR REPLACE FUNCTION public.increment_available_rooms(p_package_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.travel_packages
    SET available_rooms = available_rooms + 1
    WHERE package_id = p_package_id
      AND total_rooms > 0
      AND available_rooms < total_rooms;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC: REGISTRAR VENTA EXTERNA Y DECREMENTAR INVENTARIO
CREATE OR REPLACE FUNCTION public.register_external_sale(
  p_tenant_id UUID,
  p_package_id UUID,
  p_rooms_sold INTEGER DEFAULT 1,
  p_total_amount NUMERIC DEFAULT NULL,
  p_currency VARCHAR DEFAULT 'MXN',
  p_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_sale_id UUID;
BEGIN
  INSERT INTO public.external_sales_log (
    tenant_id, package_id, rooms_sold, total_amount, currency, notes
  ) VALUES (
    p_tenant_id, p_package_id, p_rooms_sold, p_total_amount, p_currency, p_notes
  ) RETURNING sale_id INTO v_sale_id;

  IF p_package_id IS NOT NULL AND p_rooms_sold > 0 THEN
    UPDATE public.travel_packages
      SET available_rooms = GREATEST(0, available_rooms - p_rooms_sold)
      WHERE package_id = p_package_id
        AND total_rooms > 0;
  END IF;

  RETURN v_sale_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. FUNCIÓN: AUTO-CONCLUIR PAQUETES AGOTADOS (cron job)
CREATE OR REPLACE FUNCTION public.auto_conclude_exhausted_packages()
RETURNS void AS $$
BEGIN
  UPDATE public.travel_packages
    SET publication_status = 'concluded'
    WHERE total_rooms > 0
      AND available_rooms <= 0
      AND publication_status = 'published';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. FUNCIÓN: SUSPENDER AGENCIAS POR OVERBOOKING REINCIDENTE
CREATE OR REPLACE FUNCTION public.evaluate_overbooking_suspension()
RETURNS void AS $$
BEGIN
  UPDATE public.agencies_tenants
    SET status = 'Suspendido por Fraude'
    WHERE overbooking_incidents >= 3
      AND status = 'Activo';

  UPDATE public.travel_packages
    SET publication_status = 'draft'
    WHERE tenant_id IN (
      SELECT tenant_id FROM public.agencies_tenants
      WHERE overbooking_incidents >= 3 AND status = 'Suspendido por Fraude'
    )
    AND publication_status = 'published';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. FUNCIÓN: NOTIFICAR INVENTARIO BAJO A AGENCIAS
CREATE OR REPLACE FUNCTION public.notify_low_inventory()
RETURNS void AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT tp.package_id, tp.tenant_id, tp.title, tp.available_rooms, tp.total_rooms,
           at.owner_user_id
    FROM public.travel_packages tp
    JOIN public.agencies_tenants at ON at.tenant_id = tp.tenant_id
    WHERE tp.total_rooms > 0
      AND tp.available_rooms > 0
      AND tp.available_rooms <= 5
      AND tp.publication_status = 'published'
      AND at.owner_user_id IS NOT NULL
  ) LOOP
    INSERT INTO public.notifications (
      user_id, type, title, message, metadata
    ) VALUES (
      r.owner_user_id,
      'package_approved',
      'Inventario bajo',
      'El paquete "' || r.title || '" tiene solo ' || r.available_rooms || ' de ' || r.total_rooms || ' habitaciones disponibles.',
      jsonb_build_object(
        'package_id', r.package_id,
        'available_rooms', r.available_rooms,
        'total_rooms', r.total_rooms,
        'alert_type', 'low_inventory'
      )
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. AGREGAR CRON JOBS
SELECT cron.schedule(
  'auto-conclude-exhausted',
  '0 1 * * *',
  'SELECT public.auto_conclude_exhausted_packages();'
);

SELECT cron.schedule(
  'evaluate-overbooking-suspension',
  '0 2 * * *',
  'SELECT public.evaluate_overbooking_suspension();'
);

SELECT cron.schedule(
  'notify-low-inventory',
  '0 8 * * *',
  'SELECT public.notify_low_inventory();'
);

-- 10. HABILITAR RLS EN external_sales_log
ALTER TABLE public.external_sales_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SuperAdmins ven todas las ventas externas" ON public.external_sales_log
  FOR ALL TO authenticated
  USING ((SELECT role_name FROM public.profiles WHERE id = auth.uid()) = 'SuperAdmin');

CREATE POLICY "Agencias ven y gestionan sus ventas externas" ON public.external_sales_log
  FOR ALL TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    AND (
      (SELECT role_name FROM public.profiles WHERE id = auth.uid()) = 'Agency_Admin'
      OR EXISTS (
        SELECT 1 FROM public.custom_roles_permissions
        WHERE tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
          AND role_name = (SELECT role_name FROM public.profiles WHERE id = auth.uid())
          AND can_manage_finance = TRUE
      )
    )
  )
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    AND (
      (SELECT role_name FROM public.profiles WHERE id = auth.uid()) = 'Agency_Admin'
      OR EXISTS (
        SELECT 1 FROM public.custom_roles_permissions
        WHERE tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
          AND role_name = (SELECT role_name FROM public.profiles WHERE id = auth.uid())
          AND can_manage_finance = TRUE
      )
    )
  );
