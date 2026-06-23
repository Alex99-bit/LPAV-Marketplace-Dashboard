-- TABLA DE MENSAJES DEL CHAT
CREATE TABLE public.chat_messages (
    message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    message_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- HABILITAR PUBLICACIÓN EN TIEMPO REAL VÍA WEBSOCKETS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
