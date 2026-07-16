ALTER TABLE public.agencies_tenants
    ADD COLUMN IF NOT EXISTS logo_url TEXT,
    ADD COLUMN IF NOT EXISTS website_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20),
    ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'America/Mexico_City',
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS social_media JSONB DEFAULT '{}';

ALTER TABLE public.travel_packages
    ADD COLUMN IF NOT EXISTS deposit_percent NUMERIC(5,2) DEFAULT 0.20,
    ADD COLUMN IF NOT EXISTS max_installments INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS itinerary_text TEXT;

CREATE TABLE IF NOT EXISTS public.agency_team_members (
    member_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.agencies_tenants(tenant_id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role_name VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    joined_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT unique_member_per_tenant_email UNIQUE (tenant_id, email)
);

ALTER TABLE public.agency_team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency manages team members"
ON public.agency_team_members FOR ALL TO authenticated
USING (tenant_id = public.get_current_user_tenant())
WITH CHECK (tenant_id = public.get_current_user_tenant());

CREATE INDEX idx_team_members_tenant ON public.agency_team_members(tenant_id);
CREATE INDEX idx_team_members_user ON public.agency_team_members(user_id);
