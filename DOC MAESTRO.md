# **ESPECIFICACIÓN DE ARQUITECTURA DE SOFTWARE Y DOCUMENTO DE REQUERIMIENTOS TÉCNICOS (PRD)**

## **SISTEMA CORE: "LA PLATAFORMA DE LAS AGENCIAS DE VIAJE"**

## *Por Carlos Alejandro C. Obregón*

## **1\. CONFIGURACIÓN GENERAL, ARQUITECTURA MULTI-TENANT Y MODELO SAAS**

La plataforma está diseñada bajo una arquitectura de software como servicio (SaaS) Multi-Tenant. Utiliza una infraestructura unificada respaldada por **Supabase** (PostgreSQL, Auth, Realtime y Storage) como entorno principal para el backend y la persistencia de datos. Esta infraestructura coexiste y se integra mediante una API Gateway centralizada con instancias autohospedadas del sistema de gestión de relaciones con clientes **Twenty CRM** (twentyhq/twenty). El CRM opera de forma externa pero viene conectado con la plataforma para actuar como validador lógico de límites de negocio y repositorio de información conductual.

### **1.1 Matriz de Niveles de Suscripción B2B**

El ciclo de vida, la facturación recurrente y las cuotas operativas de las agencias de viajes registradas en la plataforma son gestionados de manera automatizada mediante la integración de **Stripe Billing**.

| Característica / Límite | Plan Básico (Gratuito) MD | Plan Comercial (De Paga) MD | Plan Corporativo (De Paga) MD |
| :---- | :---- | :---- | :---- |
| **Enfoque de Mercado** | Captación masiva y Product-Led Growth (PLG). | Agencias en pleno crecimiento y expansión. | Agencias consolidadas y corporativos premium. |
| **Ciclo de Facturación** | N/A. | Mensual o Anual (Anual incluye 20% de descuento). | Mensual o Anual (Anual incluye 20% de descuento). |
| **Límite de Flyers Activos** | Máximo 5 flyers publicados simultáneamente. | Hasta 25 flyers publicados simultáneamente. | Ilimitados (con tope alto de control de 150 flyers). |
| **Roles Personalizados (RBAC)** | 0 (Acceso exclusivo mediante cuenta maestra Agency\_Admin). | Permite crear hasta 1 rol personalizado adicional. | Permite crear hasta **3 roles personalizados dinámicos**. |
| **Límite de Usuarios / Empleados** | Restringido a 1 usuario administrador. | Soporta la asociación de 3 a 5 empleados por tenant. | Usuarios y colaboradores ilimitados por agencia. |
| **Gestión de Leads (Twenty CRM)** | Registro centralizado en bandeja principal única sin asignación. | Mapeo y filtrado en API Gateway; asignación y vista restringida por agente. | Sincronización avanzada, analíticas de rendimiento de agentes en Gateway. |
| **Canales de Comunicación** | Alertas Push en Dashboard y notificaciones por Correo. | Omnicanalidad completa: Push, Correo y 50 alertas WhatsApp al mes. | Push e Email ilimitados; WhatsApp ilimitado vía *Metered Billing*. |
| **Pre-calificación de Leads** | Tradicional (Ingreso directo de formularios al CRM). | Acceso a bots guiados basados en reglas lógicas. | Acceso a bots guiados basados en reglas lógicas. |
| **Agente de IA de Seguimiento** | No disponible. | **Habilitado:** Agente de IA para seguimiento de leads en chat in-app. | **Habilitado:** Agente de IA para seguimiento de leads en chat in-app. |

### **1.2 Regla de Negocio ante Fallos de Pago B2B (Periodo de Gracia)**

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
* **Módulo de Registro Corporativo:** Formulario estructurado para capturar datos legales y operativos: Nombre comercial, RFC, dirección física completa, carga de logotipo, Constancia de Situación Fiscal (PDF), Tipo/Clave de certificación turística oficial y aceptación de términos y condiciones de la plataforma\[cite: 1, 2\].  
* **Dashboard de Control Interno:** Panel privado que renderiza métricas limpias y aisladas (clics en flyers, leads generados, estado del flujo de ingresos de Stripe Connect y facturación SaaS de Stripe Billing) basados exclusivamente en el contexto de la agencia autenticada\[cite: 1, 3\].  
* **Formulario de Nuevo Flyer:** Componente con validación estricta en el cliente. Campos requeridos: Título del viaje, Región/Destino, Precio Base, selector de divisa, área de arrastre (*drop-zone*) conectada a almacenamiento en la nube y un selector binario (Switch) para **"Coordinador"**\[cite: 1, 3\]. Al activarse, inyecta en el catálogo público una etiqueta verde "Con Coordinador"; de lo contrario, renderiza una etiqueta gris "Sin Coordinador".

## **3\. PARTE 2: COMUNICACIÓN, NOTIFICACIONES Y CHAT IN-APP**

La plataforma carece intencionalmente de medios de comunicación expuestos públicamente; se obliga al viajero y a la agencia a interactuar de manera exclusiva dentro de la SPA para resguardar la retención del usuario.

### **3.1 Arquitectura del Chat en Tiempo Real y Persistencia**

* **Motor del Chat:** Delegado e implementado sobre la infraestructura de **Supabase Realtime**, aprovechando conexiones de WebSockets síncronas para proveer mensajería instantánea sin sobrecargar los servidores de la API Gateway.  
* **Ciclo de Vida del Chat:** La conversación se mantiene completamente aislada dentro de las tablas de datos de nuestra plataforma central (sin replicar texto o mensajes históricos en Twenty CRM). Las reglas de archivado automático operan bajo los siguientes estados comerciales:  
  * Si el lead asociado se marca como Perdido en el CRM, la ventana de chat se archiva automáticamente.  
  * Si el lead se marca como Ganado (Venta exitosa), el chat permanece abierto y completamente operativo para coordinar la logística, archivándose de forma automática únicamente cuando el viaje contratado concluya con base en la fecha de retorno establecida.

### **3.2 Motor de Censura de Datos de Contacto (Backend Middleware)**

Para salvaguardar las normas de la comunidad y forzar la transaccionalidad in-app, el backend implementa un middleware de inspección obligatoria de paquetes de texto antes de persistir cualquier mensaje en la base de datos o transmitirlo al receptor:

* **Filtro de Expresiones Regulares (Regex):** El sistema escaneará el texto buscando patrones correspondientes a números telefónicos (ej: \\+?\\d{10,13}), direcciones de correo electrónico, o intentos semánticos de evasión (escribir números con caracteres alfabéticos como "cinco cinco...").  
* **Censura en el Servidor:** Todo dato de contacto detectado será sustituido de forma irreversible por una cadena de asteriscos (\*\*\*) y el sistema inyectará un aviso automático dentro del chat indicando la infracción de los acuerdos de usuario.  
* **Política de Reincidencia Escalada:** La tabla de perfiles de usuario mantendrá un contador de infracciones. Al acumular exactamente **5 intentos de evasión de filtro**, el backend bloqueará temporalmente la facultad de enviar mensajes en el chat para ese usuario y despachará una alerta de auditoría inmediata al panel de control del SuperAdmin.

### **3.3 Orquestación de la Omnicanalidad (Triggers de Alerta)**

Las notificaciones se distribuyen a través de canales específicos para equilibrar la inmediatez de la conversión con los costos fijos asociados a la API de WhatsApp Business:

1. **Captura de Lead Básico:** Ocurre cuando un viajero interactúa con un flyer o completa el flujo inicial con el bot guiado de requerimientos. Detona una alerta **Push** en tiempo real en el Dashboard de la agencia e inyecta la entidad Lead en Twenty CRM. *Se excluye el canal de WhatsApp en este paso para mitigar costos de leads fríos.*  
2. **Mensaje Directo en el Chat In-App:** Envía una alerta **Push** instantánea si el agente de viajes se encuentra logueado y activo en la SPA. Si el agente permanece desconectado de la plataforma por un periodo continuo mayor a **5 minutos**, el backend dispara una notificación automatizada por **WhatsApp / Correo Electrónico (vía Resend o SendGrid)** alertándole sobre el mensaje en espera.  
3. **Confirmación Transaccional de Compra:** Al confirmarse con éxito el cobro de un anticipo en la pasarela, el sistema gatilla en paralelo: Notificación **Push** en el Dashboard de la agencia, **Correo electrónico** formal al viajero adjuntando el recibo de Stripe y el acuerdo contractual de condiciones, y un **Mensaje de WhatsApp automatizado** a ambas partes confirmando los detalles de la reservación.

### **3.4 Roadmap de Expansión Móvil (Futuro)**

* La plataforma contempla en su mapa de ruta técnico el desarrollo futuro de aplicaciones móviles nativas o híbridas enfocadas a los sistemas operativos **Android e iOS**.  
* El diseño desacoplado de las alertas y la persistencia en tiempo real a través de Supabase Realtime permitirá que la misma infraestructura de red reemplace de manera orgánica los envíos de WhatsApp por **notificaciones push nativas directas a la aplicación**. Esto reducirá a largo plazo la dependencia de servicios de mensajería externos de pago y aumentará la retención del usuario en el ecosistema propietario.

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

### **6.1 Modelo de Comisión y Dispersión Inmediata**

La arquitectura transaccional de la plataforma se rige bajo la integración de **Stripe Connect** configurada bajo la modalidad estricta de **Cuentas Custom / Express** para mitigar los riesgos contables y fiscales directos del SaaS\[cite: 1, 5\].

* **Esquema de Retención Transaccional:** La pasarela capturará los montos completos en Pesos Mexicanos (MXN) y aplicará una arquitectura de transferencias separadas (*Split Payments*): **retendrá automáticamente un 3% de comisión neta destinada a la cuenta bancaria de la plataforma más la tarifa de procesamiento estándar que cobre Stripe**, dispersando de forma inmediata el remanente neto a la cuenta bancaria enlazada de la agencia de viajes correspondiente\[cite: 1, 7\].  
* **Blindaje contra Contracargos Bancarios (Disputes):** Al operar bajo el modelo Express/Custom de Stripe Connect, si un viajero inicia una disputa o contracargo directamente con su institución bancaria alegando fraude o incumplimiento, **la responsabilidad financiera y el saldo negativo resultante son transferidos íntegramente por Stripe al balance de la cuenta conectada de la agencia**. La plataforma SaaS queda totalmente exenta de absorber la pérdida monetaria de la disputa bancaria.

### **6.2 Planes de Pago Diferidos e Impagos B2C**

Las agencias tienen la facultad de habilitar planes de financiamiento con un **plazo máximo de 4 meses** para liquidar el viaje. La agencia es la única encargada de designar el porcentaje de anticipo inicial requerido en el checkout (estableciendo la plataforma una sugerencia mínima del 20%).

* **Gestión de Mensualidades:** Se implementa de forma estricta la **Opción B (Manual por enlace)**. El backend no realizará cobros recurrentes automatizados a la tarjeta del cliente. En su lugar, el motor de comunicación omnicanal enviará cada mes notificaciones automatizadas con un link exclusivo de Stripe Checkout para que el viajero ingrese y liquide su abono de forma manual.  
* **Corte Proporcional de Comisión:** La comisión del 3% correspondiente a la plataforma **se cobrará de manera proporcional (el 3% de cada abono)** conforme el usuario vaya pagando mes con mes, protegiendo el flujo de caja operativo de la agencia en el pago inicial del anticipo.  
* **Regla de Tolerancia por Morosidad y Cero Reembolsos:** En los acuerdos de usuario y términos legales que los viajeros aceptan de forma obligatoria para registrarse, se estipula un disclaimer explícito de **Cero Reembolsos**, ya que los fondos se dispersan de inmediato y las agencias comprometen el capital en apartados fijos de proveedores turísticos. Si un viajero se atrasa en su pago mensual, el backend le otorgará un **periodo de tolerancia de exactamente dos semanas (14 días naturales) a partir de la fecha de corte**. Si el abono no se registra en ese lapso, la orden se actualiza automáticamente al estado de Cancelada por falta de pago. El sistema notificará de inmediato a la agencia, actualizará el estado en Twenty CRM y **los montos que el usuario ya había abonado se quedarán congelados a favor de la agencia de viajes de manera definitiva**, sin emisión de monederos electrónicos ni notas de crédito internas.

### **6.3 Delimitación de Responsabilidad Fiscal (CFDI México)**

* **Facturación de la Plataforma (B2B):** El backend automatizará el timbrado fiscal de facturas electrónicas (CFDI para el mercado de México) consumiendo la API externa de **Facturama**. El sistema emitirá los comprobantes fiscales correspondientes dirigidos a las agencias exclusivamente por dos conceptos: el costo de las suscripciones mensuales/anuales de los planes SaaS y el cobro de las comisiones del 3% retenidas por transaccionalidad de pasarela.  
* **Facturación del Viaje (B2C):** La emisión de facturas fiscales CFDI por el monto total del paquete de viaje o los anticipos aportados por los viajeros queda **100% bajo la responsabilidad operativa y legal de la agencia de viajes contratada** (siguiendo estrictamente el modelo de transacciones descentralizadas de Amazon). La plataforma SaaS no intervendrá en el timbrado ni en la conciliación fiscal de los servicios turísticos comercializados entre agencias y consumidores finales.

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
    stripe\_customer\_id VARCHAR(255), \-- ID de Cliente para Stripe Billing (SaaS)  
    twenty\_crm\_relation\_id VARCHAR(255), \-- ID de mapeo lógico con la instancia de Twenty CRM  
    status VARCHAR(50) DEFAULT 'En Revisión', \-- En Revisión, Activo, Suspendido por Pago  
    subscription\_tier VARCHAR(50) DEFAULT 'Gratuito', \-- Gratuito, Comercial, Corporativo  
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
    platform\_commission\_fee NUMERIC(12, 2\) NOT NULL, \-- 3% retenido de manera proporcional por abono  
    payment\_status VARCHAR(50) DEFAULT 'pending', \-- pending, partial\_paid, paid, moroso, cancelled  
    next\_payment\_due TIMESTAMP WITH TIME ZONE, \-- Fecha límite del mes (UTC) para control de los 14 días de gracia  
    created\_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())  
);

### **7.4 Capa de API Gateway y Endpoints Críticos**

* POST /api/v1/agency/roles/create  
  * **Acceso:** Privado (Agency\_Admin en exclusividad)\[cite: 1, 2\].  
  * **Lógica:** Intercepta la petición y realiza una subconsulta en la base de datos para verificar el conteo actual de registros en custom\_roles\_permissions vinculados a ese tenant\_id. Si la agencia pertenece al plan Gratuito arroja una excepción de cuota; si es plan Comercial restringe la creación al superar 1 rol; si es Corporativo bloquea al intentar registrar un cuarto rol.  
* GET /api/v1/crm/leads  
  * **Acceso:** Privado (Personal de agencia autenticado con JWT).  
  * **Lógica:** El backend realiza una llamada de servicio mediante una API Key maestra hacia el Twenty CRM autohospedado para extraer los leads del tenant\[cite: 1, 3\]. Antes de despachar la colección al frontend, el middleware evalúa los permisos del rol del usuario de la agencia. Si can\_view\_global\_leads es FALSE, el gateway filtra los objetos en memoria reteniendo única y exclusivamente aquellos leads donde el campo de asignación coincida estrictamente con el UUID del usuario solicitante.  
* POST /api/v1/ai/generate-itinerary  
  * **Acceso:** Privado (Solo usuarios finales registrados y validados vía Google reCAPTCHA v3).  
  * **Lógica:** Verifica en Redis que el contador diario del user\_id no exceda de 5 peticiones. Si el límite por minuto se vulnera, aplica la penalización escalonada de tiempo (15 min \-\> 1 hora \-\> baneo del día). Si pasa el control, calcula la clave criptográfica combinando el ID del viaje con el clúster de intereses del perfil del viajero. De existir en la tabla de caché, retorna el JSON estructurado en milisegundos; de lo contrario, consume la API de Gemini forzando el formato tipado de la línea de tiempo.  
* POST /api/v1/media/presigned-url  
  * **Acceso:** Privado (Usuario de agencia con permiso activo can\_manage\_catalog).  
  * **Lógica:** Invoca al SDK de Supabase Storage para generar una dirección URL de subida directa con firma criptográfica simétrica y expiración de 300 segundos, evitando la transferencia de binarios pesados a través del servidor central de la plataforma.  
* POST /api/v1/payments/checkout-session  
  * **Acceso:** Privado (EndUser registrado y autenticado).  
  * **Lógica:** Configura e inicializa una sesión de Stripe Checkout inyectando los parámetros de Stripe Connect. Calcula el monto del anticipo fijado por la agencia y estipula la transferencia con split, reteniendo de forma proporcional el 3% de la comisión neta de la plataforma más las tasas correspondientes de procesamiento bancario, transfiriendo el restante a la cuenta Express vinculada\[cite: 1, 5, 7\]. Programará las alertas de cobro mensual manual en el sistema de mensajería.