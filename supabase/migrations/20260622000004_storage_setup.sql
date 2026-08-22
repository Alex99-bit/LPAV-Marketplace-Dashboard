-- 1. INICIALIZAR BUCKET PRIVADO PARA FLYERS MULTIMEDIA
INSERT INTO storage.buckets (id, name, public)
VALUES ('flyers', 'flyers', false)
ON CONFLICT (id) DO NOTHING;

-- 2. POLÍTICA DE CARGA PARA FRONTEND MEDIANTE URLS FIRMADAS
CREATE POLICY "Agencias cargan flyers en su directorio asignado"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'flyers' AND
    (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid()) AND
    (
        (SELECT role_name FROM public.profiles WHERE id = auth.uid()) = 'Agency_Admin' OR
        (SELECT can_manage_catalog FROM public.custom_roles_permissions WHERE tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()) AND role_name = (SELECT role_name FROM public.profiles WHERE id = auth.uid())) = TRUE
    )
);

-- 3. POLÍTICA DE LECTURA DE ARCHIVOS MULTIMEDIA
CREATE POLICY "Lectura publica de flyers"
ON storage.objects
FOR SELECT
USING (bucket_id = 'flyers');
