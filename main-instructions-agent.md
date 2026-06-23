# **INSTRUCCIONES DE INGENIERÍA PARA AGENTE DE CÓDIGO: CONFIGURACIÓN CORE DE SUPABASE**

## **CONTEXTO DEL PROYECTO**

Estás construyendo el backend y la infraestructura de base de datos para un SaaS Multi-Tenant titulado **"La Plataforma de las Agencias de Viaje"**. El sistema utiliza **Supabase** como núcleo operativo (PostgreSQL, Auth, Realtime y Storage) conectado periféricamente con **Twenty CRM** y **Stripe** (Connect y Billing)\[cite: 1, 2\].

## **DIRECTIVAS GENERALES DE DESARROLLO**

1. **Generación vía CLI:** Todo el esquema debe ser estructurado para la CLI de Supabase dentro de archivos de migración SQL secuenciales en supabase/migrations/.  
2. **Aislamiento Multi-Tenant:** Implementar **Row-Level Security (RLS)** en todas las tablas operativas utilizando la columna tenant\_id (UUID).  
3. **Internacionalización (i18n):** Guardar absolutamente todas las fechas en formato **UTC** y abstraer los precios usando columnas genéricas price (numeric) y currency (VARCHAR(3)) bajo el estándar ISO 4217\.  
4. **Cumplimiento Estricto:** Sigue los esquemas y las restricciones de negocio al pie de la letra. No omitas ninguna tabla ni regla lógica.

## **TAREA 1: MIGRACIÓN BASE Y SINCRONIZACIÓN DE AUTENTICACIÓN**

Genera una migración inicial (supabase/migrations/20260622000000\_init\_auth\_and\_tenants.sql) que implemente la estructura fundamental de inquilinos y perfiles.

### **Requerimientos de Datos:**

* **agencies\_tenants**: Almacena configuraciones del SaaS, estados legales, claves de Twenty CRM y referencias de Stripe.  
* **custom\_roles\_permissions**: Sistema RBAC dinámico. Permite al administrador crear hasta 3 roles personalizados con una matriz de 4 permisos granulares por checkboxes (can\_manage\_catalog, can\_view\_global\_leads, can\_manage\_finance, can\_manage\_chat).  
* **profiles**: Tabla espejo en el esquema public vinculada directamente a auth.users mediante un Trigger automatizado. Soporta perfiles multi-rol y el rastreo del contador de infracciones por evasión de filtros (censorship\_strikes).

SQL  
\-- Habilitar extensión UUID  
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\-- 1\. TABLA DE INQUILINOS (AGENCIAS)  
CREATE TABLE public.agencies\_tenants (  
    tenant\_id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
    business\_name VARCHAR(255) NOT NULL,  
    rfc VARCHAR(13) NOT NULL,  
    address\_text TEXT NOT NULL,\[cite: 2\]  
    fiscal\_pdf\_url TEXT NOT NULL,\[cite: 1, 2\]  
    certification\_key VARCHAR(100) NOT NULL,\[cite: 1, 2\]  
    stripe\_account\_id VARCHAR(255), \-- Stripe Connect Express/Custom  
    stripe\_customer\_id VARCHAR(255), \-- Stripe Billing Customer\[cite: 2\]  
    stripe\_subscription\_id VARCHAR(255), \-- Stripe Subscription ID\[cite: 1\]  
    status VARCHAR(50) DEFAULT 'En Revisión', \-- En Revisión, Activo, Suspendido por Pago\[cite: 1\]  
    subscription\_tier VARCHAR(50) DEFAULT 'Gratuito', \-- Gratuito, Comercial, Corporativo\[cite: 1\]  
    created\_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())\[cite: 3\]  
);

\-- 2\. TABLA DE PERMISOS Y ROLES DINÁMICOS (RBAC)  
CREATE TABLE public.custom\_roles\_permissions (  
    role\_id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
    tenant\_id UUID REFERENCES public.agencies\_tenants(tenant\_id) ON DELETE CASCADE NOT NULL,  
    role\_name VARCHAR(100) NOT NULL,\[cite: 2\]  
    can\_manage\_catalog BOOLEAN DEFAULT FALSE,\[cite: 3\]  
    can\_view\_global\_leads BOOLEAN DEFAULT FALSE, \-- FALSE \= Solo ve leads asignados a sí mismo\[cite: 3\]  
    can\_manage\_finance BOOLEAN DEFAULT FALSE,\[cite: 3\]  
    can\_manage\_chat BOOLEAN DEFAULT FALSE,\[cite: 3\]  
    created\_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),  
    CONSTRAINT unique\_role\_per\_tenant UNIQUE (tenant\_id, role\_name)  
);

\-- 3\. TABLA ESPEJO DE USUARIOS (PROFILES)  
CREATE TABLE public.profiles (  
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,  
    email TEXT NOT NULL,  
    full\_name TEXT,  
    tenant\_id UUID REFERENCES public.agencies\_tenants(tenant\_id) ON DELETE SET NULL,  
    role\_name VARCHAR(100) DEFAULT 'EndUser', \-- EndUser, Agency\_Admin, o Roles Dinámicos\[cite: 1\]  
    censorship\_strikes INT DEFAULT 0, \-- Contador de evasión de chat (Max 5\)  
    created\_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())  
);

\-- 4\. TRIGGER DE SINCRONIZACIÓN AUTH.USERS \-\> PUBLIC.PROFILES  
CREATE OR REPLACE FUNCTION public.handle\_new\_user()  
RETURNS TRIGGER AS $$  
BEGIN  
  INSERT INTO public.profiles (id, email, full\_name, role\_name, tenant\_id)  
  VALUES (  
    NEW.id,  
    NEW.email,  
    COALESCE(NEW.raw\_user\_meta\_data-\>\>'full\_name', 'Viajero Anonimo'),  
    COALESCE(NEW.raw\_user\_meta\_data-\>\>'role\_name', 'EndUser'),  
    (NEW.raw\_user\_meta\_data-\>\>'tenant\_id')::uuid  
  );  
  RETURN NEW;  
END;  
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on\_auth\_user\_created  
  AFTER INSERT ON auth.users  
  FOR EACH ROW EXECUTE FUNCTION public.handle\_new\_user();

## **TAREA 2: MIGRACIÓN OPERATIVA, FLUJO FINANCIERO E IA**

Genera una segunda migración (supabase/migrations/20260622000001\_operations\_and\_ai.sql) para la gestión de catálogo, órdenes diferidas manuales, logs de comportamiento e itinerarios con IA\[cite: 1, 3, 5, 6\].

### **Requerimientos de Datos y Reglas de Negocio:**

* **travel\_packages**: Maneja el catálogo. Admite estados draft, published, archived y concluded (los viajes expirados quedan como portafolio por 365 días en estado concluded antes de archivarse)\[cite: 1, 7\].  
* **transactions\_orders**: Controla el esquema de split de pagos (3% plataforma \+ comisiones Stripe)\[cite: 1, 5, 7\]. Almacena saldos pendientes y el campo next\_payment\_due (UTC) para controlar las 2 semanas de gracia ante morosidad antes de cancelar sin derecho a reembolso.  
* **cached\_itineraries**: Almacena las salidas JSON estructuradas de Gemini indexadas por la llave compuesta package\_id:cluster\_interests\_hash para optimizar costos de tokens.

SQL  
\-- 1\. TABLA DE PAQUETES TURÍSTICOS (FORMATO FLYER VERTICAL 3:4)  
CREATE TABLE public.travel\_packages (  
    package\_id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
    tenant\_id UUID REFERENCES public.agencies\_tenants(tenant\_id) ON DELETE CASCADE NOT NULL,  
    title VARCHAR(255) NOT NULL,  
    region VARCHAR(150) NOT NULL,  
    price NUMERIC(12, 2\) NOT NULL,\[cite: 3\]  
    currency VARCHAR(3) DEFAULT 'MXN', \-- Estándar ISO 4217\[cite: 3\]  
    url\_flyer\_storage TEXT NOT NULL, \-- Imagen WebP/AVIF Alta Definición\[cite: 1, 7\]  
    url\_thumbnail\_storage TEXT NOT NULL, \-- Variante miniatura para renderizado veloz\[cite: 7\]  
    has\_coordinator BOOLEAN DEFAULT FALSE,\[cite: 1\]  
    publication\_status VARCHAR(50) DEFAULT 'draft', \-- draft, published, archived, concluded\[cite: 1, 7\]  
    departure\_date TIMESTAMP WITH TIME ZONE NOT NULL,\[cite: 3\]  
    created\_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())  
);

\-- 2\. TABLA DE ÓRDENES Y TRANSACCIONES FINANCIERAS  
CREATE TABLE public.transactions\_orders (  
    order\_id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
    tenant\_id UUID REFERENCES public.agencies\_tenants(tenant\_id) ON DELETE CASCADE NOT NULL,  
    stripe\_checkout\_session\_id VARCHAR(255) NOT NULL,  
    user\_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT NOT NULL,  
    total\_amount NUMERIC(12, 2\) NOT NULL,  
    remaining\_balance NUMERIC(12, 2\) NOT NULL, \-- Balance para planes de pago diferido (Max 4 meses)\[cite: 5\]  
    currency VARCHAR(3) DEFAULT 'MXN',\[cite: 3\]  
    platform\_commission\_fee NUMERIC(12, 2\) NOT NULL, \-- Retención proporcional del 3% por abono manual\[cite: 5, 7\]  
    payment\_status VARCHAR(50) DEFAULT 'pending', \-- pending, partial\_paid, paid, moroso, cancelled\[cite: 1, 5\]  
    next\_payment\_due TIMESTAMP WITH TIME ZONE, \-- Control estricto de las 2 semanas de gracia\[cite: 3, 5\]  
    created\_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())  
);

\-- 3\. TABLA DE PERFILAMIENTO Y CACHÉ SEGMENTADO DE IA  
CREATE TABLE public.user\_recommendation\_profiles (  
    user\_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,  
    onboarding\_completed BOOLEAN DEFAULT FALSE,\[cite: 6\]  
    cluster\_interests\_hash VARCHAR(64) NOT NULL, \-- Hash MD5/SHA de los tags seleccionados\[cite: 6\]  
    preferred\_destinations TEXT\[\],  
    target\_budget\_range VARCHAR(50), \-- Bajo, Medio, Alto, Premium  
    updated\_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())  
);

CREATE TABLE public.cached\_itineraries (  
    cache\_id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
    package\_id UUID REFERENCES public.travel\_packages(package\_id) ON DELETE CASCADE NOT NULL,  
    cluster\_interests\_hash VARCHAR(64) NOT NULL,\[cite: 6\]  
    itinerary\_json JSONB NOT NULL, \-- Esquema estructurado responseSchema forzado\[cite: 6\]  
    created\_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),  
    CONSTRAINT unique\_package\_cluster\_cache UNIQUE (package\_id, cluster\_interests\_hash)  
);

\-- 4\. TABLA DE LOGS DE COMPORTAMIENTO CONDUCTUAL  
CREATE TABLE public.user\_behavior\_logs (  
    log\_id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
    visitor\_tracker\_id UUID, \-- Rastreabilidad para usuarios anónimos  
    user\_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,  
    event\_type VARCHAR(50) NOT NULL, \-- view\_package, search\_query, add\_to\_cart  
    package\_id UUID REFERENCES public.travel\_packages(package\_id) ON DELETE CASCADE,  
    metadata JSONB,  
    created\_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())  
);

## **TAREA 3: MIGRACIÓN DE COMUNICACIÓN (CHAT IN-APP) Y REALTIME**

Genera la tercera migración (supabase/migrations/20260622000002\_chat\_and\_realtime.sql) para la mensajería síncrona en la SPA\[cite: 4\].

SQL  
\-- TABLA DE MENSAJES DEL CHAT  
CREATE TABLE public.chat\_messages (  
    message\_id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
    conversation\_id UUID NOT NULL, \-- Enlazado al Lead ID de Twenty CRM  
    sender\_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,  
    message\_text TEXT NOT NULL, \-- Modificado en el backend si hay evasión de datos\[cite: 4\]  
    created\_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())  
);

\-- HABILITAR PUBLICACIÓN EN TIEMPO REAL VÍA WEBSOCKETS  
ALTER TABLE public.chat\_messages ENABLE ROW LEVEL SECURITY;  
ALTER PUBLICATION supabase\_realtime ADD TABLE public.chat\_messages;

## **TAREA 4: CONFIGURACIÓN DE POLÍTICAS DE CONTROL DE ACCESO (RLS)**

Escribe las políticas de seguridad Row-Level Security (RLS) en una migración específica (supabase/migrations/20260622000003\_rls\_policies.sql) para blindar el aislamiento inter-agencia\[cite: 1\].

SQL  
\-- HABILITAR RLS EN TODAS LAS TABLAS OPERATIVAS  
ALTER TABLE public.agencies\_tenants ENABLE ROW LEVEL SECURITY;  
ALTER TABLE public.custom\_roles\_permissions ENABLE ROW LEVEL SECURITY;  
ALTER TABLE public.travel\_packages ENABLE ROW LEVEL SECURITY;  
ALTER TABLE public.transactions\_orders ENABLE ROW LEVEL SECURITY;

\-- POLÍTICAS PARA AGENCIES\_TENANTS  
CREATE POLICY "SuperAdmins ven todos los tenants" ON public.agencies\_tenants  
    FOR ALL TO authenticated USING (auth.jwt() \-\>\> 'role' \= 'SuperAdmin');

CREATE POLICY "Agencias ven su propio registro tenant" ON public.agencies\_tenants  
    FOR SELECT TO authenticated USING (tenant\_id \= (SELECT tenant\_id FROM public.profiles WHERE id \= auth.uid()));

\-- POLÍTICAS PARA TRAVEL\_PACKAGES (CATÁLOGO PÚBLICO / MUTACIÓN PRIVADA)  
CREATE POLICY "Cualquiera puede ver paquetes publicados" ON public.travel\_packages  
    FOR SELECT USING (publication\_status IN ('published', 'concluded'));\[cite: 7\]

CREATE POLICY "Colaboradores mutan catálogo de su propio tenant" ON public.travel\_packages  
    FOR ALL TO authenticated   
    USING (  
        tenant\_id \= (SELECT tenant\_id FROM public.profiles WHERE id \= auth.uid()) AND  
        (  
            (SELECT role\_name FROM public.profiles WHERE id \= auth.uid()) \= 'Agency\_Admin' OR  
            (SELECT can\_manage\_catalog FROM public.custom\_roles\_permissions WHERE tenant\_id \= (SELECT tenant\_id FROM public.profiles WHERE id \= auth.uid()) AND role\_name \= (SELECT role\_name FROM public.profiles WHERE id \= auth.uid())) \= TRUE  
        )  
    );

\-- POLÍTICAS PARA TRANSACTIONS\_ORDERS  
CREATE POLICY "Clientes ven sus propias compras" ON public.transactions\_orders  
    FOR SELECT TO authenticated USING (user\_id \= auth.uid());

CREATE POLICY "Agencias ven órdenes de su tenant con permisos financieros" ON public.transactions\_orders  
    FOR SELECT TO authenticated   
    USING (  
        tenant\_id \= (SELECT tenant\_id FROM public.profiles WHERE id \= auth.uid()) AND  
        (  
            (SELECT role\_name FROM public.profiles WHERE id \= auth.uid()) \= 'Agency\_Admin' OR  
            (SELECT can\_manage\_finance FROM public.custom\_roles\_permissions WHERE tenant\_id \= (SELECT tenant\_id FROM public.profiles WHERE id \= auth.uid()) AND role\_name \= (SELECT role\_name FROM public.profiles WHERE id \= auth.uid())) \= TRUE  
        )  
    );

\-- POLÍTICAS PARA CHAT\_MESSAGES  
CREATE POLICY "Usuarios acceden a mensajes si participan en la conversación" ON public.chat\_messages  
    FOR ALL TO authenticated  
    USING (  
        sender\_id \= auth.uid() OR  
        (SELECT tenant\_id FROM public.profiles WHERE id \= auth.uid()) IS NOT NULL  
    );

## **TAREA 5: ESTRUCTURACIÓN DE STORAGE (BUCKETS Y POLÍTICAS)**

Genera la migración final (supabase/migrations/20260622000004\_storage\_setup.sql) para inicializar el bucket de almacenamiento aislado para los flyers en formato 3:4\[cite: 1, 7\].

SQL  
\-- 1\. INICIALIZAR BUCKET PRIVADO PARA FLYERS MULTIMEDIA  
INSERT INTO storage.buckets (id, name, public)   
VALUES ('flyers', 'flyers', false);\[cite: 7\]

\-- 2\. POLÍTICA DE CARGA PARA FRONTEND MEDIANTE URLS FIRMADAS  
CREATE POLICY "Agencias cargan flyers en su directorio asignado"   
ON storage.objects   
FOR INSERT   
TO authenticated   
WITH CHECK (  
    bucket\_id \= 'flyers' AND   
    (storage.foldername(name))\[1\] \= (SELECT tenant\_id::text FROM public.profiles WHERE id \= auth.uid()) AND  
    (  
        (SELECT role\_name FROM public.profiles WHERE id \= auth.uid()) \= 'Agency\_Admin' OR  
        (SELECT can\_manage\_catalog FROM public.custom\_roles\_permissions WHERE tenant\_id \= (SELECT tenant\_id FROM public.profiles WHERE id \= auth.uid()) AND role\_name \= (SELECT role\_name FROM public.profiles WHERE id \= auth.uid())) \= TRUE  
    )  
);

\-- 3\. POLÍTICA DE LECTURA DE ARCHIVOS MULTIMEDIA  
CREATE POLICY "Lectura publica de flyers"   
ON storage.objects   
FOR SELECT   
USING (bucket\_id \= 'flyers');

## **RESULTADO ESPERADO**

Al terminar, el agente de código debe ser capaz de ejecutar con éxito:

1. npx supabase db reset para inicializar el contenedor local Docker de Postgres con todas las dependencias funcionales compitadas.  
2. Comprobar que los esquemas relacionales, triggers de auth, tablas espejo, RLS dinámicos y buckets queden perfectamente integrados.

**Procede a codificar la estructura de base de datos base.**

