-- ============================================================================
-- Otorgar privilegios de la Data API sobre el esquema public.
--
-- El nuevo default de Supabase (Postgres >= 15) NO expone automáticamente las
-- tablas nuevas a los roles de la API (anon/authenticated/service_role). Como
-- las migraciones históricas de este proyecto no incluyen GRANTs explícitos,
-- aquí restauramos el comportamiento esperado:
--
--   - GRANT a nivel de tabla/sequencia/función para anon, authenticated y
--     service_role.
--   - La seguridad a nivel de fila sigue protegida por las políticas RLS
--     (cada tabla conserva sus CREATE POLICY).
--
-- Esto replica el comportamiento legacy de `auto_expose_new_tables = true`.
-- ============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- Privilegios por defecto para objetos creados en el futuro.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
