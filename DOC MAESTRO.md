# **ESPECIFICACIÓN DE ARQUITECTURA DE SOFTWARE Y DOCUMENTO DE REQUERIMIENTOS TÉCNICOS (PRD)**

## **SISTEMA CORE: "LA PLATAFORMA DE LAS AGENCIAS DE VIAJE"**

## *Por Carlos Alejandro C. Obregón*

## **1\. CONFIGURACIÓN GENERAL, ARQUITECTURA MULTI-TENANT Y MODELO SAAS**

La plataforma está diseñada bajo una arquitectura de software como servicio (SaaS) Multi-Tenant. Utiliza una infraestructura unificada respaldada por **Supabase** (PostgreSQL, Auth, Realtime y Storage) como entorno principal para el backend y la persistencia de datos. La plataforma incluye un **CRM integrado nativamente** para la gestión de leads, seguimiento de ventas y relación con clientes. Este CRM opera directamente sobre PostgreSQL (tablas `crm_leads`, `crm_activities`, `crm_ai_qualification_sessions`, `crm_agent_assignment_queue`) sin dependencia de servicios externos, garantizando baja latencia multi-tenant mediante Row-Level Security. Incluye pre-calificación automatizada de leads por IA (Gemini 2.5 Flash), asignación round-robin a agentes y chat en tiempo real integrado con Supabase Realtime. La especificación completa del CRM se detalla en la Sección 2.5.

### **1.1 Matriz de Niveles de Suscripción B2B**

El ciclo de vida, la facturación recurrente y las cuotas operativas de las agencias de viajes registradas en la plataforma son gestionados de manera automatizada mediante la integración de **Stripe Billing**.

| Característica / Límite | Plan Básico (Gratuito) MD | Plan Comercial (De Paga) MD | Plan Corporativo (De Paga) MD |
| :---- | :---- | :---- | :---- |
| **Enfoque de Mercado** | Captación masiva y Product-Led Growth (PLG). | Agencias en pleno crecimiento y expansión. | Agencias consolidadas y corporativos premium. |
| **Ciclo de Facturación** | N/A. | Mensual o Anual (Anual incluye 20% de descuento). | Mensual o Anual (Anual incluye 20% de descuento). |
| **Límite de Flyers Activos** | Máximo 5 flyers publicados simultáneamente. | Hasta 25 flyers publicados simultáneamente. | Ilimitados (con tope alto de control de 150 flyers). |
| **Roles Personalizados (RBAC)** | 0 (Acceso exclusivo mediante cuenta maestra Agency\_Admin). | Permite crear hasta 1 rol personalizado adicional. | Permite crear hasta **3 roles personalizados dinámicos**. |
| **Límite de Usuarios / Empleados** | Restringido a 1 usuario administrador. | Soporta la asociación de 3 a 5 empleados por tenant. | Usuarios y colaboradores ilimitados por agencia. |
| **Gestión de Leads (CRM Integrado)** | Registro centralizado en bandeja principal única sin asignación. | Asignación automática round-robin a agentes; filtrado por status y prioridad; vista restringida por RBAC. | Dashboard avanzado de métricas, KPIs de conversión, pipeline de ventas y analíticas de rendimiento de agentes. |
| **Canales de Comunicación** | Alertas Push en Dashboard y notificaciones por Correo. | Omnicanalidad completa: Push, Correo y 50 alertas WhatsApp al mes. | Push e Email ilimitados; WhatsApp ilimitado vía *Metered Billing*. |
| **Pre-calificación de Leads** | Tradicional (Ingreso directo de formularios al CRM). | Acceso a bots guiados basados en reglas lógicas. | Acceso a bots guiados basados en reglas lógicas. |
| **Agente de IA de Seguimiento** | No disponible. | **Habilitado:** Agente de IA para seguimiento de leads en chat in-app. | **Habilitado:** Agente de IA para seguimiento de leads en chat in-app. |

**Regla de Asignación de Plan:** Todas las agencias de nueva creación ingresan por defecto e indefectiblemente al **Plan Comercial**, sin opción a elegir otro nivel. La facturación recurrente de Stripe Billing asociada al Plan Comercial se encuentra actualmente **desactivada**, por lo que las agencias no pagan cuota de suscripción mensual o anual. Las columnas de los planes Gratuito y Corporativo se conservan documentadas exclusivamente como referencia para una posible reactivación futura del modelo de suscripciones SaaS. En tanto el modelo de suscripción permanezca inactivo, Stripe Billing no ejecutará cobros recurrentes de ningún tipo.

### **1.2 Regla de Negocio ante Fallos de Pago B2B (Periodo de Gracia)**

> **Estado Actual:** Esta regla de negocio aplica únicamente cuando el modelo de suscripciones SaaS por Stripe Billing esté activo. Actualmente la plataforma opera sin cobros de suscripción, por lo que esta sección se encuentra en estado **inactivo/dormido** y no se ejecuta en producción. Se conserva documentada para reactivación futura del modelo de suscripciones.

* Si el cobro recurrente de la suscripción SaaS de una agencia falla, Stripe Billing ejecutará automáticamente un máximo de 3 reintentos de cargo.  
* En cada intento fallido, el sistema enviará de inmediato una notificación automatizada por correo electrónico al administrador de la agencia indicando que el cargo no pudo ser procesado.  
* La plataforma otorga un **periodo de gracia máximo de 15 días** a partir del primer fallo para que la agencia renueve su suscripción.  
* Durante estos 15 días de gracia, el sistema mantiene activos y visibles en el marketplace los paquetes de viajes que la agencia ya tenía publicados.  
* Asimismo, los canales de pago y las ventanas de chat con leads existentes permanecen abiertos y completamente funcionales para no interrumpir transacciones en curso.  
* Sin embargo, la agencia pierde inmediatamente la facultad de publicar nuevos paquetes de viajes en el catálogo o de ingresar nuevos leads a su flujo comercial.  
* Si se cumplen los 15 días naturales sin que se liquide el adeudo, el backend modificará el estado del tenant a quota\_exhausted o Suspendido por Pago, retirando toda visibilidad pública en el marketplace\[cite: 1, 5\].

## **2\. PARTE 1: FRONTEND, EXPERIENCIA DE USUARIO (UX/UI) Y PORTALES**

El componente orientado al cliente se desarrollará como una **Single Page Application (SPA)** de alta velocidad utilizando **React**, **Tailwind CSS** y **Lucide React** para la iconografía, garantizando una interfaz fluida, responsiva y modular.

### **2.1 Lineamientos Visuales, Estética y Usabilidad**

* **Paleta de Colores Institucional:** Uso obligatorio de Verdes para evocar frescura y dinamismo (\#10B981, \#059669), Azules para transmitir confianza, seguridad y profesionalismo (\#1E40AF, \#3B82F6), combinados con fondos en Blanco y Tonos Neutros Claros (\#F9FAFB).  
* **Enfoque de Experiencia (Aesthetics):** Estética limpia, intuitiva y marcadamente familiar. Se prohíbe explícitamente saturar la interfaz de opciones, utilizar layouts rígidos o implementar carteles rojos de urgencia o escasez agresiva inspirados en portales de reserva tradicionales. Se priorizará el uso estratégico del espacio en blanco, tipografías redondeadas y micro-interacciones suaves que simplifiquen la usabilidad.

### **2.2 Vista Pública del Viajero (Marketplace \- B2C)**

* **Módulo Hero y Buscador Inteligente:** Incorpora una caja de texto centralizada para la entrada de lenguaje natural que se conecta de forma directa con un agente conversacional de Inteligencia Artificial configurado sobre el modelo gemini-2.5-flash.  
* **Botón de Inspiración:** Elemento interactivo **"Inspiración ✨"** que sugiere destinos automáticos basándose en el estado de ánimo o el presupuesto explícitamente ingresado por el usuario.  
* **Catálogo de Paquetes (Formato Flyer Estricto):** Cuadrícula dinámica responsiva optimizada para renderizar hasta 4 elementos por fila en pantallas de escritorio.  
* **Diseño de Tarjetas de Viaje:** Las tarjetas utilizarán un **Formato Flyer estricto con una relación de aspecto vertical rígida de 3:4** (aspect-\[3/4\]). La imagen del flyer debe ser el elemento absoluto de la tarjeta; los datos esenciales del paquete (Título, Agencia, Precio base y Moneda) se renderizan superpuestos en la base mediante un degradado oscuro semitransparente (bg-gradient-to-t).  
* **Filtros Interactivos:** El filtro de precios operará con actualización de estado local e inmediata en el cliente para evitar cualquier latencia de recarga de red.  
* **Detalle con IA:** Un modal flotante premium se activa al hacer clic en un flyer, el cual integra el botón **"Generar Itinerario con IA ✨"** para renderizar un plan detallado día por día consumiendo inteligencia artificial.  
* **Navegación Global:** Barra fija superior con efecto de *glassmorphism* activo mediante scroll. El menú de hamburguesa para resoluciones móviles implementará una animación nativa por CSS que transforma tres líneas físicas en una "X" al abrirse.

### **2.3 Flujos de Autenticación y Gestión de Carrito**

* **Navegación y Carrito en Modo Invitado (Guest Mode):** El viajero final puede navegar libremente por el marketplace, aplicar filtros y **añadir paquetes al carrito de compras de manera 100% anónima**, sin requerir registros previos.  
* **Persistencia Local:** La gestión del carrito en modo invitado se realiza exclusivamente en el lado del cliente utilizando el estado de React sincronizado en LocalStorage.  
* **Comportamiento de Autenticación Condicional (Checkout Guard):** El uso de las funciones de Inteligencia Artificial (Buscador semántico e Itinerarios) y la acción de hacer clic en los botones "Proceder al Pago" o "Reservar" gatillarán un *Auth Guard* en el frontend. El registro o inicio de sesión será **estrictamente obligatorio** para completar estas acciones.  
* **Fusión de Datos (Merge):** Tras una autenticación exitosa mediante Google OAuth o credenciales estándar, el backend ejecutará un proceso de fusión que transferirá los elementos del LocalStorage a la base de datos relacional del usuario sin perder su selección previa.  
* **Separación de Accesos en Login:** El modal unificado de autenticación contará con dos opciones y botones de interacción claros: uno enfocado a usuarios finales ("Iniciar Sesión / Registrarse") y otro exclusivo para agencias de viajes ("Soy Agencia"). Esto permite orientar la validación directamente hacia las tablas de inquilinos correspondientes y habilitar el soporte multi-perfil.
* **Redirección Post-Login por Rol:** Al autenticarse exitosamente, el sistema evalúa el rol del usuario en su perfil antes de redirigir. Si el usuario es identificado como agencia (Agency\_Admin o colaborador con tenant\_id activo), se redirige de forma inmediata al **Dashboard de Gestión de la Agencia** (`/agency/dashboard`), sin pasar por la vista pública del marketplace. Si el usuario es un viajero final, se redirige al Home público (`/`). La redirección se ejecuta únicamente después de que el perfil del usuario se haya cargado completamente para garantizar que el rol evaluado sea el correcto y evitar redirecciones prematuras por estado asíncrono del perfil.

### **2.4 Portal Privado de Agencia ("Soy Agencia" \- B2B)**

* **Acceso Restringido Estricto:** Bloqueado detrás de un middleware de autenticación frontend (ProtectedRoutes) que valida de forma obligatoria los roles de nivel de agencia (Agency\_Admin o roles colaboradores creados internamente)\[cite: 1, 3\]. Cada agencia dispone de un espacio de trabajo aislado.  
* **Módulo de Registro Corporativo:** Formulario estructurado para capturar los datos legales y operativos descritos a continuación en la sección 2.4.1. El registro no se completa hasta que todos los campos obligatorios hayan sido validados y aprobados por el sistema.

##### 2.4.1 Requisitos Fiscales, Financieros y Legales para el Registro de Agencia

Para registrar una nueva agencia en Avimo, el proceso requiere el cumplimiento de diversos requisitos fiscales, financieros y legales diseñados para garantizar la seguridad y profesionalismo dentro de la plataforma. A continuación, se detallan los elementos necesarios para completar el Registro Corporativo:

**1. Información Fiscal y Legal (Mercado México)**

Es obligatorio proporcionar los datos legales de la empresa a través del formulario de registro, incluyendo:

* **Nombre Comercial y Logotipo:** Nombre comercial registrado de la agencia. Se requiere un logotipo en alta resolución (mínimo 1024x1024 px, formato PNG con fondo transparente). Ambos serán visibles públicamente en el marketplace.
* **RFC (Registro Federal de Contribuyentes):** Con formato válido para México: 12 caracteres para persona moral (3 letras + 6 dígitos + 3 caracteres alfanuméricos) o 13 caracteres para persona física (4 letras + 6 dígitos + 3 caracteres alfanuméricos). Se aplica validación en frontend mediante expresión regular antes del envío y validación en backend contra el servicio de verificación de RFC del SAT a través de la API de Facturama.
* **Dirección Física Completa:** Calle, número exterior, número interior (opcional), colonia, código postal, municipio/alcaldía, estado. Este dato es obligatorio para la creación de cuentas Express/Custom en Stripe Connect.
* **Constancia de Situación Fiscal (CSF) en formato PDF — Requisito Obligatorio:** Debe cargarse en formato PDF legible y vigente (no mayor a 3 meses de antigüedad). Es requisito indispensable para habilitar el timbrado automatizado de facturas electrónicas (CFDI) a través de la API de Facturama. Sin CSF validada, el tenant no podrá emitir facturas de comisiones ni operar transacciones financieras. El archivo se almacena en bucket privado con acceso exclusivo mediante signed URLs (no público).
* **Certificación Turística Oficial:** Se debe indicar el tipo de certificación (por ejemplo: RNT — Registro Nacional de Turismo, IATA, CLIA, AMAV, SECTUR) y proporcionar la clave o folio de certificación correspondiente. Es un campo obligatorio; las agencias sin certificación turística oficial no pueden completar el registro.
* **Aceptación de Términos y Condiciones:** Checkbox obligatorio de aceptación de los Términos de Uso de la Plataforma, la Política de Privacidad y el acuerdo de comisión del 13% + IVA sobre transacciones procesadas. El registro no se finaliza sin esta aceptación explícita.  
* **Dashboard de Control Interno:** Panel privado que renderiza métricas limpias y aisladas (clics en flyers, leads generados, estado del flujo de ingresos de Stripe Connect y facturación SaaS de Stripe Billing) basados exclusivamente en el contexto de la agencia autenticada\[cite: 1, 3\].  
* **Formulario de Nuevo Flyer:** Componente con validación estricta en el cliente. Campos requeridos: Título del viaje, Región/Destino, Precio Base, selector de divisa, área de arrastre (*drop-zone*) conectada a almacenamiento en la nube y un selector binario (Switch) para **"Coordinador"**\[cite: 1, 3\]. Al activarse, inyecta en el catálogo público una etiqueta verde "Con Coordinador"; de lo contrario, renderiza una etiqueta gris "Sin Coordinador".

### **2.5 CRM Integrado — Arquitectura, Diseño y Funcionamiento**

La plataforma incorpora un sistema de gestión de relaciones con clientes (CRM) integrado nativamente en PostgreSQL, eliminando la dependencia de sistemas externos. Este CRM está diseñado específicamente para agencias de viajes y opera sobre las mismas tablas y políticas RLS que el resto de la plataforma, garantizando aislamiento multi-tenant y cero latencia de red externa.

#### **2.5.1 Visión General y Decisión Arquitectónica**

El CRM fue diseñado como un módulo nativo de la plataforma en lugar de integrar un CRM externo por tres razones fundamentales:

* **Cero Latencia:** Todas las consultas se ejecutan directamente sobre PostgreSQL sin saltos de red a servicios externos. Un agente visualiza leads, aplica filtros y abre detalles en milisegundos.
* **Multi-Tenant Nativo:** Cada fila de `crm_leads` pertenece a un `tenant_id`. Las políticas RLS garantizan que una agencia nunca vea leads de otra, sin necesidad de un gateway de proxy externo.
* **Integración Profunda con Chat:** El CRM y el chat en tiempo real comparten la misma base de datos. La columna `crm_leads.conversation_id` vincula directamente un lead con su conversación en Supabase Realtime, permitiendo que el agente tome control del chat con un solo clic.

El CRM se compone de **4 tablas PostgreSQL**, **3 triggers automatizados**, **1 función PL/pgSQL de asignación round-robin**, **6 Edge Functions** y **6 componentes React** en el frontend.

#### **2.5.2 Base de Datos — Esquema del CRM**

**Tabla: `crm_leads`** — Entidad principal del lead. Cada fila representa un viajero que ha mostrado interés en un paquete turístico.

| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `lead_id` | UUID PK | Identificador único del lead |
| `tenant_id` | UUID FK → agencies\_tenants | Agencia propietaria del lead (alcance multi-tenant) |
| `traveler_user_id` | UUID FK → profiles | Viajero que solicitó información |
| `package_id` | UUID FK → travel\_packages | Paquete sobre el que se consultó |
| `assigned_to` | UUID FK → profiles | Agente asignado por round-robin |
| `status` | VARCHAR(50) | Pipeline: new, contacted, qualified, proposal\_sent, won, lost |
| `source` | VARCHAR(50) | Origen: marketplace, chat, referral, other |
| `priority` | VARCHAR(20) | Prioridad: low, medium, high |
| `number_of_travelers` | INT | Extraído por IA durante cualificación |
| `preferred_travel_dates` | VARCHAR(100) | Fechas preferidas extraídas por IA |
| `estimated_budget` | NUMERIC(12,2) | **Campo requerido para completar cualificación.** Inicia en 0, la IA lo extrae del chat |
| `budget_currency` | VARCHAR(3) | Moneda del presupuesto (default MXN) |
| `travel_type` | VARCHAR(50) | Tipo de viaje extraído por IA |
| `traveler_origin` | VARCHAR(100) | Ciudad de origen del viajero |
| `preferred_airline` | VARCHAR(100) | Aerolínea preferida |
| `accommodation_type` | VARCHAR(50) | Tipo de alojamiento preferido |
| `special_requirements` | TEXT | Requerimientos especiales |
| `ai_qualification_progress` | JSONB | Espejo en tiempo real de los campos extraídos por IA |
| `ai_qualification_completed` | BOOLEAN | TRUE cuando el presupuesto fue extraído |
| `conversation_id` | UUID | Puente directo con la tabla de chat\_messages |
| `notes` | TEXT | Notas internas del agente |
| `created_at` | TIMESTAMPTZ | Fecha de creación |
| `updated_at` | TIMESTAMPTZ | Actualizado automáticamente por trigger |

Índices: `tenant_id`, `assigned_to`, `status`, `package_id`, `conversation_id`.

**Tabla: `crm_activities`** — Timeline de actividades del lead. Cada evento (creación, cambio de estado, nota, asignación, extracción de IA) genera una fila.

| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `activity_id` | UUID PK | |
| `lead_id` | UUID FK → crm\_leads | Lead al que pertenece |
| `agent_id` | UUID FK → profiles | Agente que realizó la acción (NULL = sistema) |
| `activity_type` | VARCHAR(50) | Tipo: note, status\_change, assignment, created, ai\_extraction |
| `description` | TEXT | Resumen legible de la actividad |
| `metadata` | JSONB | Contexto estructurado (old\_status, new\_status, campos extraídos) |
| `created_at` | TIMESTAMPTZ | |

**Tabla: `crm_ai_qualification_sessions`** — Controla el estado de la sesión de cualificación por IA para cada lead.

| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `session_id` | UUID PK | |
| `lead_id` | UUID FK → crm\_leads | Lead en cualificación |
| `conversation_id` | UUID | Conversación de chat vinculada |
| `fields_extracted` | JSONB | Campos acumulados extraídos hasta el momento |
| `fields_pending` | TEXT[] | Campos que aún no se han capturado |
| `status` | VARCHAR(50) | active, completed, abandoned |
| `created_at` | TIMESTAMPTZ | |
| `completed_at` | TIMESTAMPTZ | Se establece al completar o abandonar |

**Tabla: `crm_agent_assignment_queue`** — Una fila por agencia. Almacena el último agente que recibió un lead para implementar round-robin.

| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `tenant_id` | UUID PK/FK | Una fila por agencia |
| `last_assigned_agent_id` | UUID | Último agente que recibió un lead |
| `updated_at` | TIMESTAMPTZ | |

#### **2.5.3 Triggers Automatizados de Base de Datos**

El CRM utiliza 3 triggers PostgreSQL que garantizan integridad y trazabilidad sin depender de las Edge Functions:

1. **`tr_crm_lead_updated_at`:** BEFORE UPDATE sobre `crm_leads`. Actualiza `updated_at = NOW()` en cada modificación.
2. **`tr_log_lead_status_change`:** AFTER UPDATE sobre `crm_leads`. Cuando `status` cambia (OLD ≠ NEW), inserta automáticamente una fila en `crm_activities` con `activity_type = 'status_change'` y metadata conteniendo `old_status` y `new_status`. Esto garantiza que cada transición de pipeline quede registrada incluso si el cambio se hace por múltiples vías (Edge Function, RPC, o actualización directa).
3. **`tr_notify_agent_on_lead_assignment`:** AFTER UPDATE sobre `crm_leads`. Cuando `assigned_to` cambia y el nuevo valor no es NULL, inserta una notificación en la tabla `notifications` dirigida al agente asignado, alertándole en tiempo real en su dashboard.

#### **2.5.4 Pipeline de Status de Leads**

El lead atraviesa un pipeline de 6 estados que refleja su ciclo de vida comercial:

```
new ──> contacted ──> qualified ──> proposal_sent ──> won
  │                                                      │
  └──────────────────> lost <────────────────────────────┘
```

| Status | Significado | Asignado por | Disparador |
| :--- | :--- | :--- | :--- |
| **new** | Lead recién creado, sin interacción aún | `create-lead` Edge Function | Viajero hace clic en "Solicitar información" |
| **contacted** | La IA envió al menos un mensaje de cualificación | `ai-qualify-lead` (automático) | Viajero responde al mensaje inicial de la IA |
| **qualified** | Presupuesto extraído. Lead listo para propuesta humana | `ai-qualify-lead` (automático) | IA extrae `estimated_budget` del chat |
| **proposal\_sent** | El agente envió una cotización formal al viajero | Manual (agente vía `update-lead-status`) | Agente prepara y envía propuesta |
| **won** | Venta cerrada exitosamente | Manual (agente con confirmación) | Viajero completa el pago |
| **lost** | Lead perdido (no interesado, competencia, etc.) | Manual (agente con confirmación) | Viajero declina o no responde |

Los estados `won` y `lost` son terminales. Al alcanzarlos, cualquier sesión de IA activa se cierra automáticamente (`completed` para won, `abandoned` para lost).

#### **2.5.5 Pre-Calificación Automatizada con IA (Gemini 2.5 Flash)**

El CRM incorpora un agente conversacional de IA que califica leads de forma autónoma antes de que intervenga un agente humano. El flujo completo es:

**Fase 1 — Creación del Lead (Edge Function `create-lead`):**
1. El viajero navega el marketplace, ve un flyer y hace clic en "Solicitar información".
2. `create-lead` crea un registro en `crm_leads` con `status = 'new'`, `source = 'marketplace'` y `estimated_budget = 0`.
3. Genera un `conversation_id` (UUID) que vincula el lead con el chat.
4. Invoca la función PL/pgSQL `assign_lead_round_robin(tenant_id, lead_id)` que asigna el lead al siguiente agente disponible.
5. Crea una sesión en `crm_ai_qualification_sessions` con `status = 'active'` y los 7 campos listados como pendientes.
6. Inserta dos mensajes en `chat_messages`: un mensaje `[SYSTEM]` con el contexto de creación, y un saludo personalizado de la IA: *"Hola {nombre}! Soy asesor de viajes y estoy aquí para ayudarte con el paquete '{título}' ({región}). ¿Qué te gustaría saber?"*
7. Retorna `{ lead_id, conversation_id, assigned_to }` al frontend, que redirige al viajero a `/chat`.

**Fase 2 — Cualificación Iterativa (Edge Function `ai-qualify-lead`):**
1. Cada vez que el viajero envía un mensaje en el chat, el frontend (`Chat.tsx`) invoca `ai-qualify-lead` con `{ lead_id, conversation_id, latest_message }`.
2. La Edge Function construye un prompt para Gemini 2.5 Flash que incluye:
   - Nombre de la agencia y detalles del paquete (título, región, precio).
   - Campos ya extraídos (de `ai_qualification_progress`) para evitar preguntar dos veces lo mismo.
   - Últimos 30 mensajes del chat (excluyendo `[SYSTEM]`) como contexto conversacional.
   - Reglas de comportamiento: máximo 2 preguntas por mensaje, nunca revelar que es IA, responder en español, ser conciso y natural.
3. Gemini responde en formato JSON estructurado (`responseMimeType: application/json`) con:
   - `reply`: texto de respuesta para el viajero.
   - `extracted_fields`: campos nuevos detectados en el mensaje (ej. `{ "estimated_budget": "15000", "travel_type": "Playa" }`).
   - `should_transfer_to_human`: true si el viajero pide explícitamente hablar con una persona.
4. Los campos extraídos se fusionan con los existentes en `ai_qualification_progress` (JSONB) y se escriben también en las columnas tipadas individuales de `crm_leads`.
5. El presupuesto se parsea con regex `/[\d.]+/` para extraer el valor numérico del texto.
6. Cuando `estimated_budget` deja de ser NULL/0, la cualificación se marca como `completed`, el lead pasa automáticamente a `status = 'qualified'`, y se notifica al agente asignado.
7. La respuesta de la IA se inserta en `chat_messages` usando el `sender_id` del agente asignado, haciendo que la IA aparezca como el agente humano en la conversación.

**Parámetros del modelo:**
- Modelo: `gemini-2.5-flash`
- Temperature: 0.7
- Top-P: 0.9
- Max Output Tokens: 1024
- Response MIME Type: `application/json`
- Response Schema: JSON Schema tipado con campos requeridos `reply`, `extracted_fields`, `should_transfer_to_human`

**Criterio de compleción:** La cualificación se considera completa cuando el campo requerido `estimated_budget` tiene un valor no nulo y no vacío. Los 6 campos opcionales (`number_of_travelers`, `preferred_travel_dates`, `travel_type`, `traveler_origin`, `preferred_airline`, `accommodation_type`) se siguen extrayendo de forma oportunista pero no bloquean la compleción.

#### **2.5.6 Asignación Round-Robin de Agentes**

La función PL/pgSQL `assign_lead_round_robin(p_tenant_id UUID, p_lead_id UUID)` implementa asignación circular equitativa:

1. Obtiene todos los perfiles del tenant con roles `Agency_Admin`, `Agency_Agent` o `Agency_Collaborator`, ordenados por `id`.
2. Consulta `crm_agent_assignment_queue` para obtener el `last_assigned_agent_id`.
3. Si no hay asignación previa, selecciona el primer agente de la lista.
4. Si existe asignación previa, localiza su posición en la lista y selecciona el siguiente (con wrap-around al inicio si es el último).
5. Actualiza `crm_agent_assignment_queue` con el nuevo `last_assigned_agent_id`.
6. Actualiza `crm_leads.assigned_to` con el agente seleccionado.
7. Retorna el UUID del agente asignado.

**Casos borde:**
- Si el tenant no tiene agentes registrados, retorna NULL y el lead queda sin asignar.
- Si un agente fue eliminado del tenant, el algoritmo avanza al siguiente en la lista (no se estanca).

#### **2.5.7 Integración Chat ↔ CRM**

La integración entre el chat en tiempo real y el CRM es bidireccional y opera sobre tres puntos de contacto:

1. **Creación de lead desde flyer:** `PackageDetailPage` → `create-lead` → redirección a `/chat?conversationId=X&leadId=Y`. El chat se abre directamente en el contexto del lead recién creado.
2. **Procesamiento IA en cada mensaje:** `Chat.tsx` detecta si existe un `leadId` activo en el estado de la ruta. Después de cada mensaje del viajero, invoca `ai-qualify-lead` y muestra la respuesta de la IA en el chat. Muestra un indicador "IA escribiendo..." durante el procesamiento. Cuando la cualificación se completa o el agente toma control, desactiva las llamadas a IA.
3. **Toma de control por el agente:** Desde `LeadDetailModal`, el botón "Tomar control del chat" invoca `transfer-lead-to-human`. Esto:
   - Marca la sesión de IA como `abandoned`.
   - Inserta un mensaje `[SYSTEM]` en el chat: *"{agente} ha tomado el control de la conversación."*
   - En el lado del viajero, `Chat.tsx` detecta que la sesión fue abandonada y deja de invocar `ai-qualify-lead`.

El campo `crm_leads.conversation_id` actúa como puente único entre ambos sistemas. No hay replicación de datos ni sincronización externa.

#### **2.5.8 Control de Acceso y RBAC del CRM**

El acceso a los leads está gobernado por dos capas de seguridad:

| Rol | Visibilidad | Permisos |
| :--- | :--- | :--- |
| **Agency\_Admin** | Todos los leads del tenant | CRUD completo: ver, cambiar status, agregar notas, reasignar |
| **Agency\_Agent / Colaborador** (default) | Solo leads donde `assigned_to = user.id` | Ver detalles, cambiar status, agregar notas |
| **Agency\_Agent / Colaborador** con `can_view_global_leads = TRUE` | Todos los leads del tenant | Ver detalles, cambiar status, agregar notas |

**Doble capa de seguridad:**
1. **Base de datos (RLS):** La política `"Agentes ven leads asignados o globales"` en PostgreSQL restringe las filas visibles según `assigned_to` y `can_view_global_leads`.
2. **Frontend (query filter):** `AgencyCRM.tsx` aplica `.eq("assigned_to", user.id)` cuando `canViewAll === false`, como defensa en profundidad.

#### **2.5.9 UI/UX — Componentes del Frontend del CRM**

El CRM se renderiza en la ruta `/agency/crm`, accesible desde la barra de navegación del dashboard de la agencia. Se compone de 6 componentes React:

| Componente | Propósito | Funcionalidades clave |
| :--- | :--- | :--- |
| **`AgencyCRM.tsx`** | Página principal del CRM | Grid responsivo de 1-3 columnas de LeadCards. Filtros por status y prioridad. Búsqueda textual en memoria (nombre, paquete, región). Toggle para mostrar/ocultar dashboard de métricas. Suscripción a Supabase Realtime con debounce de 500ms. Límite actual: 100 leads (paginación en roadmap). |
| **`CRMMetricsDashboard.tsx`** | Panel de KPIs | 6 tarjetas: Total Leads, Tasa de Conversión (%), Leads Ganados, Leads Nuevos, Pipeline Total (MXN), Ingresos Ganados (MXN). 2 gráficos: Leads por Mes (barras, últimos 6 meses), Distribución por Status (barras horizontales con porcentaje). Leads por Fuente (grid de 4 columnas). Cálculo 100% cliente. |
| **`LeadCard.tsx`** | Tarjeta resumen de lead | Nombre del viajero, paquete (título + región), status badge coloreado, tiempo relativo de creación, presupuesto formateado. Barra de progreso de cualificación IA. Click abre LeadDetailModal. |
| **`LeadDetailModal.tsx`** | Modal de detalle completo (tamaño XL) | Status selector con confirmación para won/lost. Datos del viajero y paquete en grid 2 columnas. Campos extraídos por IA con iconos. Requerimientos especiales (card ámbar). Barra de progreso IA con pills por campo (verde = extraído, gris = pendiente, rojo = presupuesto faltante). Botón "Tomar control del chat". Timeline de actividades (notas, cambios de estado, asignaciones, extracciones IA) con scroll. Input para agregar notas. |
| **`LeadFilters.tsx`** | Barra de filtros | Dos dropdowns controlados: Status (todos los estados + "Todos") y Prioridad (low/medium/high + "Todas"). Estado completamente stateless. |
| **`AIQualificationProgress.tsx`** | Barra de progreso de cualificación | Barra horizontal con porcentaje y transición animada. 7 pills (1 requerido + 6 opcionales): verde con "+" para campos extraídos, gris con "-" para pendientes, rojo con "*" cuando falta el presupuesto. |

#### **2.5.10 Edge Functions del CRM**

El backend del CRM se compone de 6 Edge Functions (Deno/TypeScript) que orquestan la lógica de negocio:

| Endpoint | Método | Propósito | Disparador |
| :--- | :--- | :--- | :--- |
| `/functions/v1/create-lead` | POST | Crea lead, sesión IA, conversación y mensaje inicial. Invoca round-robin. Retorna 201. | Viajero click en "Solicitar información" |
| `/functions/v1/ai-qualify-lead` | POST | Procesa mensaje del viajero con Gemini, extrae campos, actualiza lead y sesión IA, inserta respuesta en chat. | Cada mensaje del viajero en chat con lead activo |
| `/functions/v1/update-lead-status` | POST | Cambia status del lead. Cierra sesión IA si es terminal (won/lost). El trigger DB registra la actividad. | Agente cambia status en LeadDetailModal |
| `/functions/v1/assign-lead` | POST | Reasigna manualmente un lead a otro agente del mismo tenant. Notifica al nuevo agente. | Admin reasigna lead (UI en roadmap) |
| `/functions/v1/transfer-lead-to-human` | POST | Agente toma control del chat. Abandona sesión IA. Inserta mensaje `[SYSTEM]`. Notifica al viajero. | Agente click en "Tomar control del chat" |
| `/functions/v1/add-lead-activity` | POST | Agrega nota o actividad manual al timeline del lead. | Agente escribe nota en LeadDetailModal |

## **3\. PARTE 2: COMUNICACIÓN, NOTIFICACIONES Y CHAT IN-APP**

La plataforma carece intencionalmente de medios de comunicación expuestos públicamente; se obliga al viajero y a la agencia a interactuar de manera exclusiva dentro de la SPA para resguardar la retención del usuario.

### **3.1 Arquitectura del Chat en Tiempo Real y Persistencia**

* **Motor del Chat:** Delegado e implementado sobre la infraestructura de **Supabase Realtime**, aprovechando conexiones de WebSockets síncronas para proveer mensajería instantánea sin sobrecargar los servidores de la API Gateway.  
* **Ciclo de Vida del Chat:** La conversación se mantiene completamente aislada dentro de las tablas de datos de nuestra plataforma central (sin replicar texto o mensajes históricos en sistemas externos). Las reglas de archivado automático operan bajo los siguientes estados comerciales:  
  * Si el lead asociado se marca como Perdido en el CRM, la ventana de chat se archiva automáticamente.  
  * Si el lead se marca como Ganado (Venta exitosa), el chat permanece abierto y completamente operativo para coordinar la logística, archivándose de forma automática únicamente cuando el viaje contratado concluya con base en la fecha de retorno establecida.

### **3.2 Motor de Censura de Datos de Contacto (Backend Middleware)**

Para salvaguardar las normas de la comunidad y forzar la transaccionalidad in-app, el backend implementa un middleware de inspección obligatoria de paquetes de texto antes de persistir cualquier mensaje en la base de datos o transmitirlo al receptor:

* **Filtro de Expresiones Regulares (Regex):** El sistema escaneará el texto buscando patrones correspondientes a números telefónicos (ej: \\+?\\d{10,13}), direcciones de correo electrónico, o intentos semánticos de evasión (escribir números con caracteres alfabéticos como "cinco cinco...").  
* **Censura en el Servidor:** Todo dato de contacto detectado será sustituido de forma irreversible por una cadena de asteriscos (\*\*\*) y el sistema inyectará un aviso automático dentro del chat indicando la infracción de los acuerdos de usuario.  
* **Política de Reincidencia Escalada:** La tabla de perfiles de usuario mantendrá un contador de infracciones. Al acumular exactamente **5 intentos de evasión de filtro**, el backend bloqueará temporalmente la facultad de enviar mensajes en el chat para ese usuario y despachará una alerta de auditoría inmediata al panel de control del SuperAdmin.

### **3.3 Orquestación de la Omnicanalidad (Triggers de Alerta)**

Las notificaciones se distribuyen a través de canales específicos para equilibrar la inmediatez de la conversión con los costos fijos asociados a la API de WhatsApp Business:

1. **Captura de Lead Básico:** Ocurre cuando un viajero interactúa con un flyer o completa el flujo inicial con el bot guiado de requerimientos. Detona una alerta **Push** en tiempo real en el Dashboard de la agencia e inyecta la entidad Lead en el CRM integrado. *Se excluye el canal de WhatsApp en este paso para mitigar costos de leads fríos.*  
2. **Mensaje Directo en el Chat In-App:** Envía una alerta **Push** instantánea si el agente de viajes se encuentra logueado y activo en la SPA. Si el agente permanece desconectado de la plataforma por un periodo continuo mayor a **5 minutos**, el backend dispara una notificación automatizada por **WhatsApp / Correo Electrónico (vía Resend o SendGrid)** alertándole sobre el mensaje en espera.  
3. **Confirmación Transaccional de Compra:** Al confirmarse con éxito el cobro de un anticipo en la pasarela, el sistema gatilla en paralelo: Notificación **Push** en el Dashboard de la agencia, **Correo electrónico** formal al viajero adjuntando el recibo de Stripe y el acuerdo contractual de condiciones, y un **Mensaje de WhatsApp automatizado** a ambas partes confirmando los detalles de la reservación.

### **3.4 Aplicaciones Móviles Nativas (Android & iOS)**

La plataforma contará con aplicaciones móviles nativas para Android e iOS, desarrolladas con React Native para maximizar la reutilización de código, acelerar el desarrollo y garantizar consistencia funcional entre plataformas.

**Estrategia de Desarrollo y Frameworks:**

* **Framework Principal:** React Native con Expo (managed workflow) para build y despliegue automatizado en App Store Connect y Google Play Console.
* **Lenguaje Base:** TypeScript en toda la base de código compartida, con módulos nativos en Swift/Kotlin únicamente para funcionalidades que requieran acceso directo a APIs de plataforma (notificaciones push, cámara, wallet, biométricos).
* **PWA como Respaldo Inmediato:** Mientras las apps nativas están en desarrollo, la SPA actual se distribuye como Progressive Web App (PWA) con soporte offline básico, instalable desde el navegador en ambos sistemas operativos. La PWA sirve como puente de disponibilidad hasta el lanzamiento de las apps nativas.

**Experiencia Nativa por Plataforma:**

*Android:*
* Material Design 3 (Material You) con theming dinámico que respeta los colores del sistema del usuario.
* Navegación con gestos predictivos (back gesture) integrada con React Navigation.
* Notificaciones push nativas vía Firebase Cloud Messaging (FCM).
* Integración con Google Wallet/Google Pay para pagos express en checkout.
* Splash Screen API nativa (Android 12+).
* Soporte para pantallas adaptables (foldables, tablets) mediante diseño responsivo con breakpoints.

*iOS:*
* Human Interface Guidelines (HIG) de Apple con navegación por tabs y gestos nativos (swipe back, pull to refresh).
* Notificaciones push nativas vía Apple Push Notification service (APNs).
* Integración con Apple Pay para pagos express en checkout.
* Face ID / Touch ID para autenticación biométrica en inicio de sesión.
* Haptic Feedback (UIImpactFeedbackGenerator) en micro-interacciones críticas: confirmación de compra, canje de puntos, agregar a favoritos.
* Widgets en Home Screen y Lock Screen: viajes próximos del usuario, ofertas destacadas del marketplace.
* Dynamic Island para estado de checkout en proceso y notificaciones de mensajes en chat (iPhone 14 Pro en adelante).

**Funcionalidades Compartidas (Ambas Plataformas):**

* **Sincronización en Tiempo Real:** Chat in-app, notificaciones de leads y actualizaciones de estado de compra mediante Supabase Realtime sobre WebSockets. Misma infraestructura de red que la versión web.
* **Modo Offline Parcial:** Consulta de flyers guardados en favoritos, historial de puntos y resumen de viajes próximos sin conexión a internet. Sincronización automática de datos al reconectar. Los datos offline se persisten mediante AsyncStorage con expiración de caché de 7 días.
* **Carga de Imágenes Optimizada:** Uso de FastImage (React Native) con caché agresiva de flyers en variantes thumbnail (listados) y HD (vista de detalle) según el contexto de visualización.
* **Cartera de Puntos (Avimo Puntos):** Visualización de saldo, historial de acumulaciones y canjes, y aplicación de puntos como método de pago parcial durante el checkout, con la misma lógica de negocio que la versión web.
* **Cámara para Documentos:** Subida de CSF, comprobantes de pago y otros documentos oficiales directamente desde la cámara del dispositivo con recorte y enderezado automático mediante react-native-vision-camera.
* **Deep Linking Universal:** Soporte para esquemas de URL avimo:// en Android y Universal Links (apple-app-site-association) en iOS para abrir flyers específicos, completar checkouts pendientes o acceder a conversaciones de chat directamente desde notificaciones push o enlaces externos.

**Rendimiento y Optimización:**

* Hermes Engine (motor JavaScript de Meta) habilitado por defecto en Android para reducir tiempo de inicio y consumo de memoria. JavaScriptCore (JSC) optimizado en iOS.
* Listas virtualizadas con FlashList (Shopify) para catálogos con desplazamiento fluido a 60 FPS independientemente del número de flyers.
* Lazy loading de módulos pesados (cámara con visión artificial, mapas, reproductores multimedia) para minimizar el tamaño del bundle inicial.
* Bundles optimizados con tree-shaking y división por plataforma. Assets (imágenes, fuentes) servidos por separado.
* Telemetría de crashes con Sentry para ambas plataformas, con breadcrumbs de navegación para reproducción de errores.

**Distribución y CI/CD:**

* **Android:** Distribución vía Google Play Console con build automático desde GitHub Actions mediante Expo EAS Build. Canales de pruebas internas (alpha) y abiertas (beta) antes de producción.
* **iOS:** Distribución vía App Store Connect con TestFlight para beta testing externo (hasta 10,000 testers). Build automatizado mediante Expo EAS Build conectado a GitHub Actions. Perfiles de provisionamiento gestionados por EAS.
* **Actualizaciones Over-The-Air (OTA):** Expo EAS Update para desplegar parches de JavaScript sin pasar por revisión de tiendas. Exclusivo para cambios que no involucren código nativo (Swift/Kotlin). Permite resolver bugs críticos en minutos.
* **Versionado Semántico (MAJOR.MINOR.PATCH):** Sincronizado entre ambas plataformas. Cada build de producción genera un tag de versión en el repositorio y un changelog automático.

## **4\. PARTE 3: OPTIMIZACIÓN, COSTOS Y SEGURIDAD DE LA IA**

El motor inteligente utiliza el modelo de lenguaje de gran tamaño gemini-2.5-flash bajo un estricto esquema de seguridad perimetral para mitigar el riesgo de abuso financiero de infraestructura\[cite: 1, 2\].

### **4.1 Cuotas de Uso de IA y Rate Limiting**

* **Restricción de Acceso:** Se prohíbe el uso de cualquier función impulsada por Inteligencia Artificial a usuarios en modo invitado o anónimos; es mandatorio registrarse e iniciar sesión en la plataforma.  
* **Límite Diario de Generación:** Los usuarios finales con perfil de viajero registrado tienen un tope máximo de **5 itinerarios detallados generados por IA al día**.  
* **Mecánica de Bloqueo Escalado por Minuto:** Si un perfil de usuario realiza más de 3 peticiones de itinerario en un lapso menor a 60 segundos, el backend activará un bloqueo temporal registrado en memoria caché:  
  * *Primera infracción en el día:* Bloqueo de las funciones de IA por 15 minutos.  
  * *Segunda infracción en el día:* Bloqueo de las funciones de IA por 1 hora.  
  * *Tercera infracción en el día:* Suspensión total del servicio de IA y baneo de endpoints hasta el siguiente día calendario.  
* **Seguridad Perimetral:** Implementación obligatoria de capas de mitigación de ataques distribuidos (DDoS) mediante **Cloudflare** sobre la raíz de servicios /api/v1/\*, incorporando reglas de bloqueo geográfico estricto para peticiones masivas originadas fuera de México. El acceso a flujos de autenticación se valida mediante **Google reCAPTCHA v3**, analizando el comportamiento del usuario de forma invisible en background.

### **4.2 Estrategia de Caching Segmentado por Intereses**

Para optimizar el consumo de tokens de entrada y salida ante la API de Google, se implementa una estrategia de persistencia relacional en lugar de invocaciones bajo demanda repetitivas:

* **Flujo de Onboarding Obligatorio:** Antes de habilitar por primera vez el botón de generación de itinerarios con IA a un usuario registrado nuevo, la SPA desplegará de forma obligatoria un breve cuestionario interactivo de perfilamiento (intereses de viaje, actividades preferidas, rangos de presupuesto y estilo de turismo). Esta información se guarda en la tabla user\_recommendation\_profiles para calibrar el algoritmo relacional de recomendaciones del marketplace\[cite: 1, 6\].  
* **Caché por Clúster de Interés:** El backend no utilizará un caché global estático por paquete de viaje. La llave de indexación en la base de datos se estructurará combinando el identificador del paquete con el hash del clúster de intereses del usuario (package\_id:cluster\_interests\_hash). Si un viajero con perfil de "Aventura" solicita un itinerario para el Paquete X, Gemini genera la ruta integrando búsquedas recientes del destino para sugerir actividades contextualizadas. Los siguientes usuarios pertenecientes al mismo perfil que consulten ese mismo paquete recibirán el JSON en milisegundos de forma local con **costo de procesamiento cero**. Si la agencia edita los datos base del paquete, las llaves de caché vinculadas se invalidan de inmediato.  
* **Captura de Leads mediante Automatización Rígida:** Para la función de solicitud de cotizaciones personalizadas o consultas específicas de paquetes, la interacción inicial se procesará a través de un **bot guiado estructurado bajo árboles de decisión tradicionales basados en reglas fijas** (sin intervención de modelos fundacionales de IA). El bot recopila los campos obligatorios y deriva el lead de forma automática a las agencias con mayor afinidad en el CRM, controlando los costos fijos del backend.

### **4.3 Formato de Salida e Integridad de Datos**

El endpoint POST /api/v1/ai/generate-itinerary forzará al SDK de Gemini a responder utilizando un esquema JSON estructurado mediante *Structured Outputs* (responseSchema). En caso de latencias de red o de recibir un formato corrupto del modelo que no se alinee con la estructura tipada requerida por React, el backend omitirá reintentos automatizados en background para salvaguardar el tiempo de respuesta y arrojará directamente un mensaje controlado de error solicitando al usuario interactuar de nuevo.

## **5\. PARTE 4: GESTIÓN DE CONTENIDO Y MANEJO DE MULTIMEDIA**

El portal privado B2B obliga a mantener un formato estricto en la carga de imágenes para garantizar la consistencia visual del marketplace\[cite: 1, 7\].

### **5.1 Arquitectura de Carga mediante URLs Firmadas (Presigned URLs)**

Para evitar la saturación de ancho de banda y la degradación de latencia en la API Gateway central por la transferencia de archivos binarios pesados, se implementa un flujo de carga desacoplado utilizando la infraestructura de **Supabase Storage**:

1. El frontend invoca el endpoint ligero GET /api/v1/media/presigned-url firmando la sesión del agente.  
2. El backend genera un enlace seguro temporal (con expiración restringida a 5 minutos) directo hacia el bucket de almacenamiento en la nube.  
3. El frontend de la SPA intercepta la URL firmada y ejecuta un método PUT cargando el archivo del flyer **directamente desde el navegador del usuario hacia el bucket de almacenamiento**, puenteando y liberando de carga al servidor central.

### **5.2 Pipeline Obligatorio de Procesamiento de Imágenes (Sharp)**

Una vez que el archivo ha sido subido al almacenamiento temporal en la nube, se detona de forma mandatoria un *background worker* en el backend que procesará la multimedia utilizando la librería **Sharp** para asegurar la máxima fluidez de renderizado en redes móviles dentro de territorio mexicano:

* **Recorte de Proporción:** Fuerza de manera estricta el ajuste y recorte de la imagen a la relación de aspecto vertical **3:4**, evitando que flyers con dimensiones panorámicas desalineen la cuadrícula responsiva del catálogo\[cite: 1, 7\].  
* **Compresión y Transformación de Formato:** El pipeline comprime la imagen original y la transforma a formatos de última generación eficientes: **WebP** para compatibilidad general de navegadores y **AVIF** para alcanzar la máxima compresión por kilobyte.  
* **Generación de Variantes de Resolución:** El microservicio creará e indexará automáticamente dos versiones del archivo: una miniatura (*thumbnail*) de baja resolución optimizada para las tarjetas de búsqueda rápida en el home, y una variante de alta definición para el despliegue del modal detallado\[cite: 1, 7\].

### **5.3 Flujo de Publicación y Moderación**

* **Publicación Directa con Moderación Reactiva:** Al completar el formulario y dar clic en "Publicar", el flyer cambia inmediatamente a estado published y se renderiza en el marketplace público para acelerar la operación de las agencias\[cite: 1, 7\].  
* **Gobernanza de Contenido:** Si un viajero final utiliza los componentes del frontend para reportar una publicación por datos inapropiados o falsos, el sistema levanta un flag de auditoría inyectando el estado pending\_review\[cite: 1, 7\]. El SuperAdmin de la plataforma evaluará el caso desde el panel central para otorgar el visto bueno o aplicar un baneo definitivo del paquete, notificando los motivos a la agencia. *Se establece en el mapa de ruta técnico la integración futura de la API de Google Cloud Vision para automatizar de manera predictiva este escaneo antes de la publicación pública.*

### **5.4 Ciclo de Vida del Contenido Expirado**

Cuando un paquete de viaje supera la fecha límite establecida para la salida del itinerario, el backend no eliminará el registro ni destruirá los archivos multimedia de forma inmediata. El sistema modificará de forma automatizada el estado de publicación a concluded, inyectando visualmente en el marketplace una etiqueta restrictiva de **"Viaje Concluido"**. El flyer permanecerá indexado públicamente durante **un año completo (365 días)** para actuar como portafolio histórico y prueba social del éxito operativo de la agencia. Transcurrido el año de vida, un proceso cronometrado (*cron job*) modificará el estatus a archived, eliminándolo de los servidores públicos y resguardándolo exclusivamente en el historial privado del dashboard de la agencia\[cite: 1, 7\].

## **6\. PARTE 5: ARQUITECTURA FINANCIERA Y LOGÍSTICA DE PAGOS**

### **6.1 Modelo de Fee Dividido (Viajero + Agencia)**

La plataforma opera bajo un modelo de fee dividido que separa la carga entre el viajero y la agencia, maximizando la transparencia, competitividad y cumplimiento fiscal.

* **Tarifa de Servicio al Viajero (6% IVA incluido):** Se agrega automáticamente al checkout como línea separada visible para el viajero. Cubre: procesamiento de pago (Stripe ~4.1% + IVA + $3 MXN), protección al viajero y costo operativo de la plataforma. El viajero ve el desglose completo con subtotal e IVA (16%) en el checkout y en el recibo de compra enviado por email.  
* **Comisión a la Agencia (8% + IVA = 9.28% efectivo):** Se retiene del precio del paquete publicado por la agencia (que por contrato debe incluir IVA). El IVA (16% sobre el 8%) es acreditable para la agencia vía CFDI emitido por Avimo a través de Facturama. Costo neto real para la agencia: ~8.0% después de acreditar el IVA. La agencia NUNCA ve la tarifa de servicio del viajero en su dashboard.  
* **Absorción de Tarifas de Stripe:** Las tarifas de Stripe se descuentan del 6% de service fee cobrado al viajero, no de la comisión de la agencia. La plataforma absorbe cualquier diferencia como gasto operativo. **La agencia NO paga tarifas de Stripe.**

**Ejemplo — Venta de $10,000 MXN (IVA incluido):**

| Concepto | Cálculo | Monto |
| :--- | :--- | :--- |
| Precio del paquete (IVA incluido) | — | **$10,000.00** |
| Subtotal paquete | $10,000 / 1.16 | $8,620.69 |
| IVA paquete (16%) | | $1,379.31 |
| Tarifa de servicio Avimo (6% IVA incluido) | $10,000 × 6% | **$600.00** |
| Subtotal service fee | $600 / 1.16 | $517.24 |
| IVA service fee (16%) | | $82.76 |
| **Total cobrado al viajero** | | **$10,600.00** |

| Destino | Cálculo | Monto |
| :--- | :--- | :--- |
| **Agencia** (vía Split de Stripe Connect) | $10,000 − 9.28% | **$9,072.00** |
| **Avimo** (application\_fee\_amount) | $600 + $928 | **$1,528.00** |

| Concepto | Monto |
| :--- | :--- |
| Stripe: 4.1% × $10,600 + $3 MXN | $437.60 |
| IVA sobre Stripe (acreditable) | $70.02 |
| Total costo Stripe | $507.62 |
| **Neto Avimo en caja** | **$1,020.38 (~10.2%)** |

**Obligaciones IVA:**

| Origen | IVA a enterar al SAT | IVA acreditable | Neto |
| :--- | :--- | :--- | :--- |
| Service fee viajero | $82.76 | — | +$82.76 |
| Comisión agencia (CFDI emitido) | $128.00 | — | +$128.00 |
| Stripe (CFDI de gasto recibido) | — | $70.02 | −$70.02 |
| **IVA neto a pagar al SAT** | | | **$140.74** |

* **Esquema de Split Payments (Stripe Connect):** La pasarela captura el monto total ($10,600 MXN en el ejemplo) y aplica split mediante `application_fee_amount`, reteniendo $1,528 MXN hacia Avimo (service fee + comisión agencia) y dispersando $9,072 MXN netos a la cuenta bancaria de la agencia.  
* **Blindaje contra Contracargos Bancarios (Disputes):** Al operar bajo el modelo Express/Custom de Stripe Connect, si un viajero inicia una disputa o contracargo directamente con su institución bancaria alegando fraude o incumplimiento, **la responsabilidad financiera y el saldo negativo resultante son transferidos íntegramente por Stripe al balance de la cuenta conectada de la agencia**. La plataforma SaaS queda totalmente exenta de absorber la pérdida monetaria de la disputa bancaria.  
* **Disclaimer para Agencias:** Como parte del registro corporativo, las agencias aceptan obligatoriamente el Compromiso de Precios con IVA, donde se comprometen a publicar todos los precios con IVA incluido (16%) y reconocen que Avimo retendrá el 9.28% de comisión efectiva sobre cada venta.

### **6.2 Planes de Pago Diferidos e Impagos B2C**

Las agencias tienen la facultad de habilitar planes de financiamiento con un **plazo máximo de 4 meses** para liquidar el viaje. La agencia es la única encargada de designar el porcentaje de anticipo inicial requerido en el checkout (estableciendo la plataforma una sugerencia mínima del 20%).

* **Gestión de Mensualidades:** Se implementa de forma estricta la **Opción B (Manual por enlace)**. El backend no realizará cobros recurrentes automatizados a la tarjeta del cliente. En su lugar, el motor de comunicación omnicanal enviará cada mes notificaciones automatizadas con un link exclusivo de Stripe Checkout para que el viajero ingrese y liquide su abono de forma manual.  
* **Corte Proporcional de Comisión:** La comisión correspondiente a la plataforma (8% + IVA = 9.28% efectivo) **se cobrará de manera proporcional (el 9.28% de cada abono)** conforme el usuario vaya pagando mes con mes, protegiendo el flujo de caja operativo de la agencia en el pago inicial del anticipo.  
* **Regla de Tolerancia por Morosidad y Cero Reembolsos:** En los acuerdos de usuario y términos legales que los viajeros aceptan de forma obligatoria para registrarse, se estipula un disclaimer explícito de **Cero Reembolsos**, ya que los fondos se dispersan de inmediato y las agencias comprometen el capital en apartados fijos de proveedores turísticos. Si un viajero se atrasa en su pago mensual, el backend le otorgará un **periodo de tolerancia de exactamente cinco días naturales (5 días) a partir de la fecha de corte**. Si el abono no se registra en ese lapso, la orden se actualiza automáticamente al estado de Cancelada por falta de pago. El sistema notificará de inmediato a la agencia, actualizará el estado en el CRM integrado y **los montos que el usuario ya había abonado se quedarán congelados a favor de la agencia de viajes de manera definitiva**, sin emisión de monederos electrónicos ni notas de crédito internas.

### **6.3 Delimitación de Responsabilidad Fiscal (CFDI México)**

* **Facturación de la Plataforma (B2B):** El backend automatizará el timbrado fiscal de facturas electrónicas (CFDI para el mercado de México) consumiendo la API externa de **Facturama**. El sistema emitirá los comprobantes fiscales correspondientes dirigidos a las agencias exclusivamente por el concepto de las comisiones del 8% + IVA (9.28% efectivo) retenidas por transaccionalidad de pasarela.  
* **Facturación del Viaje (B2C):** La emisión de facturas fiscales CFDI por el monto total del paquete de viaje o los anticipos aportados por los viajeros queda **100% bajo la responsabilidad operativa y legal de la agencia de viajes contratada** (siguiendo estrictamente el modelo de transacciones descentralizadas de Amazon). La plataforma SaaS no intervendrá en el timbrado ni en la conciliación fiscal de los servicios turísticos comercializados entre agencias y consumidores finales.

### **6.4 Sistema de Lealtad y Cartera Virtual (Avimo Puntos)**

La plataforma cuenta con un programa de lealtad donde los viajeros acumulan puntos por cada compra realizada en el marketplace. Los puntos se almacenan en una cartera virtual personal y pueden canjearse como método de pago parcial para nuevas compras. El valor de los puntos canjeados es absorbido por las arcas de la empresa (Avimo), sin impacto financiero para la agencia vendedora.

#### **6.4.1 Valor y Conversión de Puntos**

* **Valor del Punto:** Cada punto equivale exactamente a **$1.00 MXN** (un peso mexicano). La conversión 1:1 es deliberadamente simple para que el viajero entienda de inmediato el valor real de su saldo sin fricción cognitiva.  
* **Naturaleza:** La cartera virtual es personal, nominal e intransferible. Los puntos no son canjeables por dinero en efectivo bajo ninguna circunstancia.  
* **Vigencia:** Los puntos **no expiran**. Se mantienen en la cuenta del viajero de forma indefinida mientras su perfil de usuario permanezca activo en la plataforma.

#### **6.4.2 Reglas de Acumulación de Puntos**

Los puntos se ganan a través de las siguientes acciones dentro de la plataforma:

| Acción | Puntos Otorgados | Equivalencia en MXN | Notas |
| :--- | :--- | :--- | :--- |
| **Compra de Viaje** (por cada $100 MXN gastados) | 1 punto | $1.00 | Equivale a un 1% de cashback efectivo. Se acredita al confirmarse el pago exitoso (no en estado pending). |
| **Bono de Bienvenida** (al completar perfil de viajero + onboarding de intereses) | 5 puntos | $5.00 | Se otorga una sola vez por cuenta. Requiere haber llenado el cuestionario de perfilamiento de intereses (Sección 4.2). |
| **Bono por Referido** (por cada viajero referido que completa su primera compra) | 2 puntos | $2.00 | Se acredita al confirmarse el primer pago exitoso del referido. Sin límite de referidos. El referido debe usar el código o enlace único de referido al registrarse. |
| **Review Verificada Post-Viaje** (por review publicada tras la conclusión del viaje) | 1 punto | $1.00 | Se otorga una vez por viaje completado. La review debe pasar la validación de contenido antes de acreditar los puntos. |

* **Eventos Especiales con Multiplicador:** Durante las temporadas comerciales definidas por la plataforma (Buen Fin, Hot Sale, aniversario de Avimo), los puntos por compra se multiplican **x2** (2 puntos por cada $100 MXN gastados). Estos eventos son configurados manualmente por el SuperAdmin especificando fecha de inicio y fin, y se reflejan visualmente en el marketplace durante su vigencia.  
* **Compras a Plazos Diferidos:** En compras financiadas a meses, los puntos se otorgan de forma **proporcional en cada abono confirmado**, no en el anticipo inicial ni de forma total por adelantado. Esto protege a la plataforma de otorgar puntos por montos que el viajero podría nunca llegar a liquidar.

#### **6.4.3 Reglas de Canje de Puntos**

Los puntos acumulados pueden aplicarse como descuento directo en el checkout de una nueva compra, sujeto a las siguientes reglas:

| Regla | Valor |
| :--- | :--- |
| **Mínimo de puntos para canjear** | 200 puntos ($200.00 MXN) |
| **Cobertura máxima por compra** | 20% del valor total de la compra |
| **Límite máximo de acumulación** | 15,000 puntos ($15,000.00 MXN) |

* **Mecánica de Aplicación:** Los puntos se descuentan primero del subtotal de la compra antes de calcular la comisión del 13% + IVA. La comisión de la plataforma se aplica **únicamente sobre el remanente pagado con tarjeta u otro método de pago**, no sobre la porción cubierta con puntos.  
* **Ejemplo Práctico:** Compra de $5,000 MXN. El viajero decide canjear 500 puntos ($500 MXN, equivalente al 10% del total, dentro del límite del 20%). El subtotal pagado con tarjeta es de $4,500 MXN. La comisión del 13% + IVA (~15.08%) se calcula sobre $4,500 MXN = $678.60 MXN retenidos. La agencia recibe $3,821.40 MXN netos. Los $500 MXN canjeados son absorbidos por Avimo.  
* **Protección de la Agencia:** La agencia vendedora no se ve afectada financieramente por el canje de puntos del viajero. Recibe el total de la venta menos únicamente el 13% + IVA de comisión sobre el remanente pagado con tarjeta. Los puntos canjeados son cubiertos íntegramente por las arcas de la empresa.

#### **6.4.4 Control de Riesgo y Políticas de Reversión**

* **Reversión por Contracargo o Disputa:** Si se inicia un contracargo o disputa bancaria sobre una transacción, los puntos ganados en esa compra original se revierten automáticamente del saldo del viajero. Si el saldo disponible es insuficiente para cubrir la reversión, la cartera puede quedar en saldo negativo con un límite máximo de -200 puntos, el cual se descuenta de futuras acumulaciones hasta quedar en cero o positivo.  
* **Límite de Acumulación:** El saldo de puntos no puede exceder los 15,000 puntos. Si una acumulación llevaría el saldo por encima de este tope, los puntos excedentes se descartan y el sistema notifica al usuario que ha alcanzado el límite máximo.  
* **Puntos No Transferibles:** Los puntos están vinculados al user\_id del viajero y no pueden transferirse, venderse ni combinarse con la cartera de otro usuario.  
* **Ajuste de Programa:** La plataforma se reserva el derecho de modificar la tasa de acumulación, las reglas de canje y los eventos multiplicadores con previo aviso de al menos 30 días naturales a los usuarios registrados, notificado por correo electrónico y un banner informativo en el marketplace.

#### **6.4.5 Visualización en la Interfaz de Usuario**

* **Barra de Navegación:** El saldo actual de puntos se muestra en la barra de navegación superior del marketplace junto al ícono del carrito, visible únicamente para usuarios autenticados. El indicador utiliza un ícono de monedero o estrella acompañado del número de puntos.  
* **Pantalla de Checkout:** Durante el proceso de pago, el viajero visualiza su saldo disponible y un control deslizante (*slider*) o campo numérico para seleccionar cuántos puntos desea aplicar a la compra, con indicadores visuales del mínimo (200 pts) y máximo (20% del total de la compra) permitidos. El resumen del cargo se actualiza en tiempo real reflejando el descuento por puntos.  
* **Historial de Cartera:** En la sección de perfil del usuario, se despliega un registro cronológico completo de todas las transacciones de puntos (acumulaciones, canjes, reversiones, bonos) con fecha, concepto, cantidad de puntos y saldo resultante. Cada registro es trazable a la orden de compra o evento que lo originó.

### **6.5 Contabilidad Fiscal y Trazabilidad de Ingresos (Panel SuperAdmin)**

La plataforma incluye un módulo de contabilidad fiscal accesible exclusivamente desde el Panel SuperAdmin (`/admin`, pestaña "Fiscal"), diseñado para facilitar la declaración de impuestos ante el SAT y la trazabilidad financiera completa de la empresa. El módulo se divide en tres sub-pestañas: Ingresos, Egresos, y Periodos Fiscales.

#### **6.5.1 Registro Automático de Ingresos**

Cada pago exitoso en Stripe (`checkout.session.completed`) genera automáticamente dos registros en la tabla `fiscal_income_records`:

| Registro | Tipo | Contenido |
| :--- | :--- | :--- |
| Tarifa de servicio del viajero | `service_fee` | Subtotal sin IVA, IVA cobrado, fee de Stripe con su IVA acreditable, total |
| Comisión de la agencia | `agency_commission` | Subtotal sin IVA, IVA cobrado, total |

Cada registro incluye:
- **`order_id`:** Trazabilidad completa a la orden de compra original.
- **`stripe_fee` / `stripe_fee_iva`:** El costo de Stripe imputado a ese ingreso (solo en registros `service_fee`), permitiendo calcular el neto real.
- **`cfdi_status`:** Estado del CFDI (`pending`, `issued`, `cancelled`). La emisión de CFDI por comisiones a agencias se realiza vía Facturama en lote o individualmente.
- **`fiscal_period_id`:** Se asigna automáticamente al cerrar un periodo fiscal, vinculando el ingreso al periodo correspondiente.

La pestaña "Ingresos" del panel muestra KPIs (ingresos brutos, IVA cobrado, Stripe fees, IVA Stripe acreditable, neto real), filtros por tipo (`service_fee` / `agency_commission`), y tabla completa con todos los campos.

#### **6.5.2 Registro Manual de Egresos Operativos**

El SuperAdmin puede registrar egresos operativos manualmente en la tabla `fiscal_expense_records`. Cada egreso se categoriza en uno de los siguientes rubros:

| Categoría | Ejemplos |
| :--- | :--- |
| `infrastructure` | Supabase, hosting, dominio, Cloudflare |
| `ai_api` | API de Gemini, tokens de IA |
| `salaries` | Nómina, honorarios, contractor fees |
| `rent` | Oficina, coworking |
| `software` | Suscripciones SaaS, herramientas, licencias |
| `marketing` | Ads, contenido, redes sociales |
| `legal_accounting` | Contador, abogado, notario |
| `stripe_fees` | Fees de Stripe no cubiertos por service fee |
| `other` | Otros gastos operativos |

Cada egreso captura:
- **Proveedor y RFC:** Para respaldar la deducción fiscal ante el SAT.
- **Subtotal, IVA, Total:** Con cálculo automático del IVA (16% sobre subtotal).
- **CFDI del proveedor:** UUID y URL al PDF/XML para verificación.
- **Notas:** Campo libre para documentación adicional.

La pestaña "Egresos" muestra un formulario de registro, KPIs (egresos totales, IVA acreditable), gráfico de distribución por categoría, y tabla completa de egresos.

#### **6.5.3 Cierre de Periodos Fiscales**

La tabla `fiscal_periods` permite gestionar cierres mensuales, trimestrales y anuales. El flujo de cierre es:

1. **Generación de periodos:** El SuperAdmin genera periodos mensuales (o trimestrales/anuales) desde el panel.
2. **Acumulación automática:** Los `fiscal_income_records` y `fiscal_expense_records` se registran con `fiscal_period_id = NULL` hasta que el periodo se cierra.
3. **Cierre:** Al hacer clic en "Cerrar Periodo", la función PL/pgSQL `close_fiscal_period`:
   - Suma todos los ingresos y egresos del rango de fechas.
   - Calcula `iva_to_declare` = IVA cobrado − IVA acreditable (si es negativo → IVA a favor).
   - Calcula `isr_base` = (ingresos − egresos) sin IVA (base imponible para ISR).
   - Asigna `fiscal_period_id` a todos los registros del periodo.
   - Cambia el status del periodo a `closed`.
4. **Post-cierre:** El periodo cerrado puede marcarse como `declared` cuando se presenta la declaración al SAT.

La pestaña "Periodos" muestra tarjetas mensuales con los totales, el IVA a declarar, la base ISR, y botones de cierre. También incluye exportación CSV de todos los ingresos para contabilidad externa.

#### **6.5.4 Esquema de Tablas Fiscales**

| Tabla | Propósito | Acceso |
| :--- | :--- | :--- |
| `fiscal_income_records` | Ingresos automáticos por cada pago exitoso | Solo SuperAdmin (RLS) |
| `fiscal_expense_records` | Egresos manuales registrados por SuperAdmin | Solo SuperAdmin (RLS) |
| `fiscal_periods` | Periodos mensuales/trimestrales/anuales con totales | Solo SuperAdmin (RLS) |

**RPCs disponibles:**
- `calculate_period_totals(p_start DATE, p_end DATE)` — Calcula sumas de ingresos y egresos para un rango de fechas.
- `close_fiscal_period(p_period_id UUID)` — Cierra un periodo, calcula totales, asigna registros al periodo.
- `credit_points` / `debit_points` — Gestión de puntos de lealtad (Sección 6.4), con trazabilidad fiscal vía `wallet_transactions`.

**Cumplimiento Fiscal:**
- Todos los ingresos por service fee y comisiones generan IVA trasladado que debe enterarse al SAT.
- Todos los egresos con CFDI de proveedor generan IVA acreditable.
- Stripe emite CFDI por sus fees, cuyo IVA es acreditable para Avimo.
- La diferencia neta (IVA cobrado − IVA acreditable) es lo que se declara y paga al SAT en cada periodo.
- Las agencias reciben CFDI por las comisiones retenidas (8% + IVA), que acreditan contra sus propios impuestos.

## **7\. PARTE 6: ARQUITECTURA DE PERSISTENCIA E ENDPOINTS INTERNACIONALIZABLES**

### **7.1 Estrategia Multi-Tenant en Base de Datos (PostgreSQL RLS)**

La persistencia de datos opera sobre una base de datos única compartida utilizando un esquema compartido, implementando de manera mandatoria las políticas de **Row-Level Security (RLS) de PostgreSQL** para garantizar aislamiento absoluto de datos entre inquilinos comerciales y evitar fugas inter-empresariales. Toda tabla operativa que almacene datos sensibles del negocio de una agencia incluirá la columna indexada tenant\_id.

### **7.2 Normalización Internacionalizable (i18n / Horarios)**

* **Abstracción Financiera:** Se eliminan de las columnas operativas las referencias monetarias regionales (como precio\_mxn)\[cite: 1, 3\]. Se refactorizan a variables numéricas genéricas acompañadas por un código de divisa tipado bajo el estándar ISO 4217 (currency), dejando el sistema listo para operar en USD o EUR durante fases de expansión fuera de México.  
* **Abstracción del Tiempo:** Absolutamente todos los registros de auditoría, marcas de tiempo y fechas de salida/regreso de itinerarios se almacenarán obligatoriamente en formato **UTC** dentro de PostgreSQL. El frontend de la SPA en React será la capa encargada de convertir y renderizar las horas y fechas locales, tomando como eje de conversión geográfica **el lugar físico donde se encuentra registrada la agencia de viajes** para facilitar el entendimiento de la logística.

### **7.3 Diccionario de Tablas Core Robustecido**

#### **Tabla: agencies\_tenants**

Almacena las configuraciones generales del inquilino corporativo, sus credenciales fiscales de registro y sus relaciones con las pasarelas externas.

SQL  
CREATE TABLE agencies\_tenants (  
    tenant\_id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
    business\_name VARCHAR(255) NOT NULL,  
    rfc VARCHAR(13) NOT NULL,  
    address\_text TEXT NOT NULL, \-- Dirección física obligatoria para registro Connect  
    fiscal\_pdf\_url TEXT NOT NULL, \-- Constancia de Situación Fiscal en storage  
    certification\_key VARCHAR(100) NOT NULL, \-- Clave de certificación turística  
    stripe\_account\_id VARCHAR(255), \-- ID de Cuenta Express/Custom de Stripe Connect  
    stripe\_customer\_id VARCHAR(255), \-- ID de Cliente para Stripe Billing (SaaS). Dormant: suscripciones inactivas.  
    status VARCHAR(50) DEFAULT 'En Revisión', \-- En Revisión, Activo, Suspendido por Pago  
    subscription\_tier VARCHAR(50) DEFAULT 'Gratuito', \-- Gratuito, Comercial, Corporativo. Actualmente 'Comercial' por defecto para nuevas agencias. Planes Gratuito y Corporativo documentados para activación futura.  
    created\_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())  
);

#### **Tabla: custom\_roles\_permissions**

Gobierna la matriz granular de checkboxes que el administrador de la agencia activa para sus colaboradores (RBAC dinámico limitado por plan).

SQL  
CREATE TABLE custom\_roles\_permissions (  
    role\_id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
    tenant\_id UUID REFERENCES agencies\_tenants(tenant\_id) ON DELETE CASCADE,  
    role\_name VARCHAR(100) NOT NULL, \-- Validado en backend contra palabras inapropiadas  
    can\_manage\_catalog BOOLEAN DEFAULT FALSE,  
    can\_view\_global\_leads BOOLEAN DEFAULT FALSE, \-- FALSE restringe la vista solo a leads auto-asignados  
    can\_manage\_finance BOOLEAN DEFAULT FALSE,  
    can\_manage\_chat BOOLEAN DEFAULT FALSE,  
    created\_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),  
    CONSTRAINT unique\_role\_per\_tenant UNIQUE (tenant\_id, role\_name)  
);

#### **Tabla: travel\_packages**

Contiene la especificación de los paquetes de viajes indexados por inquilino y adaptados al formato de flyer rígido vertical\[cite: 1, 3\].

SQL  
CREATE TABLE travel\_packages (  
    package\_id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
    tenant\_id UUID REFERENCES agencies\_tenants(tenant\_id) ON DELETE CASCADE,  
    title VARCHAR(255) NOT NULL,  
    region VARCHAR(150) NOT NULL,  
    price NUMERIC(12, 2\) NOT NULL, \-- Refactorizado a columna genérica  
    currency VARCHAR(3) DEFAULT 'MXN', \-- Estándar ISO 4217 (MXN, USD, EUR)  
    url\_flyer\_storage TEXT NOT NULL, \-- URL de imagen vertical optimizada en WebP/AVIF (Alta definición)  
    url\_thumbnail\_storage TEXT NOT NULL, \-- URL de imagen miniatura para listados rápidos  
    has\_coordinator BOOLEAN DEFAULT FALSE, \-- Inyecta etiqueta visual Con/Sin Coordinador  
    publication\_status VARCHAR(50) DEFAULT 'draft', \-- draft, published, archived, concluded  
    departure\_date TIMESTAMP WITH TIME ZONE NOT NULL, \-- Almacenado estrictamente en UTC  
    created\_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())  
);

#### **Tabla: transactions\_orders**

Registro transaccional financiero de compras y control de abonos diferidos manuales\[cite: 1, 3\].

SQL  
CREATE TABLE transactions\_orders (  
    order\_id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
    tenant\_id UUID REFERENCES agencies\_tenants(tenant\_id) ON DELETE CASCADE,  
    stripe\_checkout\_session\_id VARCHAR(255) NOT NULL,  
    user\_id UUID NOT NULL, \-- ID del viajero comprador registrado  
    total\_amount NUMERIC(12, 2\) NOT NULL,  
    remaining\_balance NUMERIC(12, 2\) NOT NULL, \-- Control del balance pendiente de abonos  
    currency VARCHAR(3) DEFAULT 'MXN',  
    platform\_commission\_fee NUMERIC(12, 2\) NOT NULL, \-- 13% + IVA retenido de manera proporcional por abono  
    points\_earned INTEGER DEFAULT 0, \-- Puntos (1 pt = $1 MXN) acumulados por el viajero en esta transacción  
    points\_redeemed INTEGER DEFAULT 0, \-- Puntos canjeados como descuento en esta transacción  
    payment\_status VARCHAR(50) DEFAULT 'pending', \-- pending, partial\_paid, paid, moroso, cancelled  
    next\_payment\_due TIMESTAMP WITH TIME ZONE, \-- Fecha límite del mes (UTC) para control de los 5 días de gracia  
    created\_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())  
);

#### **Tabla: user\_wallets**

Almacena el saldo de puntos de lealtad para cada usuario viajero registrado en la plataforma.

SQL  
CREATE TABLE user\_wallets (  
    wallet\_id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
    user\_id UUID NOT NULL UNIQUE, \-- ID del usuario viajero (una cartera por usuario)  
    points\_balance INTEGER NOT NULL DEFAULT 0 CHECK (points\_balance >= -200 AND points\_balance <= 15000), \-- Saldo actual (1 punto = $1 MXN). Mínimo -200 (sobregiro por reversión), máximo 15000.  
    max\_balance\_reached INTEGER DEFAULT 0, \-- Máximo saldo histórico alcanzado  
    created\_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),  
    updated\_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())  
);

#### **Tabla: wallet\_transactions**

Registro de auditoría de todas las operaciones de puntos (acumulaciones, canjes, reversiones, bonos).

SQL  
CREATE TABLE wallet\_transactions (  
    transaction\_id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
    wallet\_id UUID REFERENCES user\_wallets(wallet\_id) ON DELETE CASCADE,  
    user\_id UUID NOT NULL,  
    type VARCHAR(20) NOT NULL CHECK (type IN ('earn', 'redeem', 'reversal', 'bonus', 'referral', 'review')), \-- Tipo de operación  
    points INTEGER NOT NULL, \-- Positivo para acumulaciones/earn/bonus, negativo para canjes/redeem/reversal  
    description TEXT, \-- Descripción legible (ej: "Compra viaje Cancún", "Canje en checkout", "Bono de bienvenida")  
    reference\_order\_id UUID, \-- FK opcional a transactions\_orders.order\_id para trazabilidad  
    created\_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())  
);

### **7.4 Capa de API Gateway y Endpoints Críticos**

* POST /api/v1/agency/roles/create  
  * **Acceso:** Privado (Agency\_Admin en exclusividad)\[cite: 1, 2\].  
  * **Lógica:** Intercepta la petición y realiza una subconsulta en la base de datos para verificar el conteo actual de registros en custom\_roles\_permissions vinculados a ese tenant\_id. Actualmente todas las agencias operan bajo el Plan Comercial, por lo que el límite es de 1 rol personalizado adicional. Si la agencia ya tiene 1 rol registrado, el endpoint rechaza la creación con una excepción de cuota y un mensaje indicando el límite del plan. En caso de reactivación futura del modelo de suscripciones, la lógica se adaptará para evaluar el subscription\_tier de la agencia y aplicar el límite correspondiente (Gratuito: 0, Comercial: 1, Corporativo: 3).  
* GET /api/v1/crm/leads  
  * **Acceso:** Privado (Personal de agencia autenticado con JWT).  
  * **Lógica:** El backend consulta directamente las tablas `crm_leads` y `crm_activities` en PostgreSQL aplicando Row-Level Security por tenant para extraer los leads de la agencia. Se une con `profiles` (nombre del viajero) y `travel_packages` (título y región del paquete) para enriquecer la respuesta. Antes de despachar la colección al frontend, el middleware evalúa los permisos del rol del usuario de la agencia. Si `can_view_global_leads` es FALSE, el gateway filtra en el query añadiendo `.eq("assigned_to", user.id)`, reteniendo única y exclusivamente aquellos leads donde el campo de asignación coincida estrictamente con el UUID del usuario solicitante. La consulta está limitada a 100 registros con paginación del lado del servidor en roadmap. Los cambios en tiempo real se reciben mediante suscripción a Supabase Realtime sobre la tabla `crm_leads` con debounce de 500ms para evitar sobrecarga.  
* POST /api/v1/ai/generate-itinerary  
  * **Acceso:** Privado (Solo usuarios finales registrados y validados vía Google reCAPTCHA v3).  
  * **Lógica:** Verifica en Redis que el contador diario del user\_id no exceda de 5 peticiones. Si el límite por minuto se vulnera, aplica la penalización escalonada de tiempo (15 min \-\> 1 hora \-\> baneo del día). Si pasa el control, calcula la clave criptográfica combinando el ID del viaje con el clúster de intereses del perfil del viajero. De existir en la tabla de caché, retorna el JSON estructurado en milisegundos; de lo contrario, consume la API de Gemini forzando el formato tipado de la línea de tiempo.  
* POST /api/v1/media/presigned-url  
  * **Acceso:** Privado (Usuario de agencia con permiso activo can\_manage\_catalog).  
  * **Lógica:** Invoca al SDK de Supabase Storage para generar una dirección URL de subida directa con firma criptográfica simétrica y expiración de 300 segundos, evitando la transferencia de binarios pesados a través del servidor central de la plataforma.  
* POST /api/v1/payments/checkout-session  
  * **Acceso:** Privado (EndUser registrado y autenticado).  
  * **Lógica:** Configura e inicializa una sesión de Stripe Checkout inyectando los parámetros de Stripe Connect. Procesa la compra en el siguiente orden: (1) Valida y aplica los puntos canjeados por el viajero (mínimo 200 puntos, máximo 20% del total de la compra), descontándolos del subtotal. (2) Calcula el subtotal remanente a pagar con tarjeta u otro método de pago. (3) Calcula el 13% + IVA de comisión sobre el remanente pagado con tarjeta y configura el split de Stripe Connect reteniendo ese monto hacia la plataforma, dispersando el resto a la cuenta Express de la agencia. (4) Calcula los puntos a ganar por esta compra (1 punto por cada $100 MXN del total de la compra, independientemente de los puntos canjeados). (5) Si el pago es diferido en plazos, programa las alertas de cobro mensual manual en el sistema de mensajería omnicanal con recordatorios y links exclusivos de Stripe Checkout.