-- ============================================================
-- CRM SIMPLE CON CUALIFICACIÓN IA PROGRESIVA
-- ============================================================

-- 1. TABLA PRINCIPAL DE LEADS
CREATE TABLE IF NOT EXISTS public.crm_leads (
    lead_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.agencies_tenants(tenant_id) ON DELETE CASCADE NOT NULL,
    traveler_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    package_id UUID REFERENCES public.travel_packages(package_id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'proposal_sent', 'won', 'lost')),
    source VARCHAR(50) DEFAULT 'marketplace' CHECK (source IN ('marketplace', 'chat', 'referral', 'other')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),

    number_of_travelers INT,
    preferred_travel_dates VARCHAR(100),
    estimated_budget NUMERIC(12, 2) NOT NULL,
    budget_currency VARCHAR(3) DEFAULT 'MXN',
    travel_type VARCHAR(50),
    traveler_origin VARCHAR(100),
    preferred_airline VARCHAR(100),
    accommodation_type VARCHAR(50),
    special_requirements TEXT,

    ai_qualification_progress JSONB DEFAULT '{}',
    ai_qualification_completed BOOLEAN DEFAULT FALSE,

    conversation_id UUID,

    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 2. TABLA DE ACTIVIDADES DEL LEAD
CREATE TABLE IF NOT EXISTS public.crm_activities (
    activity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.crm_leads(lead_id) ON DELETE CASCADE NOT NULL,
    agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN ('note', 'status_change', 'assignment', 'created', 'ai_extraction')),
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 3. TABLA DE SESIONES DE CUALIFICACIÓN IA
CREATE TABLE IF NOT EXISTS public.crm_ai_qualification_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.crm_leads(lead_id) ON DELETE CASCADE NOT NULL,
    conversation_id UUID NOT NULL,
    fields_extracted JSONB DEFAULT '{}',
    fields_pending TEXT[] DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 4. COLA ROUND-ROBIN PARA ASIGNACIÓN AUTOMÁTICA
CREATE TABLE IF NOT EXISTS public.crm_agent_assignment_queue (
    tenant_id UUID REFERENCES public.agencies_tenants(tenant_id) ON DELETE CASCADE NOT NULL,
    last_assigned_agent_id UUID,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    PRIMARY KEY (tenant_id)
);

-- 5. HABILITAR RLS
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_ai_qualification_sessions ENABLE ROW LEVEL SECURITY;

ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_leads;

-- 6. POLÍTICAS RLS PARA CRM_LEADS
CREATE POLICY "Agencias ven sus propios leads (ALL)"
ON public.crm_leads
FOR ALL
TO authenticated
USING (
    tenant_id = (
        SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
);

CREATE POLICY "Agentes ven leads asignados o globales"
ON public.crm_leads
FOR SELECT
TO authenticated
USING (
    assigned_to = auth.uid() OR
    (SELECT can_view_global_leads FROM public.custom_roles_permissions
     WHERE tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
     AND role_name = (SELECT role_name FROM public.profiles WHERE id = auth.uid())) = TRUE
);

-- 7. POLÍTICAS RLS PARA CRM_ACTIVITIES
CREATE POLICY "Agentes gestionan actividades de sus leads"
ON public.crm_activities
FOR ALL
TO authenticated
USING (
    lead_id IN (
        SELECT lead_id FROM public.crm_leads
        WHERE tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
        AND (assigned_to = auth.uid() OR
             (SELECT can_view_global_leads FROM public.custom_roles_permissions
              WHERE tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
              AND role_name = (SELECT role_name FROM public.profiles WHERE id = auth.uid())) = TRUE)
    )
);

-- 8. POLÍTICAS RLS PARA CRM_AI_QUALIFICATION_SESSIONS
CREATE POLICY "Agencias ven sus sesiones de IA"
ON public.crm_ai_qualification_sessions
FOR ALL
TO authenticated
USING (
    lead_id IN (
        SELECT lead_id FROM public.crm_leads
        WHERE tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    )
);

-- 9. ÍNDICES
CREATE INDEX idx_crm_leads_tenant ON public.crm_leads(tenant_id);
CREATE INDEX idx_crm_leads_assigned ON public.crm_leads(assigned_to);
CREATE INDEX idx_crm_leads_status ON public.crm_leads(status);
CREATE INDEX idx_crm_leads_package ON public.crm_leads(package_id);
CREATE INDEX idx_crm_leads_conversation ON public.crm_leads(conversation_id);
CREATE INDEX idx_crm_activities_lead ON public.crm_activities(lead_id);
CREATE INDEX idx_crm_ai_sessions_lead ON public.crm_ai_qualification_sessions(lead_id);

-- 10. TRIGGER: ACTUALIZAR updated_at AUTOMÁTICAMENTE
CREATE OR REPLACE FUNCTION public.update_crm_lead_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_crm_lead_updated_at
    BEFORE UPDATE ON public.crm_leads
    FOR EACH ROW
    EXECUTE FUNCTION public.update_crm_lead_updated_at();

-- 11. TRIGGER: REGISTRAR CAMBIO DE ESTADO COMO ACTIVIDAD
CREATE OR REPLACE FUNCTION public.log_lead_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.crm_activities (lead_id, agent_id, activity_type, description, metadata)
        VALUES (
            NEW.lead_id,
            auth.uid(),
            'status_change',
            'Estado cambiado de ' || OLD.status || ' a ' || NEW.status,
            jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_log_lead_status_change
    AFTER UPDATE ON public.crm_leads
    FOR EACH ROW
    EXECUTE FUNCTION public.log_lead_status_change();

-- 12. TRIGGER: NOTIFICAR AL AGENTE CUANDO LE ASIGNAN UN LEAD
CREATE OR REPLACE FUNCTION public.notify_agent_on_lead_assignment()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to AND NEW.assigned_to IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, title, message, metadata)
        VALUES (
            NEW.assigned_to,
            'new_message',
            'Nuevo lead asignado',
            'Se te ha asignado un nuevo lead. Revisa el CRM para más detalles.',
            jsonb_build_object('lead_id', NEW.lead_id, 'package_id', NEW.package_id)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_notify_agent_on_lead_assignment
    AFTER UPDATE ON public.crm_leads
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_agent_on_lead_assignment();

-- 13. FUNCIÓN RPC: ASIGNACIÓN AUTOMÁTICA ROUND-ROBIN
CREATE OR REPLACE FUNCTION public.assign_lead_round_robin(p_tenant_id UUID, p_lead_id UUID)
RETURNS UUID AS $$
DECLARE
    v_agent_id UUID;
    v_agents UUID[];
    v_last_agent UUID;
    v_next_idx INT;
BEGIN
    SELECT ARRAY(
        SELECT id FROM public.profiles
        WHERE tenant_id = p_tenant_id
        AND role_name IN ('Agency_Admin', 'Agency_Agent', 'Agency_Collaborator')
        ORDER BY id
    ) INTO v_agents;

    IF array_length(v_agents, 1) IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT last_assigned_agent_id INTO v_last_agent
    FROM public.crm_agent_assignment_queue
    WHERE tenant_id = p_tenant_id;

    IF v_last_agent IS NULL THEN
        v_next_idx := 1;
    ELSE
        SELECT idx INTO v_next_idx
        FROM unnest(v_agents) WITH ORDINALITY AS t(id, idx)
        WHERE t.id = v_last_agent;

        v_next_idx := COALESCE(v_next_idx, 0) + 1;
        IF v_next_idx > array_length(v_agents, 1) THEN
            v_next_idx := 1;
        END IF;
    END IF;

    v_agent_id := v_agents[v_next_idx];

    INSERT INTO public.crm_agent_assignment_queue (tenant_id, last_assigned_agent_id, updated_at)
    VALUES (p_tenant_id, v_agent_id, TIMEZONE('utc', NOW()))
    ON CONFLICT (tenant_id) DO UPDATE
    SET last_assigned_agent_id = v_agent_id, updated_at = TIMEZONE('utc', NOW());

    UPDATE public.crm_leads SET assigned_to = v_agent_id WHERE lead_id = p_lead_id;

    RETURN v_agent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
