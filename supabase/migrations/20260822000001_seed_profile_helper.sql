-- ============================================================
-- FIX: Permits insert profiles via RPC for seed data
-- ============================================================

CREATE OR REPLACE FUNCTION public.seed_profile(
    p_id UUID,
    p_email TEXT,
    p_full_name TEXT,
    p_role_name TEXT DEFAULT 'EndUser',
    p_tenant_id UUID DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role_name, tenant_id)
    VALUES (p_id, p_email, p_full_name, p_role_name, p_tenant_id)
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role_name = EXCLUDED.role_name,
        tenant_id = EXCLUDED.tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
