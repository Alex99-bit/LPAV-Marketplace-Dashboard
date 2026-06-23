# **INSTRUCCIONES DE INGENIERÍA: SISTEMA DE CACHÉ DE IA SEGMENTADO POR INTERESES (BLOQUE 3\)**

## **CONTEXTO DEL SUBSISTEMA**

Para mitigar el abuso financiero por consumo excesivo de tokens en la API de Google (gemini-2.5-flash) al invocar POST /api/v1/ai/generate-itinerary, el sistema no generará itinerarios dinámicos globales. En su lugar, el backend segmentará a los viajeros según sus intereses turísticos mediante un hash único (cluster\_interests\_hash).  
Este requerimiento exige implementar la estructura de persistencia de perfiles de recomendación, la tabla de caché de itinerarios estructurados (JSONB) y un **mecanismo automático de invalidación de caché** mediante triggers de PostgreSQL.

## **DIRECTIVAS PARA EL AGENTE DE CÓDIGO**

1. Crea un nuevo archivo de migración en la ruta local: supabase/migrations/20260622000005\_ai\_interest\_caching.sql.  
2. Escribe el código SQL completo sin simplificaciones, incluyendo tipos de datos, llaves foráneas con borrado en cascada, funciones, triggers y políticas RLS.

## **ESQUEMA SQL A GENERAR**

SQL  
\-- 1\. TABLA DE PERFILES DE RECOMENDACIÓN CONDUCTUAL (ONBOARDING)  
CREATE TABLE IF NOT EXISTS public.user\_recommendation\_profiles (  
    user\_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,  
    onboarding\_completed BOOLEAN DEFAULT FALSE,  
    cluster\_interests\_hash VARCHAR(64) NOT NULL, \-- Hash de control para indexación de caché  
    interests\_tags TEXT\[\] DEFAULT '{}', \-- Ej: {Playa, Aventura, Cultural, Económico}  
    preferred\_destinations TEXT\[\] DEFAULT '{}',  
    target\_budget\_range VARCHAR(50) DEFAULT 'Medio', \-- Bajo, Medio, Alto, Premium  
    updated\_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())  
);

\-- 2\. TABLA DE CACHÉ DE ITINERARIOS CON IA (ESTRUCTURADOS EN JSONB)  
CREATE TABLE IF NOT EXISTS public.cached\_itineraries (  
    cache\_id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
    package\_id UUID REFERENCES public.travel\_packages(package\_id) ON DELETE CASCADE NOT NULL,  
    cluster\_interests\_hash VARCHAR(64) NOT NULL,  
    itinerary\_json JSONB NOT NULL, \-- Contiene la estructura exacta requerida por el Frontend  
    created\_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),  
    \-- Garantizar que solo exista un itinerario único por combinación de paquete y tipo de viajero  
    CONSTRAINT unique\_package\_cluster\_cache UNIQUE (package\_id, cluster\_interests\_hash)  
);

\-- HABILITAR ROW-LEVEL SECURITY  
ALTER TABLE public.user\_recommendation\_profiles ENABLE ROW LEVEL SECURITY;  
ALTER TABLE public.cached\_itineraries ENABLE ROW LEVEL SECURITY;

\-- 3\. POLÍTICAS RLS (ROW-LEVEL SECURITY)  
\-- Perfiles de recomendación: El usuario solo puede ver y editar su propio perfil  
CREATE POLICY "Usuarios operan su propio perfil de recomendaciones"  
ON public.user\_recommendation\_profiles  
FOR ALL  
TO authenticated  
USING (user\_id \= auth.uid())  
WITH CHECK (user\_id \= auth.uid());

\-- Caché de itinerarios: Lectura pública para cualquier usuario autenticado (Viajeros y Agencias)  
CREATE POLICY "Cualquier usuario autenticado lee el caché de IA"  
ON public.cached\_itineraries  
FOR SELECT  
TO authenticated  
USING (TRUE);

\-- El service\_role (API Gateway/Edge Functions) es el único con permisos de inserción en el caché  
CREATE POLICY "API Gateway inserta registros en el cache"  
ON public.cached\_itineraries  
FOR INSERT  
TO service\_role  
WITH CHECK (TRUE);

## **LÓGICA DE AUTOMATIZACIÓN (TRIGGER DE INVALIDACIÓN DE CACHÉ)**

Si una agencia de viajes modifica un paquete turístico (por ejemplo, cambia el destino, los días, las actividades base o el precio), el caché almacenado para ese paquete queda obsoleto (*stale data*) y debe ser destruido inmediatamente para forzar a Gemini a recalcular la ruta con los nuevos datos del paquete.  
Inyecta la siguiente función y trigger en la migración:

SQL  
\-- Función de invalidación de caché  
CREATE OR REPLACE FUNCTION public.invalidate\_ai\_itinerary\_cache()  
RETURNS TRIGGER AS $$  
BEGIN  
    \-- Validar si hubo cambios críticos en las columnas operativas del paquete  
    IF (OLD.title IS DISTINCT FROM NEW.title) OR   
       (OLD.region IS DISTINCT FROM NEW.region) OR   
       (OLD.price IS DISTINCT FROM NEW.price) OR  
       (OLD.departure\_date IS DISTINCT FROM NEW.departure\_date) THEN  
         
        \-- Eliminar de forma atómica todos los registros de caché asociados a este package\_id  
        DELETE FROM public.cached\_itineraries  
        WHERE package\_id \= NEW.package\_id;  
          
    END IF;  
    RETURN NEW;  
END;  
$$ LANGUAGE plpgsql SECURITY DEFINER;

\-- Trigger atado al ciclo de vida de actualizaciones de la tabla travel\_packages  
CREATE OR REPLACE TRIGGER tr\_invalidate\_cache\_on\_package\_update  
    AFTER UPDATE ON public.travel\_packages  
    FOR EACH ROW  
    EXECUTE FUNCTION public.invalidate\_ai\_itinerary\_cache();

## **PROCEDIMIENTO ALMACENADO PARA LA API GATEWAY (RPC)**

Para ahorrar solicitudes de red desde la API Gateway o las Edge Functions, expón una función RPC optimizada que permita verificar en una sola consulta indexada si el caché existe para el usuario firmante.

SQL  
CREATE OR REPLACE FUNCTION public.get\_itinerary\_cache\_by\_user(p\_package\_id UUID, p\_user\_id UUID)  
RETURNS TABLE (cache\_hit BOOLEAN, itinerary JSONB) AS $$  
DECLARE  
    v\_user\_hash VARCHAR(64);  
    v\_cached\_json JSONB;  
BEGIN  
    \-- Extraer el clúster de intereses del usuario  
    SELECT cluster\_interests\_hash INTO v\_user\_hash  
    FROM public.user\_recommendation\_profiles  
    WHERE user\_id \= p\_user\_id;

    \-- Si el usuario no tiene perfil de onboarding, retornar vacío para forzar cuestionario  
    IF v\_user\_hash IS NULL THEN  
        RETURN QUERY SELECT FALSE, NULL::jsonb;  
        RETURN;  
    END IF;

    \-- Buscar coincidencia en la tabla de caché  
    SELECT itinerary\_json INTO v\_cached\_json  
    FROM public.cached\_itineraries  
    WHERE package\_id \= p\_package\_id AND cluster\_interests\_hash \= v\_user\_hash;

    IF FOUND THEN  
        RETURN QUERY SELECT TRUE, v\_cached\_json;  
    ELSE  
        RETURN QUERY SELECT FALSE, NULL::jsonb;  
    END IF;  
END;  
$$ LANGUAGE plpgsql SECURITY DEFINER;

## **INSTRUCCIÓN DE EJECUCIÓN DEL AGENTE**

Una vez escritos y validados los bloques SQL anteriores dentro del archivo de migración, ejecuta el comando de entorno local para reconstruir la base de datos y compilar las funciones de optimización de IA de manera atómica:

Bash  
supabase db reset

**Procede a codificar y aplicar este diseño de base de datos.**