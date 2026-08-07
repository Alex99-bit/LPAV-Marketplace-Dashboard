-- ============================================================
-- MIGRATION: Wishlist de viajeros (user_saved_packages)
-- Tabla definida en DOC MAESTRO Secciones 2.2 y 7.3
-- ============================================================

CREATE TABLE public.user_saved_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    package_id UUID NOT NULL REFERENCES public.travel_packages(package_id) ON DELETE CASCADE,
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(user_id, package_id)
);

ALTER TABLE public.user_saved_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios gestionan sus paquetes guardados"
ON public.user_saved_packages
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_saved_packages_user
    ON public.user_saved_packages(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_packages_package
    ON public.user_saved_packages(package_id);
