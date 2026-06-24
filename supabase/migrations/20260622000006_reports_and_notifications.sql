-- ============================================================
-- SISTEMA DE REPORTES DE PAQUETES Y NOTIFICACIONES IN-APP
-- ============================================================

-- 1. CONSTRAINT DE ESTADOS DE PUBLICACIÓN
ALTER TABLE public.travel_packages
  DROP CONSTRAINT IF EXISTS check_publication_status;

ALTER TABLE public.travel_packages
  ADD CONSTRAINT check_publication_status
  CHECK (publication_status IN ('draft', 'published', 'archived', 'concluded', 'pending_review'));

-- 2. TABLA DE REPORTES DE PAQUETES
CREATE TABLE public.package_reports (
    report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID REFERENCES public.travel_packages(package_id) ON DELETE CASCADE NOT NULL,
    reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    review_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    reviewed_at TIMESTAMP WITH TIME ZONE
);

-- 3. TABLA DE NOTIFICACIONES IN-APP
CREATE TABLE public.notifications (
    notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    read BOOLEAN DEFAULT FALSE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 4. TRIGGER PARA REGISTRAR FECHA DE REVISIÓN
CREATE OR REPLACE FUNCTION public.update_reviewed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('reviewed', 'dismissed') AND OLD.status = 'pending' THEN
    NEW.reviewed_at = TIMEZONE('utc', NOW());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_report_reviewed ON public.package_reports;
CREATE TRIGGER on_report_reviewed
  BEFORE UPDATE ON public.package_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_reviewed_at();

-- 5. ÍNDICES DE RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_package_reports_package
  ON public.package_reports (package_id, status);

-- 6. HABILITAR RLS Y REALTIME
ALTER TABLE public.package_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 7. POLÍTICAS RLS PARA PACKAGE_REPORTS

-- Viajeros ven sus propios reportes
CREATE POLICY "Viajeros ven sus reportes" ON public.package_reports
  FOR SELECT TO authenticated
  USING (reporter_id = auth.uid());

-- Agency_Admin y colaboradores con permisos ven reportes de paquetes de su tenant
CREATE POLICY "Agencias ven reportes de sus paquetes" ON public.package_reports
  FOR SELECT TO authenticated
  USING (
    package_id IN (
      SELECT p.package_id FROM public.travel_packages p
      WHERE p.tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    )
    AND (
      (SELECT role_name FROM public.profiles WHERE id = auth.uid()) = 'Agency_Admin'
      OR
      (SELECT can_view_global_leads FROM public.custom_roles_permissions WHERE tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()) AND role_name = (SELECT role_name FROM public.profiles WHERE id = auth.uid())) = TRUE
    )
  );

-- SuperAdmin ve y gestiona todos los reportes
CREATE POLICY "SuperAdmin gestiona reportes" ON public.package_reports
  FOR ALL TO authenticated
  USING ((SELECT role_name FROM public.profiles WHERE id = auth.uid()) = 'SuperAdmin');

-- 8. POLÍTICAS RLS PARA NOTIFICATIONS

-- Usuarios ven solo sus notificaciones
CREATE POLICY "Usuarios ven sus notificaciones" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Usuarios marcan como leidas sus notificaciones
CREATE POLICY "Usuarios actualizan sus notificaciones" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
