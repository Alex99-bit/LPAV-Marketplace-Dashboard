-- ============================================================
-- FIX: Recursion infinita en politicas RLS de profiles
-- ============================================================
-- Problema: Las politicas RLS de profiles y otras tablas hacen
-- subqueries a profiles, lo que dispara las mismas politicas
-- y causa recursion infinita (error 42P17).
-- Solucion: Crear funciones SECURITY DEFINER que leen profiles
-- bypassando RLS, rompiendo el ciclo de recursion.

-- ============================================================
-- 1. FUNCIONES HELPER (SECURITY DEFINER - bypassan RLS)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_current_user_tenant()
RETURNS UUID AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS VARCHAR AS $$
  SELECT role_name FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.can_manage_catalog()
RETURNS BOOLEAN AS $$
  SELECT
    (SELECT role_name FROM public.profiles WHERE id = auth.uid()) = 'Agency_Admin'
    OR
    COALESCE(
      (SELECT can_manage_catalog FROM public.custom_roles_permissions
       WHERE tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
       AND role_name = (SELECT role_name FROM public.profiles WHERE id = auth.uid())),
      FALSE
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.can_view_global_leads()
RETURNS BOOLEAN AS $$
  SELECT
    (SELECT role_name FROM public.profiles WHERE id = auth.uid()) = 'Agency_Admin'
    OR
    COALESCE(
      (SELECT can_view_global_leads FROM public.custom_roles_permissions
       WHERE tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
       AND role_name = (SELECT role_name FROM public.profiles WHERE id = auth.uid())),
      FALSE
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.can_manage_finance()
RETURNS BOOLEAN AS $$
  SELECT
    (SELECT role_name FROM public.profiles WHERE id = auth.uid()) = 'Agency_Admin'
    OR
    COALESCE(
      (SELECT can_manage_finance FROM public.custom_roles_permissions
       WHERE tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
       AND role_name = (SELECT role_name FROM public.profiles WHERE id = auth.uid())),
      FALSE
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.can_manage_chat()
RETURNS BOOLEAN AS $$
  SELECT
    (SELECT role_name FROM public.profiles WHERE id = auth.uid()) = 'Agency_Admin'
    OR
    COALESCE(
      (SELECT can_manage_chat FROM public.custom_roles_permissions
       WHERE tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
       AND role_name = (SELECT role_name FROM public.profiles WHERE id = auth.uid())),
      FALSE
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- 2. REESCRIBIR POLITICAS DE PROFILES
-- ============================================================

DROP POLICY IF EXISTS "Usuarios ven su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Agencias ven perfiles de su tenant" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios actualizan su propio perfil" ON public.profiles;

CREATE POLICY "Usuarios ven su propio perfil" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Agencias ven perfiles de su tenant" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    tenant_id IS NOT NULL
    AND tenant_id = public.get_current_user_tenant()
  );

CREATE POLICY "Usuarios actualizan su propio perfil" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================================
-- 3. REESCRIBIR POLITICAS DE TRAVEL_PACKAGES
-- ============================================================

DROP POLICY IF EXISTS "Colaboradores mutan catalogo de su propio tenant" ON public.travel_packages;
DROP POLICY IF EXISTS "Colaboradores mutan catálogo de su propio tenant" ON public.travel_packages;

CREATE POLICY "Colaboradores mutan catalogo de su propio tenant" ON public.travel_packages
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_current_user_tenant()
    AND public.can_manage_catalog()
  );

CREATE POLICY "Colaboradores actualizan catalogo de su tenant" ON public.travel_packages
  FOR UPDATE TO authenticated
  USING (
    tenant_id = public.get_current_user_tenant()
    AND public.can_manage_catalog()
  );

CREATE POLICY "Colaboradores eliminan catalogo de su tenant" ON public.travel_packages
  FOR DELETE TO authenticated
  USING (
    tenant_id = public.get_current_user_tenant()
    AND public.can_manage_catalog()
  );

-- ============================================================
-- 4. REESCRIBIR POLITICAS DE CUSTOM_ROLES_PERMISSIONS
-- ============================================================

DROP POLICY IF EXISTS "Usuarios autenticados ven roles de su tenant" ON public.custom_roles_permissions;
DROP POLICY IF EXISTS "Admins gestionan roles de su propio tenant" ON public.custom_roles_permissions;

CREATE POLICY "Usuarios autenticados ven roles de su tenant" ON public.custom_roles_permissions
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_current_user_tenant());

CREATE POLICY "Admins gestionan roles de su propio tenant" ON public.custom_roles_permissions
  FOR ALL TO authenticated
  USING (
    tenant_id = public.get_current_user_tenant()
    AND public.get_current_user_role() = 'Agency_Admin'
  )
  WITH CHECK (
    tenant_id = public.get_current_user_tenant()
    AND public.get_current_user_role() = 'Agency_Admin'
  );

-- ============================================================
-- 5. REESCRIBIR POLITICAS DE TRANSACTIONS_ORDERS
-- ============================================================

DROP POLICY IF EXISTS "Agencias ven ordenes de su tenant con permisos financieros" ON public.transactions_orders;

CREATE POLICY "Agencias ven ordenes de su tenant con permisos financieros" ON public.transactions_orders
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_current_user_tenant()
    AND public.can_manage_finance()
  );

-- ============================================================
-- 6. REESCRIBIR POLITICAS DE AGENCIES_TENANTS
-- ============================================================

DROP POLICY IF EXISTS "Agencias ven su propio registro tenant" ON public.agencies_tenants;

CREATE POLICY "Agencias ven su propio registro tenant" ON public.agencies_tenants
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_current_user_tenant());

-- ============================================================
-- 7. REESCRIBIR POLITICAS DE STORAGE (flyers)
-- ============================================================

DROP POLICY IF EXISTS "Agencias cargan flyers en su directorio asignado" ON storage.objects;

CREATE POLICY "Agencias cargan flyers en su directorio asignado"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'flyers' AND
    (storage.foldername(name))[1] = public.get_current_user_tenant()::text AND
    public.can_manage_catalog()
);

-- ============================================================
-- 8. REESCRIBIR POLITICAS DE PACKAGE_REPORTS
-- ============================================================

DROP POLICY IF EXISTS "Agencias ven reportes de sus paquetes" ON public.package_reports;

CREATE POLICY "Agencias ven reportes de sus paquetes" ON public.package_reports
  FOR SELECT TO authenticated
  USING (
    package_id IN (
      SELECT p.package_id FROM public.travel_packages p
      WHERE p.tenant_id = public.get_current_user_tenant()
    )
    AND public.can_view_global_leads()
  );

-- ============================================================
-- 9. REESCRIBIR POLITICAS DE CRM_LEADS
-- ============================================================

DROP POLICY IF EXISTS "Agencias ven sus propios leads (ALL)" ON public.crm_leads;
DROP POLICY IF EXISTS "Agentes ven leads asignados o globales" ON public.crm_leads;

CREATE POLICY "Agencias ven sus propios leads (ALL)"
ON public.crm_leads
FOR ALL
TO authenticated
USING (
    tenant_id = public.get_current_user_tenant()
);

CREATE POLICY "Agentes ven leads asignados o globales"
ON public.crm_leads
FOR SELECT
TO authenticated
USING (
    assigned_to = auth.uid() OR public.can_view_global_leads()
);

DROP POLICY IF EXISTS "Agentes gestionan actividades de sus leads" ON public.crm_activities;

CREATE POLICY "Agentes gestionan actividades de sus leads"
ON public.crm_activities
FOR ALL
TO authenticated
USING (
    lead_id IN (
        SELECT lead_id FROM public.crm_leads
        WHERE tenant_id = public.get_current_user_tenant()
        AND (assigned_to = auth.uid() OR public.can_view_global_leads())
    )
);

DROP POLICY IF EXISTS "Agencias ven sus sesiones de IA" ON public.crm_ai_qualification_sessions;

CREATE POLICY "Agencias ven sus sesiones de IA"
ON public.crm_ai_qualification_sessions
FOR ALL
TO authenticated
USING (
    lead_id IN (
        SELECT lead_id FROM public.crm_leads
        WHERE tenant_id = public.get_current_user_tenant()
    )
);
