-- ============================================================
-- AUTH REFACTOR: Mejoras al sistema de autenticación y registro
-- ============================================================
-- Problemas resueltos:
-- 1. agencies_tenants no tenia owner_user_id (no se vinculaba el creador)
-- 2. No existia tabla de invitaciones para empleados de agencias
-- 3. Faltaban funciones RPC para registro de agencia y aceptación de invitación
-- 4. Profiles no tenia campos de avatar ni teléfono

-- 1. AÑADIR owner_user_id A agencies_tenants
ALTER TABLE public.agencies_tenants
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_agencies_owner ON public.agencies_tenants(owner_user_id);

-- 2. AÑADIR CAMPOS ADICIONALES A profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- 3. CREAR TABLA DE INVITACIONES DE EMPLEADOS
CREATE TABLE IF NOT EXISTS public.agency_invitations (
    invitation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.agencies_tenants(tenant_id) ON DELETE CASCADE NOT NULL,
    invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL,
    role_name VARCHAR(100) NOT NULL DEFAULT 'Agency_Collaborator',
    token UUID NOT NULL DEFAULT gen_random_uuid(),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (TIMEZONE('utc', NOW()) + INTERVAL '7 days'),
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_agency_invitations_token ON public.agency_invitations(token);
CREATE INDEX IF NOT EXISTS idx_agency_invitations_email ON public.agency_invitations(email);
CREATE INDEX IF NOT EXISTS idx_agency_invitations_tenant ON public.agency_invitations(tenant_id);

-- 4. HABILITAR RLS EN agency_invitations
ALTER TABLE public.agency_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage tenant invitations"
ON public.agency_invitations
FOR ALL
TO authenticated
USING (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    AND (SELECT role_name FROM public.profiles WHERE id = auth.uid()) = 'Agency_Admin'
)
WITH CHECK (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    AND (SELECT role_name FROM public.profiles WHERE id = auth.uid()) = 'Agency_Admin'
);

CREATE POLICY "Invited user sees own invitation"
ON public.agency_invitations
FOR SELECT
TO authenticated
USING (
    email = (SELECT email FROM public.profiles WHERE id = auth.uid())
);

-- 5. FUNCIÓN RPC: REGISTRAR AGENCIA (crea tenant + vincula usuario como Agency_Admin)
CREATE OR REPLACE FUNCTION public.register_agency(
    p_business_name VARCHAR(255),
    p_rfc VARCHAR(13),
    p_address_text TEXT,
    p_fiscal_pdf_url TEXT,
    p_certification_key VARCHAR(100)
) RETURNS UUID AS $$
DECLARE
    v_tenant_id UUID;
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado';
    END IF;

    IF (SELECT tenant_id FROM public.profiles WHERE id = v_user_id) IS NOT NULL THEN
        RAISE EXCEPTION 'Usuario ya pertenece a una agencia';
    END IF;

    INSERT INTO public.agencies_tenants (
        business_name, rfc, address_text, fiscal_pdf_url, certification_key, owner_user_id, status
    ) VALUES (
        p_business_name, UPPER(p_rfc), p_address_text, p_fiscal_pdf_url, p_certification_key, v_user_id, 'En Revisión'
    ) RETURNING tenant_id INTO v_tenant_id;

    UPDATE public.profiles
    SET tenant_id = v_tenant_id, role_name = 'Agency_Admin'
    WHERE id = v_user_id;

    RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. FUNCIÓN RPC: ACEPTAR INVITACIÓN (vincula usuario a agencia con rol asignado)
CREATE OR REPLACE FUNCTION public.accept_invitation(p_token UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_invitation RECORD;
    v_user_id UUID := auth.uid();
    v_email TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado';
    END IF;

    SELECT email INTO v_email FROM public.profiles WHERE id = v_user_id;

    SELECT * INTO v_invitation
    FROM public.agency_invitations
    WHERE token = p_token
    AND status = 'pending'
    AND expires_at > TIMEZONE('utc', NOW())
    AND email = v_email;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invitacion no valida, expirada o no corresponde a tu correo';
    END IF;

    UPDATE public.profiles
    SET tenant_id = v_invitation.tenant_id, role_name = v_invitation.role_name
    WHERE id = v_user_id;

    UPDATE public.agency_invitations
    SET status = 'accepted', accepted_at = TIMEZONE('utc', NOW())
    WHERE invitation_id = v_invitation.invitation_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. FUNCIÓN RPC: CREAR INVITACIÓN (solo Agency_Admin)
CREATE OR REPLACE FUNCTION public.create_invitation(
    p_email VARCHAR(255),
    p_role_name VARCHAR(100) DEFAULT 'Agency_Collaborator'
) RETURNS UUID AS $$
DECLARE
    v_invitation_id UUID;
    v_tenant_id UUID;
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado';
    END IF;

    SELECT tenant_id INTO v_tenant_id FROM public.profiles WHERE id = v_user_id;

    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no pertenece a ninguna agencia';
    END IF;

    IF (SELECT role_name FROM public.profiles WHERE id = v_user_id) != 'Agency_Admin' THEN
        RAISE EXCEPTION 'Solo el administrador puede crear invitaciones';
    END IF;

    INSERT INTO public.agency_invitations (
        tenant_id, invited_by, email, role_name
    ) VALUES (
        v_tenant_id, v_user_id, p_email, p_role_name
    ) RETURNING invitation_id INTO v_invitation_id;

    RETURN v_invitation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
