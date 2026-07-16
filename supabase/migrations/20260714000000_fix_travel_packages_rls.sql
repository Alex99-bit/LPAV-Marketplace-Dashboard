-- ============================================================
-- CORRECCIÓN DE POLÍTICA RLS PARA TRAVEL_PACKAGES
-- ============================================================
-- Problema: La política original no especificaba roles explícitamente,
-- causando errores 401 cuando la consulta se hacía antes de cargar la sesión.
-- Solución: Crear política explícita que permita acceso a anon y authenticated.

-- Eliminar la política antigua
DROP POLICY IF EXISTS "Cualquiera puede ver paquetes publicados" ON public.travel_packages;

-- Crear nueva política explícita
CREATE POLICY "Cualquiera puede ver paquetes publicados" ON public.travel_packages
    FOR SELECT TO anon, authenticated
    USING (publication_status IN ('published', 'concluded'));
