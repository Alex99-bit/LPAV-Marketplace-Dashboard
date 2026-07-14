-- ============================================================
-- SCRIPT DE CORRECCIÓN CRM - Ejecutar desde SQL Editor
-- Este script verifica qué existe y crea lo que falta
-- ============================================================

-- 1. Crear tabla crm_leads si no existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_leads') THEN
    CREATE TABLE public.crm_leads (
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
  END IF;
END $$;

-- 2. Crear tabla crm_activities si no existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_activities') THEN
    CREATE TABLE public.crm_activities (
      activity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      lead_id UUID REFERENCES public.crm_leads(lead_id) ON DELETE CASCADE NOT NULL,
      agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
      activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN ('note', 'status_change', 'assignment', 'created', 'ai_extraction')),
      description TEXT,
      metadata JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
    );
  END IF;
END $$;

-- 3. Crear tabla crm_ai_qualification_sessions si no existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_ai_qualification_sessions') THEN
    CREATE TABLE public.crm_ai_qualification_sessions (
      session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      lead_id UUID REFERENCES public.crm_leads(lead_id) ON DELETE CASCADE NOT NULL,
      conversation_id UUID NOT NULL,
      fields_extracted JSONB DEFAULT '{}',
      fields_pending TEXT[] DEFAULT '{}',
      status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
      completed_at TIMESTAMP WITH TIME ZONE
    );
  END IF;
END $$;

-- 4. Crear tabla crm_agent_assignment_queue si no existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_agent_assignment_queue') THEN
    CREATE TABLE public.crm_agent_assignment_queue (
      tenant_id UUID REFERENCES public.agencies_tenants(tenant_id) ON DELETE CASCADE NOT NULL,
      last_assigned_agent_id UUID,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
      PRIMARY KEY (tenant_id)
    );
  END IF;
END $$;

-- 5. Habilitar RLS (seguro de ejecutar múltiples veces)
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_ai_qualification_sessions ENABLE ROW LEVEL SECURITY;

-- 6. Habilitar realtime solo si no está ya habilitado
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'crm_leads'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_leads;
  END IF;
END $$;

-- 7. Crear políticas RLS (usar DROP IF EXISTS + CREATE para evitar duplicados)
DROP POLICY IF EXISTS "Agencias ven sus propios leads (ALL)" ON public.crm_leads;
CREATE POLICY "Agencias ven sus propios leads (ALL)"
ON public.crm_leads
FOR ALL
TO authenticated
USING (
    tenant_id = (
        SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Agentes ven leads asignados o globales" ON public.crm_leads;
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

DROP POLICY IF EXISTS "Agentes gestionan actividades de sus leads" ON public.crm_activities;
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

DROP POLICY IF EXISTS "Agencias ven sus sesiones de IA" ON public.crm_ai_qualification_sessions;
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

-- 8. Crear índices (usar CREATE INDEX IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_crm_leads_tenant ON public.crm_leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_assigned ON public.crm_leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_crm_leads_status ON public.crm_leads(status);
CREATE INDEX IF NOT EXISTS idx_crm_leads_package ON public.crm_leads(package_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_conversation ON public.crm_leads(conversation_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_lead ON public.crm_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_ai_sessions_lead ON public.crm_ai_qualification_sessions(lead_id);

-- 9. Crear función update_crm_lead_updated_at (DROP trigger primero, luego función)
DROP TRIGGER IF EXISTS tr_crm_lead_updated_at ON public.crm_leads;
DROP FUNCTION IF EXISTS public.update_crm_lead_updated_at();
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

-- 10. Crear función log_lead_status_change (DROP trigger primero, luego función)
DROP TRIGGER IF EXISTS tr_log_lead_status_change ON public.crm_leads;
DROP FUNCTION IF EXISTS public.log_lead_status_change();
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

-- 11. Crear función notify_agent_on_lead_assignment (DROP trigger primero, luego función)
DROP TRIGGER IF EXISTS tr_notify_agent_on_lead_assignment ON public.crm_leads;
DROP FUNCTION IF EXISTS public.notify_agent_on_lead_assignment();
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

-- 12. Crear función assign_lead_round_robin
DROP FUNCTION IF EXISTS public.assign_lead_round_robin(UUID, UUID);
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

-- ============================================================
-- VERIFICACIÓN FINAL
-- ============================================================
SELECT 
  'crm_leads' as tabla,
  COUNT(*) as registros
FROM public.crm_leads
UNION ALL
SELECT 
  'crm_activities',
  COUNT(*)
FROM public.crm_activities
UNION ALL
SELECT 
  'crm_ai_qualification_sessions',
  COUNT(*)
FROM public.crm_ai_qualification_sessions
UNION ALL
SELECT 
  'crm_agent_assignment_queue',
  COUNT(*)
FROM public.crm_agent_assignment_queue;
