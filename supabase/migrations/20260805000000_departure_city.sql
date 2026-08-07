-- ============================================================
-- MIGRATION: Ciudad de salida (origen del viaje) en paquetes
-- Las agencias pueden tener sede en una ciudad pero vender
-- salidas desde otras ciudades (ej. agencia en SLP vende
-- salidas desde CDMX, MTY, GDL, etc.)
-- ============================================================

ALTER TABLE public.travel_packages
  ADD COLUMN IF NOT EXISTS departure_city VARCHAR(150) DEFAULT '';

COMMENT ON COLUMN public.travel_packages.departure_city
  IS 'Ciudad de origen desde donde sale el viaje. Lista curada de aeropuertos/terminales principales de Mexico. Vacio = no especificado (retrocompatible).';
