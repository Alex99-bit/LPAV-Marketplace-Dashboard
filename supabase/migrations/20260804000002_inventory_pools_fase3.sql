-- ============================================================
-- FASE 3: Inventory Pools, Package Linking, Audit Log,
--         Sync endpoint, conversión con ventas externas
-- ============================================================

-- 1. TABLA DE POOLS DE INVENTARIO COMPARTIDO
CREATE TABLE public.inventory_pools (
    pool_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.agencies_tenants(tenant_id) ON DELETE CASCADE,
    pool_name VARCHAR(255) NOT NULL,
    total_units INTEGER NOT NULL CHECK (total_units > 0),
    available_units INTEGER NOT NULL CHECK (available_units >= 0),
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    CONSTRAINT inventory_pools_units_check CHECK (available_units <= total_units)
);

COMMENT ON TABLE public.inventory_pools IS 'Pools de inventario compartido entre multiples paquetes (ej. bloque de 50 habitaciones de hotel)';

-- 2. TABLA DE VÍNCULO PAQUETE-POOL
CREATE TABLE public.package_inventory_link (
    link_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES public.travel_packages(package_id) ON DELETE CASCADE,
    pool_id UUID NOT NULL REFERENCES public.inventory_pools(pool_id) ON DELETE CASCADE,
    allocated_units INTEGER NOT NULL DEFAULT 0 CHECK (allocated_units >= 0),
    UNIQUE(package_id, pool_id)
);

COMMENT ON TABLE public.package_inventory_link IS 'Vincula paquetes a pools de inventario con cantidad de unidades asignadas';

-- 3. TABLA DE AUDITORÍA DE INVENTARIO
CREATE TABLE public.inventory_audit_log (
    audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES public.travel_packages(package_id) ON DELETE CASCADE,
    pool_id UUID REFERENCES public.inventory_pools(pool_id) ON DELETE SET NULL,
    change_type VARCHAR(50) NOT NULL CHECK (change_type IN ('booking', 'external_sale', 'manual_adjustment', 'sync', 'dispute_reversal')),
    rooms_before INTEGER NOT NULL,
    rooms_after INTEGER NOT NULL,
    changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

COMMENT ON TABLE public.inventory_audit_log IS 'Auditoría completa de cada cambio de inventario para trazabilidad';

-- 4. ACTUALIZAR decrement_available_rooms CON AUDITORÍA
CREATE OR REPLACE FUNCTION public.decrement_available_rooms(p_package_id UUID)
RETURNS void AS $$
DECLARE
  v_before INTEGER;
  v_after INTEGER;
BEGIN
  SELECT available_rooms INTO v_before
    FROM public.travel_packages
    WHERE package_id = p_package_id
      AND total_rooms > 0
      AND available_rooms > 0;

  IF v_before IS NULL THEN
    RAISE EXCEPTION 'Package not found or no inventory';
  END IF;

  UPDATE public.travel_packages
    SET available_rooms = available_rooms - 1
    WHERE package_id = p_package_id
      AND total_rooms > 0
      AND available_rooms > 0
    RETURNING available_rooms INTO v_after;

  INSERT INTO public.inventory_audit_log (
    package_id, change_type, rooms_before, rooms_after, metadata
  ) VALUES (
    p_package_id, 'booking', v_before, v_after,
    jsonb_build_object('source', 'stripe_webhook')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. ACTUALIZAR increment_available_rooms CON AUDITORÍA
CREATE OR REPLACE FUNCTION public.increment_available_rooms(p_package_id UUID)
RETURNS void AS $$
DECLARE
  v_before INTEGER;
  v_after INTEGER;
BEGIN
  SELECT available_rooms INTO v_before
    FROM public.travel_packages
    WHERE package_id = p_package_id
      AND total_rooms > 0
      AND available_rooms < total_rooms;

  IF v_before IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.travel_packages
    SET available_rooms = available_rooms + 1
    WHERE package_id = p_package_id
      AND total_rooms > 0
      AND available_rooms < total_rooms
    RETURNING available_rooms INTO v_after;

  INSERT INTO public.inventory_audit_log (
    package_id, change_type, rooms_before, rooms_after, metadata
  ) VALUES (
    p_package_id, 'dispute_reversal', v_before, v_after,
    jsonb_build_object('source', 'stripe_dispute')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. ACTUALIZAR register_external_sale CON AUDITORÍA
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
  v_before INTEGER;
  v_after INTEGER;
BEGIN
  INSERT INTO public.external_sales_log (
    tenant_id, package_id, rooms_sold, total_amount, currency, notes
  ) VALUES (
    p_tenant_id, p_package_id, p_rooms_sold, p_total_amount, p_currency, p_notes
  ) RETURNING sale_id INTO v_sale_id;

  IF p_package_id IS NOT NULL AND p_rooms_sold > 0 THEN
    SELECT available_rooms INTO v_before
      FROM public.travel_packages
      WHERE package_id = p_package_id AND total_rooms > 0;

    IF v_before IS NOT NULL THEN
      UPDATE public.travel_packages
        SET available_rooms = GREATEST(0, available_rooms - p_rooms_sold)
        WHERE package_id = p_package_id AND total_rooms > 0
        RETURNING available_rooms INTO v_after;

      INSERT INTO public.inventory_audit_log (
        package_id, change_type, rooms_before, rooms_after, metadata
      ) VALUES (
        p_package_id, 'external_sale', v_before, COALESCE(v_after, GREATEST(0, v_before - p_rooms_sold)),
        jsonb_build_object('sale_id', v_sale_id, 'rooms_sold', p_rooms_sold)
      );
    END IF;
  END IF;

  RETURN v_sale_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RPC: SINCRONIZAR INVENTARIO DESDE SISTEMA EXTERNO
CREATE OR REPLACE FUNCTION public.sync_inventory_external(
  p_package_id UUID,
  p_total_rooms INTEGER,
  p_available_rooms INTEGER,
  p_source VARCHAR DEFAULT 'external_pms'
) RETURNS void AS $$
DECLARE
  v_before INTEGER;
BEGIN
  SELECT available_rooms INTO v_before
    FROM public.travel_packages
    WHERE package_id = p_package_id;

  IF v_before IS NULL THEN
    RAISE EXCEPTION 'Package not found';
  END IF;

  UPDATE public.travel_packages
    SET total_rooms = p_total_rooms,
        available_rooms = p_available_rooms
    WHERE package_id = p_package_id;

  INSERT INTO public.inventory_audit_log (
    package_id, change_type, rooms_before, rooms_after, metadata
  ) VALUES (
    p_package_id, 'sync', v_before, p_available_rooms,
    jsonb_build_object('source', p_source, 'total_rooms', p_total_rooms)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. ACTUALIZAR evaluate_conversion_rates PARA INCLUIR VENTAS EXTERNAS
CREATE OR REPLACE FUNCTION public.evaluate_conversion_rates()
RETURNS void AS $$
DECLARE
    r RECORD;
    v_window_leads INTEGER;
    v_window_sales INTEGER;
    v_external_sales INTEGER;
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
        SELECT COUNT(*) INTO v_window_leads
        FROM public.crm_leads
        WHERE tenant_id = r.tenant_id
          AND created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '3 months';

        SELECT COUNT(*) INTO v_window_sales
        FROM public.transactions_orders
        WHERE tenant_id = r.tenant_id
          AND created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '3 months'
          AND payment_status IN ('paid', 'partial_paid');

        SELECT COALESCE(SUM(rooms_sold), 0) INTO v_external_sales
        FROM public.external_sales_log
        WHERE tenant_id = r.tenant_id
          AND created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '3 months';

        IF v_window_leads > 0 THEN
            v_conversion_rate := ((v_window_sales + v_external_sales)::NUMERIC / v_window_leads::NUMERIC) * 100;
        ELSE
            v_conversion_rate := 0;
        END IF;

        v_preferential_active := FALSE;
        v_new_rate := r.commission_rate;

        IF r.plan_type = 'Intermedio' AND v_conversion_rate >= 5 THEN
            v_preferential_active := TRUE;
            v_new_rate := 17.00;
        ELSIF r.plan_type = 'Premium' AND v_conversion_rate >= 8 THEN
            v_preferential_active := TRUE;
            v_new_rate := 12.00;
        END IF;

        IF v_preferential_active = FALSE AND r.preferential_rate_active = TRUE THEN
            v_consecutive_months := r.consecutive_months_below_threshold + 1;
        ELSE
            v_consecutive_months := 0;
        END IF;

        IF v_consecutive_months >= 2 THEN
            v_new_rate := CASE r.plan_type
                WHEN 'Intermedio' THEN 18.00
                WHEN 'Premium' THEN 15.00
            END;
            v_preferential_active := FALSE;
        END IF;

        UPDATE public.agencies_tenants
        SET conversion_window_leads = v_window_leads,
            conversion_window_sales = v_window_sales + v_external_sales,
            conversion_rate = ROUND(v_conversion_rate, 2),
            commission_rate = v_new_rate,
            preferential_rate_active = v_preferential_active,
            consecutive_months_below_threshold = v_consecutive_months
        WHERE tenant_id = r.tenant_id;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. HABILITAR RLS
ALTER TABLE public.inventory_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_inventory_link ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agencias gestionan sus pools" ON public.inventory_pools
  FOR ALL TO authenticated
  USING (tenant_id = public.get_current_user_tenant())
  WITH CHECK (tenant_id = public.get_current_user_tenant());

CREATE POLICY "SuperAdmins ven todos los pools" ON public.inventory_pools
  FOR SELECT TO authenticated
  USING (public.get_current_user_role() = 'SuperAdmin');

CREATE POLICY "Agencias ven sus vinculos paquete-pool" ON public.package_inventory_link
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.inventory_pools ip
    WHERE ip.pool_id = pool_id
      AND ip.tenant_id = public.get_current_user_tenant()
  ));

CREATE POLICY "Agencias ven su auditoria de inventario" ON public.inventory_audit_log
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.travel_packages tp
    WHERE tp.package_id = package_id
      AND tp.tenant_id = public.get_current_user_tenant()
  ));

CREATE POLICY "SuperAdmins ven toda la auditoria" ON public.inventory_audit_log
  FOR SELECT TO authenticated
  USING (public.get_current_user_role() = 'SuperAdmin');
