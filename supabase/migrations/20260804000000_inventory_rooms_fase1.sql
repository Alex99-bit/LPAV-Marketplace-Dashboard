-- ============================================================
-- FASE 1: Control de inventario de habitaciones en travel_packages
-- Agrega total_rooms y available_rooms + validaciones
-- ============================================================

ALTER TABLE public.travel_packages
  ADD COLUMN IF NOT EXISTS total_rooms INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS available_rooms INTEGER DEFAULT 0;

COMMENT ON COLUMN public.travel_packages.total_rooms IS 'Total de habitaciones/cupos declarados por la agencia. 0 = sin limite (retrocompatible)';
COMMENT ON COLUMN public.travel_packages.available_rooms IS 'Habitaciones/cupos disponibles. Se decrementa en cada compra confirmada';

-- CHECK: available_rooms no puede ser mayor que total_rooms (si total_rooms > 0)
ALTER TABLE public.travel_packages
  DROP CONSTRAINT IF EXISTS travel_packages_rooms_check;
ALTER TABLE public.travel_packages
  ADD CONSTRAINT travel_packages_rooms_check
  CHECK (
    total_rooms >= 0
    AND available_rooms >= 0
    AND (total_rooms = 0 OR available_rooms <= total_rooms)
  );

-- Inicializar available_rooms = total_rooms para paquetes existentes que ya tengan valor
UPDATE public.travel_packages
SET available_rooms = total_rooms
WHERE total_rooms > 0 AND available_rooms = 0;
