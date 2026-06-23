-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLA DE INQUILINOS (AGENCIAS)
CREATE TABLE public.agencies_tenants (
    tenant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name VARCHAR(255) NOT NULL,
    rfc VARCHAR(13) NOT NULL,
    address_text TEXT NOT NULL,
    fiscal_pdf_url TEXT NOT NULL,
    certification_key VARCHAR(100) NOT NULL,
    stripe_account_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'En Revisión',
    subscription_tier VARCHAR(50) DEFAULT 'Gratuito',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 2. TABLA DE PERMISOS Y ROLES DINÁMICOS (RBAC)
CREATE TABLE public.custom_roles_permissions (
    role_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.agencies_tenants(tenant_id) ON DELETE CASCADE NOT NULL,
    role_name VARCHAR(100) NOT NULL,
    can_manage_catalog BOOLEAN DEFAULT FALSE,
    can_view_global_leads BOOLEAN DEFAULT FALSE,
    can_manage_finance BOOLEAN DEFAULT FALSE,
    can_manage_chat BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT unique_role_per_tenant UNIQUE (tenant_id, role_name)
);

-- 3. TABLA ESPEJO DE USUARIOS (PROFILES)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    tenant_id UUID REFERENCES public.agencies_tenants(tenant_id) ON DELETE SET NULL,
    role_name VARCHAR(100) DEFAULT 'EndUser',
    censorship_strikes INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 4. TRIGGER DE SINCRONIZACIÓN AUTH.USERS -> PUBLIC.PROFILES
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role_name, tenant_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Viajero Anonimo'),
    COALESCE(NEW.raw_user_meta_data->>'role_name', 'EndUser'),
    (NEW.raw_user_meta_data->>'tenant_id')::uuid
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
