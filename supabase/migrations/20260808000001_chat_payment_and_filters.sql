-- ============================================================
-- MIGRATION: Chat Payment + Filtros Anti-Elusión Rigurosos
-- Agrega: message_type y metadata a chat_messages,
--         actualización del trigger sanitize_chat_message
--         con patrones extendidos de detección
-- ============================================================

-- 1. AGREGAR COLUMNAS A chat_messages PARA MENSAJES ENRIQUECIDOS
ALTER TABLE public.chat_messages
    ADD COLUMN IF NOT EXISTS message_type VARCHAR(50) DEFAULT 'text',
    ADD COLUMN IF NOT EXISTS metadata JSONB;

ALTER TABLE public.chat_messages
    DROP CONSTRAINT IF EXISTS chat_messages_message_type_check;

ALTER TABLE public.chat_messages
    ADD CONSTRAINT chat_messages_message_type_check
    CHECK (message_type IN ('text', 'payment_request', 'payment_confirmed'));

-- 2. ACTUALIZAR TRIGGER sanitize_chat_message CON FILTROS EXTENDIDOS
-- URL, CLABE, tarjetas, redes sociales, evasión semántica
CREATE OR REPLACE FUNCTION public.sanitize_chat_message()
RETURNS TRIGGER AS $$
DECLARE
  v_strikes INT;
  v_contains_contact BOOLEAN := FALSE;
BEGIN
  -- No censurar mensajes de tipo payment_request o payment_confirmed
  -- (son JSON insertado por edge functions, no texto del usuario)
  IF NEW.message_type IS NOT NULL AND NEW.message_type != 'text' THEN
    RETURN NEW;
  END IF;

  -- Verificar si el usuario ya esta baneado (5+ strikes)
  SELECT censorship_strikes INTO v_strikes
    FROM public.profiles WHERE id = NEW.sender_id;

  IF v_strikes >= 5 THEN
    RAISE EXCEPTION 'Usuario bloqueado por acumular 5 infracciones de contacto.' USING ERRCODE = 'CK001';
  END IF;

  -- =====================
  -- TELEFONOS
  -- =====================
  IF NEW.message_text ~ '\+?\d{10,13}' THEN
    v_contains_contact := TRUE;
  END IF;

  -- =====================
  -- EMAILS
  -- =====================
  IF NEW.message_text ~ '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}' THEN
    v_contains_contact := TRUE;
  END IF;

  -- =====================
  -- URLs (http, https, www)
  -- =====================
  IF NEW.message_text ~* '(https?://|www\.)[^\s]+' THEN
    v_contains_contact := TRUE;
  END IF;

  -- Dominios comunes sin protocolo (ej: "pagame.com", "miweb.mx")
  IF NEW.message_text ~* '\b[a-z0-9]([a-z0-9-]*[a-z0-9])?\.(com|mx|org|net|io|co|dev|app|me|site|online)\b' THEN
    v_contains_contact := TRUE;
  END IF;

  -- =====================
  -- CLABE / TARJETAS / CUENTAS BANCARIAS
  -- =====================
  -- CLABE (18 dígitos)
  IF NEW.message_text ~ '\d{18}' THEN
    v_contains_contact := TRUE;
  END IF;

  -- Tarjetas (16 dígitos continuos o separados)
  IF NEW.message_text ~ '\d{4}[\s.-]?\d{4}[\s.-]?\d{4}[\s.-]?\d{4}' THEN
    v_contains_contact := TRUE;
  END IF;

  -- Menciones de banco/cuenta + numeros
  IF NEW.message_text ~* '(clabe|cuenta|transferencia|deposito|banco|bancaria|tarjeta|interbancaria)\b.*\d{4,}' THEN
    v_contains_contact := TRUE;
  END IF;

  -- =====================
  -- REDES SOCIALES
  -- =====================
  -- Menciones (@usuario)
  IF NEW.message_text ~ '@[\w.]{3,}' THEN
    v_contains_contact := TRUE;
  END IF;

  -- URLs de redes sociales
  IF NEW.message_text ~* '(facebook\.com|instagram\.com|tiktok\.com|wa\.me|t\.me|twitter\.com|x\.com|linkedin\.com)' THEN
    v_contains_contact := TRUE;
  END IF;

  -- Palabras clave de redes sociales
  IF NEW.message_text ~* '\b(facebook|instagram|whatsapp|whats|telegram|tiktok|twitter)\s*[:.]?\s*\w+' THEN
    v_contains_contact := TRUE;
  END IF;

  -- =====================
  -- EVASION SEMANTICA DE URLs
  -- =====================
  -- "midominio . com", "midominio(punto)com"
  IF NEW.message_text ~* '[a-z]+\s*\.\s*[a-z]{2,}' THEN
    v_contains_contact := TRUE;
  END IF;

  IF NEW.message_text ~* '[a-z]+\s*\(\s*punto\s*\)\s*[a-z]+' THEN
    v_contains_contact := TRUE;
  END IF;

  -- =====================
  -- EVASION SEMANTICA DE NUMEROS (español)
  -- =====================
  -- Numeros escritos con palabras (4+ secuenciales)
  IF NEW.message_text ~* '(uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|cero)[\s-]*(uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|cero)[\s-]*(uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|cero)[\s-]*(uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|cero)' THEN
    v_contains_contact := TRUE;
  END IF;

  -- Digitos espaciados/guionados (9+ en secuencia)
  IF NEW.message_text ~ '\d[\s.-]+\d[\s.-]+\d[\s.-]+\d[\s.-]+\d[\s.-]+\d[\s.-]+\d[\s.-]+\d[\s.-]+\d' THEN
    v_contains_contact := TRUE;
  END IF;

  -- =====================
  -- EVASION SEMANTICA DE CONTACTO
  -- =====================
  -- "escribeme al", "marcame al", "llamame", "whatsapp", "whats"
  IF NEW.message_text ~* '(escr[ií]beme|m[aá]rcame|ll[aá]mame|cont[aá]ctame|whatsapp|whats|wsp)\b.*\d{4,}' THEN
    v_contains_contact := TRUE;
  END IF;

  -- "mi correo", "mi email", "mi numero", "mi tel", "mi cel"
  IF NEW.message_text ~* '\b(mi\s+(correo|email|n[uú]mero|tel[eé]fono|tel|cel|celular))\b' THEN
    v_contains_contact := TRUE;
  END IF;

  -- "agregame", "sigueme", "busquenme", "encuentrame"
  IF NEW.message_text ~* '\b(agr[eé]game|s[ií]gueme|b[uú]scamen?|encu[eé]ntramen?)\b.*\d{4,}' THEN
    v_contains_contact := TRUE;
  END IF;

  -- =====================
  -- APLICAR CENSURA
  -- =====================
  IF v_contains_contact THEN
    -- Incrementar contador de infracciones
    UPDATE public.profiles
      SET censorship_strikes = v_strikes + 1
      WHERE id = NEW.sender_id;

    -- Si alcanza exactamente 5 strikes, bloquear
    IF v_strikes + 1 >= 5 THEN
      RAISE EXCEPTION 'Usuario bloqueado por acumular 5 infracciones de contacto.' USING ERRCODE = 'CK001';
    END IF;

    -- Censurar el mensaje
    NEW.message_text := '***';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recrear el trigger (DROP + CREATE para asegurar que usa la nueva funcion)
DROP TRIGGER IF EXISTS before_chat_message_insert ON public.chat_messages;
CREATE TRIGGER before_chat_message_insert
  BEFORE INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.sanitize_chat_message();
