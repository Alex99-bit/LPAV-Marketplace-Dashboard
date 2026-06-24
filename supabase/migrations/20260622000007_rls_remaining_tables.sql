-- ============================================================
-- RLS PARA TABLAS RESTANTES
-- ============================================================

-- 1. PERFILES (PROFILES)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Usuarios ven su propio perfil
CREATE POLICY "Usuarios ven su propio perfil" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Usuarios de agencia ven perfiles de su mismo tenant (colaboradores)
CREATE POLICY "Agencias ven perfiles de su tenant" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    tenant_id IS NOT NULL
    AND tenant_id = (SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid())
  );

-- Usuarios actualizan su propio perfil
CREATE POLICY "Usuarios actualizan su propio perfil" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 2. LOGS DE COMPORTAMIENTO
ALTER TABLE public.user_behavior_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven sus propios logs" ON public.user_behavior_logs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 3. PERFILES DE RECOMENDACIÓN IA
ALTER TABLE public.user_recommendation_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios gestionan su perfil de recomendaciones" ON public.user_recommendation_profiles
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4. CACHÉ DE ITINERARIOS IA
ALTER TABLE public.cached_itineraries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura publica del cache de itinerarios" ON public.cached_itineraries
  FOR SELECT
  USING (true);
