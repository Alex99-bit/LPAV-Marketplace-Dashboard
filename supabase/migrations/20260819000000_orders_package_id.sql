-- ============================================================================
-- Relaciona las órdenes (transactions_orders) con el paquete de viaje.
--
-- Motivo: la consulta de AgencyFinance hace un embed de PostgREST
--   transactions_orders?select=...,travel_packages(package_id,title)
-- que fallaba con 400 porque no existía la FK package_id -> travel_packages.
-- ============================================================================

ALTER TABLE public.transactions_orders
  ADD COLUMN IF NOT EXISTS package_id UUID
  REFERENCES public.travel_packages(package_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_orders_package
  ON public.transactions_orders(package_id);
