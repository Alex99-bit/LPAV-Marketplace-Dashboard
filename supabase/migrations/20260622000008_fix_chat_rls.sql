-- ============================================================
-- FIX CRITICO: Politica RLS de chat_messages demasiado permisiva
-- ============================================================

-- 1. TABLA DE PARTICIPANTES DE CONVERSACION
CREATE TABLE public.conversation_participants (
    conversation_id UUID NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    PRIMARY KEY (conversation_id, user_id)
);

-- 2. HABILITAR RLS
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

-- 3. POLITICAS RLS PARA PARTICIPANTES
-- Usuarios ven sus propias participaciones
CREATE POLICY "Usuarios ven sus participaciones" ON public.conversation_participants
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Usuarios pueden unirse a conversaciones (insertar su propio registro)
CREATE POLICY "Usuarios se unen a conversaciones" ON public.conversation_participants
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 4. ELIMINAR POLITICA PERMISIVA ANTERIOR
DROP POLICY IF EXISTS "Usuarios acceden a mensajes si participan en la conversacion" ON public.chat_messages;
DROP POLICY IF EXISTS "Usuarios acceden a mensajes si participan en la conversación" ON public.chat_messages;

-- 5. NUEVA POLITICA: solo participantes pueden leer/escribir
CREATE POLICY "Participantes acceden a sus mensajes" ON public.chat_messages
  FOR ALL TO authenticated
  USING (
    conversation_id IN (
      SELECT cp.conversation_id
      FROM public.conversation_participants cp
      WHERE cp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    sender_id = auth.uid() AND
    conversation_id IN (
      SELECT cp.conversation_id
      FROM public.conversation_participants cp
      WHERE cp.user_id = auth.uid()
    )
  );
