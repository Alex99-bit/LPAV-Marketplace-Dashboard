-- ============================================================
-- FIX: RLS de agencies_tenants no permite inserts
-- Problema: La política "SuperAdmins ven todos los tenants" usa
--   auth.jwt() ->> 'role' = 'SuperAdmin' pero el JWT siempre
--   tiene role = 'authenticated'. El SuperAdmin real está en
--   profiles.role_name, no en el claim JWT.
-- Solución: Reemplazar la política para usar get_current_user_role()
-- y agregar INSERT/UPDATE para agencies y SuperAdmin.
-- ============================================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "SuperAdmins ven todos los tenants" ON public.agencies_tenants;
DROP POLICY IF EXISTS "Agencias ven su propio registro tenant" ON public.agencies_tenants;

-- 1. SuperAdmin tiene acceso completo (LECTURA, ESCRITURA, INSERCION)
CREATE POLICY "SuperAdmin full access on agencies_tenants"
ON public.agencies_tenants FOR ALL TO authenticated
USING (public.get_current_user_role() = 'SuperAdmin')
WITH CHECK (public.get_current_user_role() = 'SuperAdmin');

-- 2. Agencias pueden LEER su propio registro
CREATE POLICY "Agency reads own tenant"
ON public.agencies_tenants FOR SELECT TO authenticated
USING (
    tenant_id IN (
        SELECT tenant_id FROM public.profiles
        WHERE id = auth.uid() AND tenant_id IS NOT NULL
    )
);

-- 3. Agencias pueden ACTUALIZAR su propio registro (para settings, perfil, etc.)
CREATE POLICY "Agency updates own tenant"
ON public.agencies_tenants FOR UPDATE TO authenticated
USING (
    tenant_id IN (
        SELECT tenant_id FROM public.profiles
        WHERE id = auth.uid() AND tenant_id IS NOT NULL
    )
)
WITH CHECK (
    tenant_id IN (
        SELECT tenant_id FROM public.profiles
        WHERE id = auth.uid() AND tenant_id IS NOT NULL
    )
);
