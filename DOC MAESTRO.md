# **ESPECIFICACIÓN DE ARQUITECTURA DE SOFTWARE Y DOCUMENTO DE REQUERIMIENTOS TÉCNICOS (PRD)**

## **SISTEMA CORE: "LA PLATAFORMA DE LAS AGENCIAS DE VIAJE"**

## *Por Carlos Alejandro C. Obregón*

## **1\. CONFIGURACIÓN GENERAL, ARQUITECTURA MULTI-TENANT Y MODELO SAAS**

La plataforma está diseñada bajo una arquitectura de software como servicio (SaaS) Multi-Tenant. Utiliza una infraestructura unificada respaldada por **Supabase** (PostgreSQL, Auth, Realtime y Storage) como entorno principal para el backend y la persistencia de datos. La plataforma incluye un **CRM integrado nativamente** para la gestión de leads, seguimiento de ventas y relación con clientes. Este CRM opera directamente sobre PostgreSQL (tablas `crm_leads`, `crm_activities`, `crm_ai_qualification_sessions`, `crm_agent_assignment_queue`) sin dependencia de servicios externos, garantizando baja latencia multi-tenant mediante Row-Level Security. Incluye pre-calificación automatizada de leads por IA (Gemini 2.5 Flash), asignación round-robin a agentes y chat en tiempo real integrado con Supabase Realtime. La especificación completa del CRM se detalla en la Sección 2.5.

### **1.1 Matriz de Paquetes para Agencias**

La plataforma ofrece cuatro paquetes para agencias de viajes, cada uno con una tasa de comisión diferenciada sobre las ventas. La facturación recurrente de los paquetes de paga (Intermedio y Premium) se gestiona mediante **Stripe Billing**.

| Característica | Plan Básico | Plan Intermedio | Plan Premium | Plan Fundador |
| :--- | :--- | :--- | :--- | :--- |
| **Mensualidad** | Sin mensualidad ($0 MXN) | $1,799 MXN | $2,999 MXN | Sin mensualidad ($0 MXN) |
| **Tasa de Comisión (IVA incluido)** | 20% | 18% (preferencial 17%) | 15% (preferencial 12%) | 7.5% |
| **Límite de Flyers Activos** | 50 flyers | 50 flyers | 50 flyers | 50 flyers |
| **Límite de Usuarios / Empleados** | 1 usuario administrador | 3 a 5 empleados por tenant | Ilimitados | Ilimitados |
| **Roles Personalizados (RBAC)** | 0 (solo Agency\_Admin) | 1 rol personalizado adicional | 3 roles personalizados | 3 roles personalizados |
| **Gestión de Leads (CRM)** | Bandeja única, sin pre-calificación IA | Asignación round-robin; filtros por status | Dashboard avanzado con KPIs y pipeline | Dashboard avanzado con KPIs y pipeline (idéntico a Premium) |
| **Pre-calificación de Leads** | Tradicional (formularios al CRM, sin IA) | Bots guiados por reglas lógicas | Bots guiados por reglas lógicas | Bots guiados por reglas lógicas (idéntico a Premium) |
| **Agente de IA de Seguimiento** | No disponible | Habilitado | Habilitado | Habilitado (idéntico a Premium) |
| **Logo Distintivo en Marketplace** | — | Sí | Sí | Sí |
| **Referidos Directos por Avimo** | — | Sí | Sí | Sí |
| **Apartado Completo en Marketplace** | — | — | Sí | Sí |
| **Soporte** | Estándar | Estándar | 24/7 | 24/7 |
| **Comunicación Agencia-Cliente** | Chat interno en plataforma | Chat interno en plataforma | Chat interno en plataforma | Chat interno en plataforma |

**Regla de Asignación de Paquete:** La agencia puede seleccionar el plan de su preferencia (Básico, Intermedio, Premium o Fundador) durante el flujo de registro. El **Plan Fundador** requiere aprobación manual del SuperAdmin (ver Sección 1.1.1); la agencia ingresa temporalmente como Plan Básico hasta que la solicitud sea aprobada. El Plan Intermedio es el plan recomendado y viene preseleccionado por defecto. La facturación recurrente de Stripe Billing aplica exclusivamente a los planes Intermedio y Premium. El Plan Básico y el Plan Fundador no generan cobros de suscripción mensual.

**Comunicación con Clientes:** Las agencias se comunican con los viajeros **exclusivamente a través del chat interno integrado en la plataforma** (web y aplicación móvil), accesible desde el Portal de Agencia y el Marketplace. No se habilita comunicación externa por email, WhatsApp ni ningún otro canal para la gestión de leads y ventas. Todo el historial de comunicación queda registrado y trazable en el CRM para garantizar transparencia y control de calidad.

#### **1.1.1 Fase Inicial y Límite de Agencias (Plan Fundador)**

La plataforma operará bajo un esquema de acceso controlado para el Plan Fundador:

* El **Plan Fundador** está limitado a las primeras **10 agencias** que completen el proceso de registro, verificación y aprobación por el SuperAdmin.  
* El Plan Fundador **no se asigna directamente** durante el registro: la agencia puede **solicitarlo** en el flujo de registro (botón "Solicitar"), pero ingresa temporalmente como **Plan Básico** hasta que el SuperAdmin apruebe la solicitud desde el panel de administración. La tarjeta de solicitud del Plan Fundador puede ser **activada o desactivada por el SuperAdmin** desde el panel de administración (configuración `fundador_requests_enabled`).  
* Al ser aprobada, el sistema cambia automáticamente el plan de la agencia a **Plan Fundador**, aplicando la tasa de comisión preferencial del 7.5% y todos los beneficios del plan.  
* La **duración del Plan Fundador es de 1 año** calendario a partir de la fecha de activación. Durante este año, la agencia no paga mensualidad ($0 MXN) y goza de la tasa de comisión fija del 7.5%.  
* Una vez cubiertas las 10 plazas del Plan Fundador, este paquete **se cierra de forma permanente** para nuevas agencias. No se habilitarán plazas adicionales ni listas de espera.  
* Las agencias que ingresen posteriormente podrán optar únicamente por los planes Básico, Intermedio o Premium.  
* El límite de 10 agencias no aplica a los demás planes (Básico, Intermedio y Premium), que permanecen abiertos sin restricción de cupo.  
* **Transición post-año:** Ver Sección 1.1.5 para las reglas de continuidad al cumplirse el año del Plan Fundador.

#### **1.1.2 Requisitos de Verificación Adicionales**

Además de los requisitos fiscales y legales estándar detallados en la Sección 2.4.1, **todas las agencias** —sin importar el plan— deben cumplir con los siguientes requisitos de verificación adicionales antes de que su perfil sea activado en el marketplace:

* **Mínimo 3 años de servicio comprobable:** La agencia debe acreditar al menos 3 años de operación continua en el sector turístico mediante documentación oficial (acta constitutiva, registros de actividad, certificaciones turísticas con antigüedad verificable). No se aceptan agencias con menos de 3 años de trayectoria.  
* **Lugar físico verificable:** La agencia debe contar con una oficina, sucursal o local comercial físico verificable. No se aceptan agencias que operen exclusivamente de forma virtual o sin domicilio comercial comprobable. Se requiere evidencia documental (comprobante de domicilio, contrato de arrendamiento o escritura) con antigüedad no mayor a 3 meses.  
* **RFC validado contra el SAT:** El RFC proporcionado en el registro es validado en tiempo real contra el servicio de verificación del SAT a través de la API de Facturama. RFCs no localizados, suspendidos o con estatus irregular son rechazados automáticamente.  
* **Contrato firmado con la plataforma:** La agencia debe firmar electrónicamente un contrato de prestación de servicios con Avimo que establece los términos de operación, la tasa de comisión aplicable según su plan, las condiciones de facturación de suscripción (si aplica), y las obligaciones fiscales de emisión de CFDI. El contrato se gestiona mediante firma electrónica dentro del flujo de registro y se almacena en el bucket privado del tenant.  
* **Aprobación manual del SuperAdmin (solo Plan Fundador):** Las agencias que soliciten el Plan Fundador requieren aprobación manual del SuperAdmin desde el panel de administración. La aprobación verifica que la agencia cumple con todos los requisitos de verificación y que existen plazas disponibles (máximo 10). Hasta que la solicitud sea aprobada, la agencia opera como Plan Básico.

> **Nota:** Estos requisitos son adicionales e independientes del registro estándar descrito en la Sección 2.4.1. Una agencia puede completar su registro corporativo pero no será activada en el marketplace hasta que todos los requisitos de verificación adicionales hayan sido aprobados.

#### **1.1.3 Tasas Preferenciales por Desempeño en Conversión**

Los planes Intermedio y Premium cuentan con una **tasa de comisión preferencial reducida** que se activa cuando la agencia demuestra un desempeño consistente en la conversión de leads a ventas dentro de la plataforma.

**Métrica de Conversión:** La tasa de conversión se define como el porcentaje de leads generados en la plataforma que la agencia convierte en ventas efectivas, evaluado en **ventanas móviles de 3 meses calendario**:

```
Tasa de Conversión = (Ventas efectivas en 3 meses / Leads generados en plataforma en 3 meses) × 100
```

* Un lead se considera "generado en plataforma" cuando un viajero solicita información sobre un paquete de la agencia a través del chat interno, botón de contacto en flyer, o formulario de interés en el marketplace.  
* Una venta se considera "efectiva" cuando el pago del viajero ha sido confirmado exitosamente por Stripe (`checkout.session.completed`).  
* Leads y ventas fuera de la plataforma (contacto directo, teléfono, canales externos) **no cuentan** para esta métrica. **Excepción:** las ventas externas registradas por la agencia en el módulo de conciliación (`external_sales_log`) **sí se incluyen** en el numerador de la conversión, para no penalizar a las agencias que cierran leads generados en plataforma pero concretan la venta fuera de línea (ver Sección de Conciliación de Ventas Externas).

**Umbrales y Tasas:**

| Plan | Tasa Base | Tasa Preferencial | Umbral de Conversión | Diferencia |
| :--- | :--- | :--- | :--- | :--- |
| Intermedio | 18% | 17% | ≥ 5% de leads → ventas | −1 punto porcentual |
| Premium | 15% | 12% | ≥ 8% de leads → ventas | −3 puntos porcentuales |

* El Plan Básico y el Plan Fundador tienen **tasas fijas** (20% y 7.5% respectivamente) y no participan en el esquema de tasas preferenciales por conversión.  
* **Excepción Plan Fundador Año 2+:** Al cumplir el año y migrar a la modalidad de pago (Continuidad Fundador, $2,999/mes), la agencia mantiene la tasa fija del 7.5% de forma permanente. Si la agencia opta por migrar a Premium estándar, aplican las tasas base (15%) y preferencial (12%) del Plan Premium.

**Mecanismo de Evaluación y Ajuste:**

* La evaluación se ejecuta de forma **automática el primer día de cada mes**, analizando la ventana de los 3 meses calendario inmediatos anteriores.  
* Si la agencia alcanza o supera el umbral de conversión de su plan, su tasa de comisión se ajusta a la **tasa preferencial** para todas las ventas del mes en curso.  
* Si la agencia cae por debajo del umbral durante **2 meses consecutivos**, la tasa regresa automáticamente a la **tasa base** de su plan al inicio del mes siguiente.  
* La agencia recibe una notificación en su dashboard cada vez que su tasa de comisión cambia (activación o desactivación de tasa preferencial), con el detalle del cálculo de conversión del periodo evaluado.  
* La consulta del estatus actual de tasa preferencial y el historial de evaluaciones está disponible en el Panel de Finanzas de la agencia (`/agency/finance`).

**Ejemplo — Plan Premium:**

| Mes | Leads | Ventas | Conversión | Tasa Aplicada |
| :--- | :--- | :--- | :--- | :--- |
| Ene–Mar | 50 | 5 | 10.0% ≥ 8% | **12% (preferencial activada en Abr)** |
| Feb–Abr | 60 | 4 | 6.7% < 8% (1er mes bajo umbral) | 12% (mantiene) |
| Mar–May | 55 | 3 | 5.5% < 8% (2do mes consecutivo bajo umbral) | **15% (regresa a base en Jun)** |

#### **1.1.4 Campañas de Marketing y Promoción Propias (Avimo)**

Avimo utiliza canales de comunicación externa (**email y WhatsApp**) de forma exclusiva para sus propias campañas de marketing y promoción dirigidas a la base de viajeros registrados. Estos canales **no están disponibles para las agencias** como herramientas de contacto con clientes.

* **Email Marketing:** Avimo envía newsletters periódicas a viajeros registrados con paquetes destacados, ofertas especiales y agencias recomendadas. Las agencias de planes Premium y Fundador reciben colocación prioritaria en estas campañas.  
* **WhatsApp Marketing:** Avimo utiliza WhatsApp para campañas promocionales segmentadas por intereses de viaje (basadas en el perfil de intereses del viajero — Sección 4.2), notificaciones de nuevos paquetes que coinciden con preferencias guardadas, y recordatorios de viajes guardados en wishlist.  
* **Notificaciones Push In-App:** Las notificaciones push dentro de la plataforma se utilizan para alertas transaccionales (estado de compra, mensajes nuevos en chat, recordatorios de pago) tanto para viajeros como para agencias.

#### **1.1.5 Transición Post-Año del Plan Fundador**

Al cumplirse el año calendario del Plan Fundador, la agencia recibe una notificación automática con 30 días de anticipación informando las siguientes opciones:

* **Opción A — Continuidad Fundador (recomendada):** La agencia conserva todos los beneficios del Plan Fundador (comisión 7.5%, soporte 24/7, roles ilimitados, dashboard avanzado con KPIs) pero comienza a pagar la mensualidad del Plan Premium: **$2,999 MXN/mes**. La tasa de comisión preferencial del 7.5% se mantiene de forma permanente mientras la agencia permanezca en este plan.  
* **Opción B — Migrar a Premium estándar:** La agencia pasa al Plan Premium con tasa de comisión base del 15% y opción a tasa preferencial del 12% (≥8% de conversión).  
* **Opción C — Migrar a Intermedio o Básico:** La agencia puede solicitar downgrade a Plan Intermedio ($1,799/mes, comisión 18%) o Plan Básico ($0/mes, comisión 20%), perdiendo los beneficios del Plan Fundador de forma irreversible.  

> **Nota:** Si la agencia no selecciona una opción dentro de los 30 días posteriores al vencimiento del año, el sistema la migra automáticamente a la **Opción A (Continuidad Fundador)** mediante la creación de una suscripción Stripe Billing de $2,999 MXN/mes (`Continuidad Fundador`), conservando la comisión del 7.5%. Si la agencia no tiene un método de pago registrado, el cobro falla y aplica el periodo de gracia de 15 días (Sección 1.2); si al finalizar no se liquida, el tenant pasa a Suspendido por Pago. La agencia puede cambiar de plan posteriormente desde su Panel de Configuración.

### **1.2 Regla de Negocio ante Fallos de Pago B2B (Periodo de Gracia)**

> **Aplica a:** Plan Intermedio y Plan Premium. Los planes Básico y Fundador no tienen cobros de suscripción, por lo que esta regla no les aplica.

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
* **Filtros Interactivos:** El filtro de precios operará con actualización de estado local e inmediata en el cliente para evitar cualquier latencia de recarga de red. Se incluyen filtros por región de destino, ciudad de salida (lista curada de aeropuertos principales de México) y rango de precios. La búsqueda textual abarca título, región y ciudad de salida.  
* **Detalle con IA:** Un modal flotante premium se activa al hacer clic en un flyer, el cual integra el botón **"Generar Itinerario con IA ✨"** para renderizar un plan detallado día por día consumiendo inteligencia artificial.  
* **Navegación Global:** Barra fija superior con efecto de *glassmorphism* activo mediante scroll. El menú de hamburguesa para resoluciones móviles implementará una animación nativa por CSS que transforma tres líneas físicas en una "X" al abrirse.
* **Guardado de Paquetes (Wishlist):** Cada tarjeta de flyer incluye un ícono interactivo de corazón/guardar que permite al viajero añadir o remover el paquete de su lista de deseos personal. En modo invitado, los paquetes guardados se persisten en LocalStorage del navegador. Al autenticarse, el sistema fusiona los favoritos locales con la base de datos (`user_saved_packages`) y persiste cualquier cambio futuro en tiempo real. La lista de paquetes guardados es accesible desde el menú de navegación y el perfil del usuario, mostrando los flyers en formato compacto con acceso directo al detalle, al carrito y a la opción de eliminar de la lista.

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
* **Aceptación de Términos y Condiciones:** Checkbox obligatorio de aceptación de los Términos de Uso de la Plataforma, la Política de Privacidad y el acuerdo de comisión según el plan contratado (ver Sección 1.1). El registro no se finaliza sin esta aceptación explícita.  
* **Dashboard de Control Interno:** Panel privado que renderiza métricas limpias y aisladas (clics en flyers, leads generados, estado del flujo de ingresos de Stripe Connect y facturación SaaS de Stripe Billing) basados exclusivamente en el contexto de la agencia autenticada\[cite: 1, 3\].  
* **Formulario de Nuevo Flyer:** Componente con validación estricta en el cliente. Campos requeridos: Título del viaje, Región/Destino, Precio Base, selector de divisa, área de arrastre (*drop-zone*) conectada a almacenamiento en la nube y un selector binario (Switch) para **"Coordinador"**\[cite: 1, 3\]. Al activarse, inyecta en el catálogo público una etiqueta verde "Con Coordinador"; de lo contrario, renderiza una etiqueta gris "Sin Coordinador".

##### 2.4.2 Dashboard Contable de Agencia

La plataforma proporciona un dashboard contable completo dentro del Portal de Agencia (`/agency/finance`), organizado en cinco pestañas para que la agencia gestione sus finanzas sin necesidad de herramientas externas:

* **Resumen:** KPIs principales de ingresos (RevenueOverview), rentabilidad por paquete (ProfitabilityTable), estado de Stripe Connect, conciliación de ventas externas y generación manual de CFDI.  
* **Ingresos Fiscales:** Tabla con el historial completo de ingresos fiscales (comisiones retenidas, tarifas de servicio). Cada registro muestra fecha, concepto, subtotal, IVA, total y estatus CFDI. La agencia puede **timbrar CFDI bajo demanda** para cualquier registro pendiente (Sección 6.3.1) y descargar PDF/XML una vez emitido. Incluye exportación CSV.  
* **Gastos Operativos:** La agencia puede registrar sus propios gastos categorizados (infraestructura, nómina, renta, marketing, software, etc.) con proveedor, RFC, subtotal, IVA y notas. Estos gastos alimentan el estado de resultados (P&L).  
* **P&L (Estado de Resultados):** Panel con cuatro KPIs: Ingresos Brutos, Comisiones Pagadas, Gastos Operativos y Utilidad Neta con porcentaje de margen. Filtro por mes actual, mes anterior o año acumulado.  
* **Conversión:** Métricas de desempeño comercial: leads generados en ventana de 3 meses, ventas cerradas, tasa de conversión actual, progreso hacia el umbral de tasa preferencial y estimación de leads/ventas faltantes para activar el beneficio.

### **2.5 CRM Integrado — Arquitectura, Diseño y Funcionamiento**

La plataforma incorpora un sistema de gestión de relaciones con clientes (CRM) integrado nativamente en PostgreSQL, eliminando la dependencia de sistemas externos. Este CRM está diseñado específicamente para agencias de viajes y opera sobre las mismas tablas y políticas RLS que el resto de la plataforma, garantizando aislamiento multi-tenant y cero latencia de red externa.

#### **2.5.1 Visión General y Decisión Arquitectónica**

El CRM fue diseñado como un módulo nativo de la plataforma en lugar de integrar un CRM externo por tres razones fundamentales:

* **Cero Latencia:** Todas las consultas se ejecutan directamente sobre PostgreSQL sin saltos de red a servicios externos. Un agente visualiza leads, aplica filtros y abre detalles en milisegundos.
* **Multi-Tenant Nativo:** Cada fila de `crm_leads` pertenece a un `tenant_id`. Las políticas RLS garantizan que una agencia nunca vea leads de otra, sin necesidad de un gateway de proxy externo.
* **Integración Profunda con Chat:** El CRM y el chat en tiempo real comparten la misma base de datos. La columna `crm_leads.conversation_id` vincula directamente un lead con su conversación en Supabase Realtime, permitiendo que el agente tome control del chat con un solo clic.

**Disponibilidad por Plan:** El módulo CRM está disponible para todos los planes. La funcionalidad de **pre-calificación automatizada con IA (Gemini 2.5 Flash)** descrita en la Sección 2.5.5 está disponible exclusivamente para los planes **Intermedio, Premium y Fundador**. El **Plan Básico** opera con formularios tradicionales de captura de leads sin agente de IA; los leads ingresan al CRM con datos básicos y son asignados manualmente por el administrador de la agencia.

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

> **Disponibilidad:** Esta funcionalidad de pre-calificación con IA está disponible exclusivamente para los planes **Intermedio, Premium y Fundador**. El Plan Básico no cuenta con agente de IA; los leads se capturan mediante formularios tradicionales y se asignan manualmente.

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

#### **2.5.11 Solicitud de Pago en Chat**

La plataforma permite que la agencia solicite pagos directamente al viajero dentro de la conversación del chat, sin salir de la plataforma. El flujo completo es:

* **Inicio de solicitud:** En la barra superior del chat, la agencia ve un botón **"Solicitar Pago"** ($). Al hacer clic, se abre un modal donde ingresa el monto y el concepto (ej. "Abono a paquete Cancún", "Liquidación final").  
* **Cálculo de comisión:** El endpoint `create-chat-payment` calcula automáticamente la comisión de la plataforma según el `plan_type` y `commission_rate` vigente de la agencia. La comisión se descuenta del monto total mediante `application_fee_amount` de Stripe.  
* **Integración con pagos diferidos:** Si el pago corresponde a un abono de una orden existente (`order_id` en metadata), el sistema valida que no exceda el saldo pendiente ni el plazo máximo de 4 meses. Al completarse el pago, se actualiza `remaining_balance` de la orden. Si el saldo llega a cero, la orden se marca como `paid`.  
* **Sesión Stripe:** Se crea una sesión de Stripe Checkout (`mode: payment`) con `transfer_data.destination` hacia la cuenta Connect de la agencia. El viajero es redirigido a la pasarela de pago.  
* **Mensaje visual en chat:** Al crearse la solicitud, se inserta un mensaje tipo `payment_request` en la conversación, visible como una tarjeta especial con el monto, concepto y botón "Pagar ahora".  
* **Confirmación automática:** El webhook de Stripe (`checkout.session.completed`) detecta pagos con `metadata.chat_payment = "true"`. Al confirmarse, inserta automáticamente un mensaje tipo `payment_confirmed` en el chat (tarjeta verde con checkmark) y crea el registro fiscal correspondiente en `fiscal_income_records`.  
* **Notificaciones:** Tanto el viajero como la agencia reciben notificaciones push de la confirmación del pago.

## **3\. PARTE 2: COMUNICACIÓN, NOTIFICACIONES Y CHAT IN-APP**

La plataforma carece intencionalmente de medios de comunicación expuestos públicamente; se obliga al viajero y a la agencia a interactuar de manera exclusiva dentro de la SPA para resguardar la retención del usuario.

### **3.1 Arquitectura del Chat en Tiempo Real y Persistencia**

* **Motor del Chat:** Delegado e implementado sobre la infraestructura de **Supabase Realtime**, aprovechando conexiones de WebSockets síncronas para proveer mensajería instantánea sin sobrecargar los servidores de la API Gateway.  
* **Ciclo de Vida del Chat:** La conversación se mantiene completamente aislada dentro de las tablas de datos de nuestra plataforma central (sin replicar texto o mensajes históricos en sistemas externos). Las reglas de archivado automático operan bajo los siguientes estados comerciales:  
  * Si el lead asociado se marca como Perdido en el CRM, la ventana de chat se archiva automáticamente.  
  * Si el lead se marca como Ganado (Venta exitosa), el chat permanece abierto y completamente operativo para coordinar la logística, archivándose de forma automática únicamente cuando el viaje contratado concluya con base en la fecha de retorno establecida.

### **3.2 Motor de Censura de Datos de Contacto (Backend Middleware)**

Para salvaguardar las normas de la comunidad y forzar la transaccionalidad in-app, el backend implementa un middleware de inspección obligatoria (trigger `BEFORE INSERT` en PostgreSQL) y validación en cliente antes de persistir o transmitir cualquier mensaje:

**Detección en Servidor (Trigger `sanitize_chat_message`):**

* **Teléfonos:** Patrones de 10-13 dígitos, con o sin código de país (+52).  
* **Correos electrónicos:** Formato estándar RFC 5322 (`usuario@dominio.ext`).  
* **URLs y dominios:** `https://`, `http://`, `www.` y dominios detectados sin protocolo (`.com`, `.mx`, `.org`, etc.).  
* **CLABE y tarjetas bancarias:** 18 dígitos consecutivos (CLABE mexicana), 16 dígitos en grupos de 4, y menciones de "cuenta", "transferencia", "depósito", "banco", "tarjeta" seguidas de números.  
* **Redes sociales:** Menciones estilo `@usuario`, URLs de Facebook, Instagram, TikTok, WhatsApp (`wa.me`), Telegram (`t.me`), Twitter/X, LinkedIn. Palabras clave "facebook", "instagram", "whatsapp", "whats", "telegram" seguidas de texto.  
* **Evasión semántica:** Números escritos con palabras en español (4+ secuenciales), dígitos espaciados con guiones/puntos (9+ en secuencia), frases de contacto como "escríbeme al", "márcame al", "mi correo es", "mi número", "agrégame", "búscame" seguidas de dígitos.

**Validación en Cliente (`validateChatMessage`):**

* El frontend ejecuta los mismos patrones regex antes de enviar el mensaje al servidor.  
* Si se detecta una violación, el mensaje **no se envía** y se muestra una advertencia específica al usuario indicando qué tipo de contenido está prohibido (ej. "No se permiten enlaces externos", "No se permiten números de cuenta").  
* Esto proporciona feedback inmediato sin necesidad de esperar el error de la base de datos.

**Censura en el Servidor:** Todo dato de contacto detectado por el trigger es sustituido de forma irreversible por `***` y el contador de infracciones se incrementa.

**Política de Reincidencia Escalada:** La tabla de perfiles mantiene un contador `censorship_strikes`. Al acumular **5 intentos de evasión**, el backend bloquea permanentemente la facultad de enviar mensajes (error `CK001`) y despacha una alerta al SuperAdmin.

**Objetivo:** Evitar que agencias y viajeros compartan datos de contacto para realizar transacciones fuera de la plataforma, garantizando que la comisión correspondiente se aplique en cada pago.

### **3.3 Orquestación de la Omnicanalidad (Triggers de Alerta)**

Las notificaciones se distribuyen a través de canales específicos para equilibrar la inmediatez de la conversión con los costos fijos asociados a la API de WhatsApp Business:

1. **Captura de Lead Básico:** Ocurre cuando un viajero interactúa con un flyer o completa el flujo inicial con el bot guiado de requerimientos. Detona una alerta **Push** en tiempo real en el Dashboard de la agencia e inyecta la entidad Lead en el CRM integrado. *Se excluye el canal de WhatsApp en este paso para mitigar costos de leads fríos.*  
2. **Mensaje Directo en el Chat In-App:** Envía una alerta **Push** instantánea si el agente de viajes se encuentra logueado y activo en la SPA. Si el agente permanece desconectado de la plataforma por un periodo continuo mayor a **5 minutos**, el backend dispara una notificación automatizada por **WhatsApp / Correo Electrónico (vía Resend o SendGrid)** alertándole sobre el mensaje en espera.  
3. **Confirmación Transaccional de Compra:** Al confirmarse con éxito el cobro de un anticipo en la pasarela, el sistema gatilla en paralelo: Notificación **Push** en el Dashboard de la agencia, **Correo electrónico** formal al viajero adjuntando el recibo de Stripe y el acuerdo contractual de condiciones, y un **Mensaje de WhatsApp automatizado** a ambas partes confirmando los detalles de la reservación.

### **3.4 Aplicaciones Móviles Nativas (Android & iOS)**

La plataforma cuenta con aplicaciones móviles nativas para Android e iOS, desarrolladas con implementaciones nativas para maximizar el rendimiento y la integración con las APIs de cada sistema operativo.

**Estrategia de Desarrollo y Frameworks:**

* **iOS:** Swift con SwiftUI. Arquitectura MVVM con `@Observable` y `NavigationStack`.
* **Android:** Kotlin con Jetpack Compose. Arquitectura MVVM con Hilt para inyección de dependencias.
* **Backend compartido:** Ambas aplicaciones consumen la misma infraestructura de Supabase (Auth, PostgREST, Realtime, Storage, Edge Functions) que la versión web.
* **PWA como Respaldo:** La SPA actual se distribuye como Progressive Web App (PWA) con soporte offline básico, instalable desde el navegador en ambos sistemas operativos.

**Experiencia Nativa por Plataforma:**

*Android:*
* Material Design 3 (Material You) con theming dinámico que respeta los colores del sistema del usuario.
* Navegación con gestos predictivos (back gesture) integrada con Jetpack Navigation Compose.
* Notificaciones push nativas vía Firebase Cloud Messaging (FCM).
* Integración con Google Pay para pagos express en checkout.
* Splash Screen API nativa (Android 12+).
* Soporte para pantallas adaptables (foldables, tablets) mediante diseño responsivo con breakpoints.

*iOS:*
* Human Interface Guidelines (HIG) de Apple con navegación por tabs y gestos nativos (swipe back, pull to refresh).
* Notificaciones push nativas vía Apple Push Notification service (APNs).
* Integración con Apple Pay para pagos express en checkout.
* Face ID / Touch ID para autenticación biométrica en inicio de sesión.
* Haptic Feedback (UIImpactFeedbackGenerator) en micro-interacciones críticas: confirmación de compra, agregar a favoritos.
* Widgets en Home Screen y Lock Screen: viajes próximos del usuario, ofertas destacadas del marketplace.
* Dynamic Island para estado de checkout en proceso y notificaciones de mensajes en chat (iPhone 14 Pro en adelante).

**Funcionalidades Compartidas (Ambas Plataformas):**

* **Sincronización en Tiempo Real:** Chat in-app, notificaciones de leads y actualizaciones de estado de compra mediante Supabase Realtime sobre WebSockets. Misma infraestructura de red que la versión web.
* **Modo Offline Parcial:** Consulta de flyers guardados en favoritos y resumen de viajes próximos sin conexión a internet. Sincronización automática de datos al reconectar.
* **Carga de Imágenes Optimizada:** Caché agresiva de flyers en variantes thumbnail (listados) y HD (vista de detalle) según el contexto de visualización. Coil (Android) y AsyncImage (iOS).
* **Cámara para Documentos:** Subida de CSF, comprobantes de pago y otros documentos oficiales directamente desde la cámara del dispositivo con recorte y enderezado automático.
* **Deep Linking Universal:** Soporte para esquemas de URL avimo:// en Android y Universal Links (apple-app-site-association) en iOS para abrir flyers específicos, completar checkouts pendientes o acceder a conversaciones de chat directamente desde notificaciones push o enlaces externos.

**Distribución y CI/CD:**

* **Android:** Distribución vía Google Play Console con build automático desde GitHub Actions. Canales de pruebas internas (alpha) y abiertas (beta) antes de producción.
* **iOS:** Distribución vía App Store Connect con TestFlight para beta testing externo (hasta 10,000 testers). Build automatizado mediante Xcode Cloud o GitHub Actions.
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

### **6.1 Modelo de Comisión Variable por Plan**

La plataforma opera bajo un modelo de intermediación con dos componentes económicos separados: una comisión variable aplicada a la agencia vendedora, determinada por el plan contratado y, en los planes Intermedio y Premium, por el desempeño en conversión de leads (Sección 1.1.3); y una tarifa de procesamiento de pago mostrada por separado al viajero. La tarifa de procesamiento se calcula para cubrir el costo electrónico de Stripe más el IVA aplicable y no constituye la comisión comercial de Avimo.

#### **6.1.1 Tabla Resumen de Comisiones por Plan**

Todas las tasas de comisión indicadas **ya incluyen el IVA (16%)** y se calculan sobre el precio del paquete publicado por la agencia (que por contrato debe incluir IVA).

| Plan | Tasa Base (IVA incluido) | Tasa Preferencial (IVA incluido) | Condición para Preferencial | Mensualidad |
| :--- | :--- | :--- | :--- | :--- |
| Básico | **20%** | — (tasa fija) | No aplica | $0 MXN |
| Intermedio | **18%** | **17%** | Conversión ≥ 5% en ventana de 3 meses | $1,799 MXN |
| Premium | **15%** | **12%** | Conversión ≥ 8% en ventana de 3 meses | $2,999 MXN |
| Fundador | **7.5%** | — (tasa fija) | No aplica. Cerrado tras 10 agencias. | $0 MXN |

**Desglose fiscal por cada tasa (IVA 16%):**

| Tasa Nominal (IVA incl.) | Subtotal Comisión (sin IVA) | IVA Comisión (16%) | IVA Acreditable para Agencia |
| :--- | :--- | :--- | :--- |
| 20% | 17.24% | 2.76% | 2.76% |
| 18% | 15.52% | 2.48% | 2.48% |
| 17% | 14.66% | 2.34% | 2.34% |
| 15% | 12.93% | 2.07% | 2.07% |
| 12% | 10.34% | 1.66% | 1.66% |
| 7.5% | 6.47% | 1.03% | 1.03% |

#### **6.1.2 Cálculo de la Comisión — Fórmula General**

```
Comisión Total del Abono = Importe del abono confirmado (IVA incluido) × Tasa de Comisión del Plan

Subtotal Comisión = Comisión Total / 1.16
IVA Comisión = Comisión Total − Subtotal Comisión

Monto Agencia = Importe del abono − Comisión Total
Tarifa de Procesamiento = costo Stripe estimado + IVA de la tarifa
Monto Avimo (application_fee_amount) = Comisión Total + Tarifa de Procesamiento
```

* **Base de cálculo:** Cada abono confirmado, cuyo precio publicado debe incluir el IVA aplicable. El sistema conserva el total del paquete separado del importe efectivamente cobrado.
* **Tasa aplicable:** La tasa de comisión vigente para la agencia al momento de la transacción, determinada por su `plan_type` y el campo `commission_rate` en `agencies_tenants`.  
* **IVA de la comisión:** La agencia recibe un CFDI por el IVA de la comisión retenida, que es 100% acreditable contra sus propias obligaciones fiscales.

#### **6.1.3 Desglose por Plan — Ejemplo sobre Venta de $10,000 MXN**

Estos ejemplos representan una liquidación completa de $10,000 MXN. En el checkout inicial solo se cobra el anticipo global del 20%; la comisión se calcula proporcionalmente sobre cada abono y la tarifa de procesamiento se muestra al viajero por separado.

**Plan Básico — Tasa 20% (Fija):**

| Concepto | Cálculo | Monto |
| :--- | :--- | :--- |
| Precio del paquete (IVA incluido) | — | **$10,000.00** |
| Subtotal paquete | $10,000 / 1.16 | $8,620.69 |
| IVA paquete (16%) | | $1,379.31 |
| **Total cobrado al viajero** | | **$10,000.00** |
| Comisión total (20% s/precio) | $10,000 × 20% | $2,000.00 |
| Subtotal comisión | $2,000 / 1.16 | $1,724.14 |
| IVA comisión (16%) | | $275.86 |
| **Monto dispersado a la agencia** | $10,000 − $2,000 | **$8,000.00** |
| **Monto Avimo (application\_fee\_amount)** | $2,000 | **$2,000.00** |
| Stripe: tarifa vigente sobre el cargo total | | Se concilia con Stripe |
| IVA Stripe (acreditable) | | $66.08 |
| Total costo Stripe | | $479.08 |
| **Neto Avimo** | | **$1,520.92** |
| IVA neto a pagar al SAT (comisión − Stripe) | | $209.78 |

**Plan Intermedio — Tasa Base 18% / Tasa Preferencial 17%:**

| Concepto | Tasa Base (18%) | Tasa Preferencial (17%) |
| :--- | :--- | :--- |
| Comisión total | $10,000 × 18% = **$1,800.00** | $10,000 × 17% = **$1,700.00** |
| Subtotal comisión | $1,551.72 | $1,465.52 |
| IVA comisión | $248.28 | $234.48 |
| **Monto agencia** | **$8,200.00** | **$8,300.00** |
| Monto Avimo | $1,800.00 | $1,700.00 |
| Tarifa Stripe + IVA | Se concilia con Stripe | Se concilia con Stripe |
| **Neto Avimo** | **$1,320.92** | **$1,220.92** |
| IVA neto al SAT | $182.20 | $168.40 |
| Ahorro para agencia vs. tasa base | — | **+$100.00 por venta** |

**Plan Premium — Tasa Base 15% / Tasa Preferencial 12%:**

| Concepto | Tasa Base (15%) | Tasa Preferencial (12%) |
| :--- | :--- | :--- |
| Comisión total | $10,000 × 15% = **$1,500.00** | $10,000 × 12% = **$1,200.00** |
| Subtotal comisión | $1,293.10 | $1,034.48 |
| IVA comisión | $206.90 | $165.52 |
| **Monto agencia** | **$8,500.00** | **$8,800.00** |
| Monto Avimo | $1,500.00 | $1,200.00 |
| Tarifa Stripe + IVA | Se concilia con Stripe | Se concilia con Stripe |
| **Neto Avimo** | **$1,020.92** | **$720.92** |
| IVA neto al SAT | $140.82 | $99.44 |
| Ahorro para agencia vs. tasa base | — | **+$300.00 por venta** |

**Plan Fundador — Tasa 7.5% (Fija):**

| Concepto | Cálculo | Monto |
| :--- | :--- | :--- |
| Comisión total (7.5% s/precio) | $10,000 × 7.5% | $750.00 |
| Subtotal comisión | $750 / 1.16 | $646.55 |
| IVA comisión (16%) | | $103.45 |
| **Monto agencia** | $10,000 − $750 | **$9,250.00** |
| Monto Avimo | $750 | $750.00 |
| Tarifa Stripe + IVA | | Se concilia con Stripe |
| **Neto Avimo** | | **$270.92** |
| IVA neto al SAT | | $37.37 |

#### **6.1.4 Comparativa entre Planes (sobre $10,000 MXN)**

| Plan | Tasa | Comisión Retenida | Agencia Recibe | Neto Avimo |
| :--- | :--- | :--- | :--- | :--- |
| Fundador | 7.5% | $750.00 | **$9,250.00** | $270.92 |
| Premium (pref.) | 12% | $1,200.00 | **$8,800.00** | $720.92 |
| Premium (base) | 15% | $1,500.00 | **$8,500.00** | $1,020.92 |
| Intermedio (pref.) | 17% | $1,700.00 | **$8,300.00** | $1,220.92 |
| Intermedio (base) | 18% | $1,800.00 | **$8,200.00** | $1,320.92 |
| Básico | 20% | $2,000.00 | **$8,000.00** | $1,520.92 |

#### **6.1.5 Reglas de Cambio de Plan**

* **Upgrade (subir de plan):** Una agencia puede solicitar upgrade de plan en cualquier momento desde su Panel de Finanzas. El cambio es inmediato una vez aprobado, y la nueva tasa de comisión aplica a partir de la siguiente venta. Si el upgrade implica un aumento de mensualidad (ej. Básico → Intermedio, Intermedio → Premium), la diferencia proporcional del ciclo de facturación se cobra al momento del cambio.  
* **Downgrade (bajar de plan):** El downgrade se aplica al final del ciclo de facturación vigente (fin de mes). Durante el ciclo en curso, la agencia mantiene su plan y tasa actuales. Al iniciar el nuevo ciclo, se aplica la tasa del plan inferior y se ajusta la mensualidad.  
* **Plan Fundador:** El Plan Fundador se asigna exclusivamente por aprobación del SuperAdmin desde el panel de administración. La agencia no puede hacer upgrade hacia Plan Fundador desde el portal de autoservicio. Una agencia Fundador puede solicitar cambio a otro plan (Básico, Intermedio o Premium), pero pierde su plaza de Fundador de forma irreversible y no podrá recuperarla. Una vez que las 10 plazas han sido ocupadas, el Plan Fundador se cierra de forma permanente. Ver Sección 1.1.5 para las reglas de transición al cumplirse el año del Plan Fundador.
* **Periodo de prueba:** Las agencias nuevas en los planes de paga (Plan Intermedio y Plan Premium) gozan de los primeros 30 días sin cobro de mensualidad (periodo de prueba, gestionado mediante `trial_period_days` de Stripe Billing). El periodo de prueba es de **una sola vez por agencia**: si ya se consumió en uno de los dos planes, no se otorga nuevamente al cambiarse al otro. A partir del día 31, inicia la facturación recurrente mensual. Durante el periodo de prueba, la tasa de comisión base del plan (18% Intermedio / 15% Premium) aplica normalmente.

#### **6.1.6 Tarifa de Procesamiento de Pago**

El viajero observa y paga una tarifa de procesamiento separada en el checkout. La tarifa se calcula con base en el método de pago, la tasa vigente de Stripe, el cargo fijo y el IVA aplicable. Debido a que Stripe calcula su costo sobre el cargo total, el checkout utiliza un cálculo de ajuste y el webhook debe conciliar el importe real contra el `balance_transaction`.

La tarifa no se presenta como una comisión comercial de Avimo. La comisión de Avimo se descuenta de la liquidación de la agencia. En caso de cancelación imputable a la agencia, la agencia absorbe el costo de procesamiento y cualquier diferencia no recuperable.

#### **6.1.7 Esquema de Split Payments (Stripe Connect)**

La pasarela captura el monto total de la venta y aplica split mediante `application_fee_amount`, reteniendo hacia Avimo el monto correspondiente a la comisión según el plan y tasa vigente de la agencia. El remanente se dispersa a la cuenta bancaria de la agencia vía Stripe Connect.

#### **6.1.8 Blindaje contra Contracargos Bancarios (Disputes)**

Al operar bajo el modelo Express/Custom de Stripe Connect, si un viajero inicia una disputa o contracargo directamente con su institución bancaria alegando fraude o incumplimiento, **la responsabilidad financiera y el saldo negativo resultante son transferidos íntegramente por Stripe al balance de la cuenta conectada de la agencia**. La plataforma SaaS queda totalmente exenta de absorber la pérdida monetaria de la disputa bancaria.

#### **6.1.9 Compromiso de Precios con IVA (Disclaimer para Agencias)**

Como parte del registro corporativo, las agencias aceptan obligatoriamente el Compromiso de Precios con IVA, donde se comprometen a publicar todos los precios con IVA incluido (16%) y reconocen que Avimo retendrá la comisión correspondiente según el plan contratado y la tasa vigente al momento de cada transacción. La tasa de comisión aplicable está definida en el contrato firmado (Sección 1.1.2) y es visible en tiempo real en el Panel de Finanzas de la agencia.

### **6.2 Planes de Pago Diferidos e Impagos B2C**

Las agencias tienen la facultad de habilitar planes de financiamiento con un **plazo máximo de 4 meses** para liquidar el viaje. El anticipo inicial es una regla global de Avimo y corresponde al **20% del precio total del paquete**. La agencia no puede sustituir este porcentaje desde el checkout.

* **Gestión de Mensualidades:** Se implementa de forma estricta la **Opción B (Manual por enlace)**. El backend no realizará cobros recurrentes automatizados a la tarjeta del cliente. En su lugar, el motor de comunicación omnicanal enviará cada mes notificaciones automatizadas con un link exclusivo de Stripe Checkout para que el viajero ingrese y liquide su abono de forma manual.  
* **Corte Proporcional de Comisión:** La comisión correspondiente a la plataforma (según la tasa vigente del plan de la agencia — Sección 6.1.1) **se cobrará de manera proporcional sobre cada abono** conforme el viajero vaya pagando mes con mes.
* **Morosidad:** El backend otorga un **periodo de tolerancia de 15 días naturales a partir de la fecha de corte** (`GRACE_PERIOD_DAYS = 15`). La cancelación por falta de pago no elimina automáticamente los derechos de devolución que pudieran aplicar; debe evaluarse conforme a la política de cancelación, la fecha de salida y los costos no recuperables informados.

#### **6.2.1 Política de Cancelación y Reembolsos**

Avimo actúa como intermediario entre el viajero y la agencia. El viajero contrata el servicio turístico con la agencia identificada en la orden, mientras que Avimo procesa el pago, conserva la trazabilidad y administra el flujo de reembolso.

* **Anticipo:** La reserva requiere un anticipo estándar del 20% del precio total del paquete. El anticipo confirma la intención de compra, pero no elimina los derechos legales aplicables.
* **Ventana inicial:** Las solicitudes realizadas dentro de los cinco días hábiles posteriores a la contratación se procesan sin penalización cuando el servicio no haya comenzado ni sido consumido, sujeto a las excepciones legales aplicables.
* **Cancelación con 60 días o más:** Se devuelve el importe pagado menos costos no recuperables comprobables e informados antes del pago.
* **Cancelación entre 30 y 59 días:** Puede aplicarse una penalización máxima operativa del 25% del importe pagado, además de costos no recuperables que correspondan conforme a la política publicada.
* **Cancelación entre 15 y 29 días:** Puede aplicarse una penalización máxima operativa del 50% del importe pagado, además de costos no recuperables que correspondan.
* **Cancelación con menos de 15 días:** Se devuelve únicamente el importe que los proveedores finales autoricen recuperar, salvo derechos legales o incumplimiento del proveedor.
* **Servicio iniciado o no presentación:** No se devuelve el importe de servicios ya iniciados, abandonados voluntariamente o no utilizados por causas imputables al viajero, salvo que el proveedor final autorice una devolución.
* **Cancelación imputable a la agencia:** La agencia absorbe la comisión de Avimo, el costo de procesamiento no recuperable y los costos de reembolso. El viajero recibe el reembolso que corresponda sin que la tarifa de procesamiento se convierta en una pérdida imputable a él.
* **Fuerza mayor:** Avimo gestiona reprogramación, crédito aceptado por el viajero o devolución del importe recuperable conforme a las condiciones del proveedor final y la legislación aplicable.
* **Protección financiera:** Avimo puede retener liquidaciones, revertir transferencias de Stripe, utilizar la reserva financiera de la agencia o registrar un saldo negativo para cubrir importes a cargo de la agencia.

El sistema guarda la versión de la política aceptada, la fecha de aceptación, el motivo de cancelación, el importe pagado, la penalización, el reembolso y el cargo a la agencia. Los reembolsos se procesan de forma idempotente y regresan al medio de pago original cuando Stripe lo permite.

### **6.3 Delimitación de Responsabilidad Fiscal (CFDI México)**

* **Facturación de la Plataforma (B2B):** El backend automatizará el timbrado fiscal de facturas electrónicas (CFDI para el mercado de México) consumiendo la API externa de **Facturama**. El sistema emitirá los comprobantes fiscales correspondientes dirigidos a las agencias exclusivamente por el concepto de las comisiones retenidas según el plan contratado y la tasa vigente al momento de cada transacción (Sección 6.1.1).  
* **Facturación del Viaje (B2C):** La emisión de facturas fiscales CFDI por el monto total del paquete de viaje o los anticipos aportados por los viajeros queda **100% bajo la responsabilidad operativa y legal de la agencia de viajes contratada** (siguiendo estrictamente el modelo de transacciones descentralizadas de Amazon). La plataforma SaaS no intervendrá en el timbrado ni en la conciliación fiscal de los servicios turísticos comercializados entre agencias y consumidores finales.

#### **6.3.1 Timbrado de CFDI Bajo Demanda**

La plataforma genera automáticamente registros de ingresos fiscales (`fiscal_income_records`) por cada comisión retenida, pero el timbrado del CFDI ante el SAT se realiza **exclusivamente bajo demanda de la agencia** desde el Dashboard Contable:

* **Flujo:** La agencia navega a Finanzas → Ingresos Fiscales, identifica el registro pendiente y hace clic en **"Timbrar CFDI"**.  
* **Procesamiento:** El endpoint `generate-cfdi` construye el payload CFDI 4.0 (tipo Ingreso, uso G03 y régimen fiscal validado) con los datos fiscales de la agencia (RFC, razón social, dirección) y lo envía a la API de Facturama.
* **Persistencia:** Al recibir respuesta exitosa de Facturama, el sistema actualiza el registro fiscal con `cfdi_uuid`, `cfdi_status = 'issued'`, `cfdi_pdf_url` y `cfdi_xml_url`.  
* **Descarga:** Una vez timbrado, la agencia puede descargar el PDF y XML directamente desde la tabla de ingresos fiscales.  
* **CFDI ya emitido:** Si el registro ya tiene un CFDI timbrado, el sistema retorna los URLs existentes sin volver a timbrar.

### **6.4 Sistema de Lealtad y Cartera Virtual (Avimo Puntos) — TEMPORALMENTE INACTIVO**

> **Estado actual (septiembre 2026):** El sistema de lealtad Avimo Puntos está **temporalmente desactivado**. La funcionalidad completa de acumulación, canje, visualización de saldo, historial y aplicación de puntos como método de pago parcial ha sido retirada del frontend (web y móvil) y del backend (edge functions y webhooks). No se generan ni descuentan puntos en ninguna transacción.

#### **6.4.1 Alcance de la Desactivación**

* **Frontend web:** Eliminados el badge de puntos en la navbar, la ruta `/wallet`, la pantalla de historial, el slider de canje en checkout, y los textos de "Ganarás N pts".
* **Aplicaciones móviles:** Eliminados los módulos de wallet, balance, slider de canje, y cualquier referencia a puntos en el flujo de checkout (iOS y Android).
* **Backend:** `create-checkout` ya no acepta ni procesa `points_to_redeem`. `stripe-webhook` ya no acredita ni debita puntos. `review-package` ya no otorga puntos por reviews aprobadas.
* **Comisiones:** La comisión se calcula sobre el monto total del pago confirmado (anticipo o abono), sin descuento por puntos. La agencia no se ve afectada.

#### **6.4.2 Datos Preservados**

* Las tablas `user_wallets` y `wallet_transactions` permanecen en la base de datos con sus datos históricos intactos.
* Las columnas `points_earned` y `points_redeemed` en `transactions_orders` permanecen definidas pero no reciben escrituras activas.
* Las funciones RPC `credit_points`, `debit_points` y `get_or_create_wallet` permanecen disponibles en la base de datos pero no son invocadas por ninguna ruta de aplicación.
* Los saldos históricos de los viajeros se conservan y serán válidos cuando el sistema se reactive.

#### **6.4.3 Plan de Reactivación Futura**

Cuando se decida reactivar el sistema de puntos, se seguirá el siguiente protocolo:

1. **Definir política versionada:** Establecer `loyalty_policy_version = 1` con las reglas vigentes de acumulación, canje y límites.
2. **Decidir tratamiento de saldos históricos:** Determinar si los saldos previos permanecen válidos, expiran, o requieren aceptación explícita del usuario.
3. **No otorgar puntos retroactivos:** Las compras realizadas durante el periodo de inactividad no generarán puntos acumulados.
4. **Activar progresivamente:**
   - Fase 1: Lectura administrativa de wallets existentes (auditoría).
   - Fase 2: Habilitar acumulación con procesamiento idempotente en webhooks.
   - Fase 3: Habilitar canje en checkout (detrás de un feature flag separado).
   - Fase 4: Habilitar bonos, promociones y eventos multiplicadores.
5. **Safeguards operativos:** Idempotencia en cada mutación de wallet, ledger inmutable de transacciones, reversión automática por disputas, y conciliación contra eventos de Stripe.
6. **Gate server-side obligatorio:** El flag `LOYALTY_POINTS_ENABLED` debe controlarse desde el backend (Edge Functions / RPCs), no solo desde el frontend. Los clientes deben consultar el estado del programa antes de mostrar cualquier UI de wallet.

### **6.5 Contabilidad Fiscal y Trazabilidad de Ingresos (Panel SuperAdmin)**

La plataforma incluye un módulo de contabilidad fiscal accesible exclusivamente desde el Panel SuperAdmin (`/admin`, pestaña "Fiscal"), diseñado para facilitar la declaración de impuestos ante el SAT y la trazabilidad financiera completa de la empresa. El módulo se divide en tres sub-pestañas: Ingresos, Egresos, y Periodos Fiscales.

#### **6.5.1 Registro Automático de Ingresos**

Cada pago exitoso en Stripe (`checkout.session.completed`) genera automáticamente un registro en la tabla `fiscal_income_records`:

| Registro | Tipo | Contenido |
| :--- | :--- | :--- |
| Comisión de la agencia | `agency_commission` | Subtotal sin IVA, IVA cobrado, fee de Stripe con su IVA acreditable, total |

Cada registro incluye:
- **`order_id`:** Trazabilidad completa a la orden de compra original.
- **`stripe_fee` / `stripe_fee_iva`:** El costo de Stripe imputado a ese ingreso, permitiendo calcular el neto real.
- **`cfdi_status`:** Estado del CFDI (`pending`, `issued`, `cancelled`). La emisión de CFDI por comisiones a agencias se realiza vía Facturama en lote o individualmente.
- **`fiscal_period_id`:** Se asigna automáticamente al cerrar un periodo fiscal, vinculando el ingreso al periodo correspondiente.

La pestaña "Ingresos" del panel muestra KPIs (ingresos brutos, IVA cobrado, Stripe fees, IVA Stripe acreditable, neto real), filtros por tipo (`agency_commission`), y tabla completa con todos los campos.

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
| `stripe_fees` | Fees de Stripe (gasto operativo de la plataforma) |
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
| `fiscal_income_records` | Ingresos automáticos por cada pago exitoso | Agencia (lectura) + SuperAdmin |
| `fiscal_expense_records` | Egresos registrados por agencias y SuperAdmin | Agencia (lectura/escritura propia) + SuperAdmin |
| `fiscal_periods` | Periodos mensuales/trimestrales/anuales con totales | Solo SuperAdmin (RLS) |

**RPCs disponibles:**
- `calculate_period_totals(p_start DATE, p_end DATE)` — Calcula sumas de ingresos y egresos para un rango de fechas.
- `close_fiscal_period(p_period_id UUID)` — Cierra un periodo, calcula totales, asigna registros al periodo.
- `credit_points` / `debit_points` — Gestión de puntos de lealtad (Sección 6.4). **TEMPORALMENTE INACTIVAS:** las funciones permanecen en la base de datos pero no son invocadas por ninguna ruta de aplicación mientras el programa de lealtad esté desactivado.

**Cumplimiento Fiscal:**
- Todos los ingresos por comisiones generan IVA trasladado que debe enterarse al SAT.
- Todos los egresos con CFDI de proveedor generan IVA acreditable.
- Stripe emite CFDI por sus fees, cuyo IVA es acreditable para Avimo.
- La diferencia neta (IVA cobrado − IVA acreditable) es lo que se declara y paga al SAT en cada periodo.
- Las agencias reciben CFDI por las comisiones retenidas (según plan y tasa vigente), que acreditan contra sus propios impuestos.

### **6.6 Registro de Gastos Operativos de Agencia**

Además del panel de egresos del SuperAdmin (Sección 6.5.2), **cada agencia puede registrar sus propios gastos operativos** desde el Dashboard Contable (Finanzas → Gastos), permitiendo un control contable autogestionado:

* **Categorías disponibles:** Infraestructura, API/IA, Nómina, Renta, Software, Marketing, Legal/Contable, Comisiones Stripe, Otro.  
* **Campos del gasto:** Concepto, categoría, proveedor (nombre y RFC opcional), subtotal, IVA, notas.  
* **Cálculo automático de IVA:** Si no se especifica, el sistema calcula el IVA como 16% del subtotal. El total se calcula como subtotal + IVA.  
* **Propiedad:** Cada gasto se asocia al `tenant_id` de la agencia que lo registró. Las políticas RLS garantizan que cada agencia solo vea y gestione sus propios gastos.  
* **Visibilidad dual:** El SuperAdmin puede ver todos los gastos de todas las agencias en el panel de egresos fiscales, consolidados por tenant. La agencia solo ve los suyos.  
* **Integración con P&L:** Los gastos registrados alimentan automáticamente el Estado de Resultados (P&L) en el Dashboard Contable de la agencia.

## **7\. PARTE 6: ARQUITECTURA DE PERSISTENCIA E ENDPOINTS INTERNACIONALIZABLES**

### **7.1 Estrategia Multi-Tenant en Base de Datos (PostgreSQL RLS)**

La persistencia de datos opera sobre una base de datos única compartida utilizando un esquema compartido, implementando de manera mandatoria las políticas de **Row-Level Security (RLS) de PostgreSQL** para garantizar aislamiento absoluto de datos entre inquilinos comerciales y evitar fugas inter-empresariales. Toda tabla operativa que almacene datos sensibles del negocio de una agencia incluirá la columna indexada tenant\_id.

### **7.2 Normalización Internacionalizable (i18n / Horarios)**

* **Abstracción Financiera:** Se eliminan de las columnas operativas las referencias monetarias regionales (como precio\_mxn)\[cite: 1, 3\]. Se refactorizan a variables numéricas genéricas acompañadas por un código de divisa tipado bajo el estándar ISO 4217 (currency), dejando el sistema listo para operar en USD o EUR durante fases de expansión fuera de México.  
* **Abstracción del Tiempo:** Absolutamente todos los registros de auditoría, marcas de tiempo y fechas de salida/regreso de itinerarios se almacenarán obligatoriamente en formato **UTC** dentro de PostgreSQL. El frontend de la SPA en React será la capa encargada de convertir y renderizar las horas y fechas locales, tomando como eje de conversión geográfica **el lugar físico donde se encuentra registrada la agencia de viajes** para facilitar el entendimiento de la logística.

### **7.3 Diccionario de Tablas Core Robustecido**

#### **Tabla: agencies\_tenants**

Almacena las configuraciones generales del inquilino corporativo, sus credenciales fiscales de registro, el plan contratado y sus relaciones con las pasarelas externas.

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
    status VARCHAR(50) DEFAULT 'En Revisión', \-- En Revisión, Activo, Suspendido por Pago, Suspendido por Fraude
    plan_type VARCHAR(50) DEFAULT 'Intermedio', \-- Básico, Intermedio, Premium, Fundador
    commission_rate NUMERIC(5,2) NOT NULL DEFAULT 18.00, \-- Tasa de comisión vigente (IVA incluido). 18% para Intermedio por defecto.
    conversion_window_leads INTEGER DEFAULT 0, \-- Leads generados en plataforma en la ventana de 3 meses
    conversion_window_sales INTEGER DEFAULT 0, \-- Ventas efectivas (plataforma + externas) en la ventana de 3 meses
    conversion_rate NUMERIC(5,2), \-- Tasa de conversión calculada: (ventas totales / leads) × 100. Incluye ventas externas registradas.
    preferential_rate_active BOOLEAN DEFAULT FALSE, \-- TRUE si goza de tasa preferencial por conversión
    consecutive_months_below_threshold INTEGER DEFAULT 0, \-- Meses consecutivos bajo el umbral de conversión. Al llegar a 2, se revierte a tasa base.
    verification_status VARCHAR(50) DEFAULT 'pending', \-- pending, verified, rejected (requisitos adicionales 1.1.2)
    contract_signed_at TIMESTAMP WITH TIME ZONE, \-- Fecha de firma de contrato con la plataforma
    contract_pdf_url TEXT, \-- Contrato firmado en bucket privado
    overbooking_incidents INTEGER DEFAULT 0, \-- Contador de incidentes de sobreventa. ≥3 → suspensión por fraude (Sección 8.6)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
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
    departure\_city VARCHAR(150) DEFAULT '', \-- Ciudad de origen/salida del viaje (lista curada de aeropuertos principales)
    total\_rooms INTEGER DEFAULT 0, \-- Total de habitaciones/cupos declarados. 0 = sin límite (retrocompatible)
    available\_rooms INTEGER DEFAULT 0, \-- Habitaciones disponibles. Se decrementa en cada venta (plataforma o externa)
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
    platform\_commission\_fee NUMERIC(12, 2\) NOT NULL, \-- Comisión retenida según plan y tasa vigente, proporcional por abono  
    points\_earned INTEGER DEFAULT 0, \-- TEMPORALMENTE INACTIVO: columna preservada para compatibilidad. No recibe escrituras mientras el programa de lealtad esté desactivado (Sección 6.4).
    points\_redeemed INTEGER DEFAULT 0, \-- TEMPORALMENTE INACTIVO: columna preservada para compatibilidad. No recibe escrituras mientras el programa de lealtad esté desactivado (Sección 6.4).
    payment\_status VARCHAR(50) DEFAULT 'pending', \-- pending, partial\_paid, paid, moroso, cancelled  
    next\_payment\_due TIMESTAMP WITH TIME ZONE, \-- Fecha límite del mes (UTC) para control de los 5 días de gracia  
    created\_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())  
);

#### **Tabla: user\_wallets**

**TEMPORALMENTE INACTIVA (Sección 6.4):** La tabla y sus datos históricos permanecen preservados para compatibilidad y futura reactivación del programa de lealtad. No recibe escrituras ni lecturas activas desde la aplicación.

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

**TEMPORALMENTE INACTIVA (Sección 6.4):** La tabla y sus datos históricos permanecen preservados para compatibilidad y futura reactivación del programa de lealtad. No recibe escrituras ni lecturas activas desde la aplicación.

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

CREATE TABLE user\_saved\_packages (
    id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),
    user\_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    package\_id UUID NOT NULL REFERENCES travel\_packages(package\_id) ON DELETE CASCADE,
    saved\_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(user\_id, package\_id)
);

### **7.4 Capa de API Gateway y Endpoints Críticos**

* POST /api/v1/agency/roles/create  
  * **Acceso:** Privado (Agency\_Admin en exclusividad)\[cite: 1, 2\].  
  * **Lógica:** Intercepta la petición y realiza una subconsulta en la base de datos para verificar el conteo actual de registros en custom\_roles\_permissions vinculados a ese tenant\_id. Evalúa el campo `plan_type` de la agencia en `agencies_tenants` para determinar el límite aplicable: Básico e Intermedio: 0 o 1 rol adicional respectivamente; Premium y Fundador: hasta 3 roles personalizados. Si la agencia ya alcanzó su límite, el endpoint rechaza la creación con una excepción de cuota y un mensaje indicando el límite del plan y la opción de hacer upgrade.  
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
   * **Lógica:** Configura e inicializa una sesión de Stripe Checkout inyectando los parámetros de Stripe Connect. Procesa la compra en el siguiente orden: (1) Valida disponibilidad de inventario: si el paquete tiene `total_rooms > 0` y `available_rooms <= 0`, rechaza con error "Paquete agotado". (2) Si el paquete tiene inventario limitado, crea un hold temporal de 15 minutos mediante `create_inventory_hold` para prevenir race conditions. El hold_id se transmite en los metadatos de Stripe para su consumo en el webhook. (3) Calcula el monto del anticipo según el `deposit_percent` (mínimo 20% del precio del paquete). (4) Calcula la comisión según el plan y tasa vigente de la agencia (`commission_rate` en `agencies_tenants`) sobre el monto del anticipo y configura el split de Stripe Connect reteniendo ese monto hacia la plataforma, dispersando el resto a la cuenta Express de la agencia. (5) Si el pago es diferido en plazos, programa las alertas de cobro mensual manual en el sistema de mensajería omnicanal con recordatorios y links exclusivos de Stripe Checkout. Nota: el sistema de puntos de lealtad (Sección 6.4) está temporalmente inactivo; no se validan ni aplican puntos en el flujo de checkout.
* POST /api/v1/inventory/sync
  * **Acceso:** Privado (Agencia autenticada con JWT). Edge Function: `sync-inventory`.
  * **Lógica (action=sync):** Permite a la agencia sincronizar manualmente o vía API externa el inventario de un paquete. Valida que `package_id` pertenezca al `tenant_id` del usuario autenticado. Actualiza `total_rooms` y `available_rooms` en `travel_packages` mediante la RPC `sync_inventory_external`. Registra automáticamente el cambio en `inventory_audit_log` con tipo `sync` y origen configurable (default: `external_pms`). Rechaza si `available_rooms > total_rooms`.
  * **Lógica (action=external_sale):** Permite a la agencia registrar una venta realizada fuera de la plataforma. Requiere `rooms_sold ≥ 1`, opcionalmente `package_id`, `total_amount`, `currency` y `notes`. Ejecuta la RPC `register_external_sale` que inserta en `external_sales_log`, decrementa `available_rooms` del paquete asociado, y registra en `inventory_audit_log` con tipo `external_sale`. Retorna el `sale_id` generado. El panel de conciliación en `AgencyFinance` consume este endpoint.

## **8\. PARTE 7: CONTROL DE INVENTARIO, VENTAS EXTERNAS Y MITIGACIÓN DE SOBREVENTA**

La plataforma implementa un sistema integral de control de inventario para prevenir la sobreventa (overbooking) —el principal riesgo cuando las agencias venden habitaciones fuera de la plataforma sin reflejarlo en el sistema—. El diseño abarca desde la declaración de cupos por paquete hasta la conciliación de ventas externas, auditoría completa de cambios, y mecanismos automáticos de suspensión por fraude.

### **8.1 Modelo de Inventario por Paquete**

Cada paquete turístico (`travel_packages`) incorpora dos nuevos campos:

| Campo | Tipo | Descripción |
|:---|:---|:---|
| `total_rooms` | INTEGER DEFAULT 0 | Total de habitaciones/cupos declarados por la agencia al crear el flyer. `0` = sin límite (retrocompatible con paquetes existentes). |
| `available_rooms` | INTEGER DEFAULT 0 | Habitaciones disponibles en tiempo real. Se decrementa en cada venta confirmada (plataforma o externa). Se incrementa en reversiones por disputa. |

**Reglas de integridad:**

- `CHECK (total_rooms >= 0 AND available_rooms >= 0 AND (total_rooms = 0 OR available_rooms <= total_rooms))`
- Al crear un flyer desde `AgencyFlyers`, `available_rooms` se inicializa igual a `total_rooms`.
- Si `total_rooms = 0`, el paquete se considera de disponibilidad ilimitada (sin control de inventario).
- El trigger `enforce_inventory_first` impide publicar (`published`) un paquete con `total_rooms > 0` y `available_rooms <= 0`.

**Visualización en la interfaz:**

- **Marketplace (FlyerCard):** Badge "Agotado" en rojo si `available_rooms <= 0`. Badge "¡X disponibles!" en amarillo si quedan ≤ 5 unidades. Tarjeta con opacidad reducida si está agotado.
- **PackageDetailPage:** Indicador textual "X de Y habitaciones disponibles" o "Agotado". Botones "Agregar al carrito" y "Solicitar información" deshabilitados cuando el paquete está agotado.
- **AgencyFlyers (tabla de gestión):** Columna "Disp." muestra `available_rooms/total_rooms` o "Ilimitado". El botón de publicar valida que haya disponibilidad antes de permitir la acción.

### **8.2 Registro de Ventas Externas y Conciliación**

Para que las agencias puedan reportar ventas realizadas fuera de la plataforma (ventas directas en oficina, telefónicas, etc.) y mantener el inventario sincronizado, se implementa el subsistema de conciliación:

#### **Tabla: external_sales_log**

```
CREATE TABLE external_sales_log (
    sale_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES agencies_tenants(tenant_id) ON DELETE CASCADE,
    package_id UUID REFERENCES travel_packages(package_id) ON DELETE SET NULL,
    rooms_sold INTEGER NOT NULL DEFAULT 1,
    total_amount NUMERIC(12,2),
    currency VARCHAR(3) DEFAULT 'MXN',
    sale_date TIMESTAMPTZ DEFAULT timezone('utc', now()),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);
```

**RLS:** Acceso exclusivo a la propia agencia con rol `Agency_Admin` o permiso `can_manage_finance`. SuperAdmin tiene visibilidad total.

#### **RPC: register_external_sale**

```
register_external_sale(
  p_tenant_id UUID,
  p_package_id UUID,
  p_rooms_sold INTEGER DEFAULT 1,
  p_total_amount NUMERIC DEFAULT NULL,
  p_currency VARCHAR DEFAULT 'MXN',
  p_notes TEXT DEFAULT NULL
) RETURNS UUID
```

1. Inserta el registro en `external_sales_log`.
2. Si se asocia a un `package_id` con `total_rooms > 0`, decrementa `available_rooms` en el paquete.
3. Registra el cambio en `inventory_audit_log` con tipo `external_sale`.
4. Retorna el `sale_id` generado.

#### **Panel de Conciliación (ExternalSalesPanel)**

Integrado en la página `AgencyFinance` como nueva sección. Permite a la agencia:

- Visualizar el historial completo de ventas externas registradas (paquete, habitaciones, monto, fecha, notas).
- Registrar nuevas ventas externas mediante un modal con campos: paquete (opcional), habitaciones vendidas, monto total, divisa, notas.
- La llamada se realiza a través del endpoint `sync-inventory?action=external_sale` que consume la RPC.

### **8.3 Pools de Inventario Compartido (Fase 3)**

Para agencias que gestionan bloques de habitaciones repartidos entre múltiples paquetes (ej. 50 habitaciones de un mismo hotel distribuidas en 3 flyers distintos), se introducen los pools de inventario:

#### **Tabla: inventory_pools**

```
CREATE TABLE inventory_pools (
    pool_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES agencies_tenants(tenant_id) ON DELETE CASCADE,
    pool_name VARCHAR(255) NOT NULL,
    total_units INTEGER NOT NULL CHECK (total_units > 0),
    available_units INTEGER NOT NULL CHECK (available_units >= 0),
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    CONSTRAINT inventory_pools_units_check CHECK (available_units <= total_units)
);
```

#### **Tabla: package_inventory_link**

```
CREATE TABLE package_inventory_link (
    link_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES travel_packages(package_id) ON DELETE CASCADE,
    pool_id UUID NOT NULL REFERENCES inventory_pools(pool_id) ON DELETE CASCADE,
    allocated_units INTEGER NOT NULL DEFAULT 0 CHECK (allocated_units >= 0),
    UNIQUE(package_id, pool_id)
);
```

**RLS mínimo privilegio:** Agencias solo ven y gestionan sus propios pools. Vínculos paquete-pool visibles solo si el pool pertenece a su tenant. SuperAdmin tiene visibilidad global.

### **8.4 Sistema de Holds y Prevención de Race Conditions (Fase 4)**

Durante el proceso de checkout, existe una ventana de tiempo entre que el usuario inicia el pago en Stripe y este se confirma. Para evitar que dos usuarios compren la misma habitación simultáneamente, se implementa un sistema de reservas temporales (holds):

#### **Tabla: inventory_holds**

```
CREATE TABLE inventory_holds (
    hold_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES travel_packages(package_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    units_held INTEGER NOT NULL DEFAULT 1 CHECK (units_held > 0),
    expires_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'released', 'consumed')),
    stripe_session_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);
```

**Flujo completo del hold:**

1. **Creación (`create_inventory_hold`):** Al iniciar checkout en `create-checkout`, si el paquete tiene `total_rooms > 0`, se invoca `create_inventory_hold(p_package_id, p_user_id, p_units, p_hold_minutes=15)`. La RPC usa `SELECT ... FOR UPDATE` para bloquear la fila y evitar race conditions. Decrementa `available_rooms` inmediatamente y retorna un `hold_id`. El `hold_id` se transmite en los metadatos de la sesión de Stripe.

2. **Consumo (`consume_inventory_hold`):** Al recibir `checkout.session.completed` en `stripe-webhook`, se invoca `consume_inventory_hold(p_hold_id, p_stripe_session_id)`. Marca el hold como `consumed`. El inventario ya fue decrementado en el paso 1, por lo que no se requiere acción adicional.

3. **Liberación (`release_inventory_hold`):** Si el usuario abandona el checkout o la sesión expira, el hold se libera automáticamente. Restaura `available_rooms` y registra el cambio en `inventory_audit_log`.

4. **Limpieza automática:** Cron job `cleanup-expired-holds` se ejecuta cada minuto y libera todos los holds con `status = 'active'` y `expires_at <= now()`.

**RLS:** Usuarios solo ven sus propios holds. SuperAdmin tiene visibilidad total.

### **8.5 Auditoría de Inventario y Cumplimiento (Fase 3)**

Toda modificación de inventario —ya sea por venta en plataforma, venta externa, ajuste manual o sincronización— queda registrada de forma inmutable:

#### **Tabla: inventory_audit_log**

```
CREATE TABLE inventory_audit_log (
    audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES travel_packages(package_id) ON DELETE CASCADE,
    pool_id UUID REFERENCES inventory_pools(pool_id) ON DELETE SET NULL,
    change_type VARCHAR(50) NOT NULL CHECK (
        change_type IN ('booking', 'external_sale', 'manual_adjustment', 'sync', 'dispute_reversal')
    ),
    rooms_before INTEGER NOT NULL,
    rooms_after INTEGER NOT NULL,
    changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);
```

**Tipos de cambio registrados:**

| Tipo | Origen | Disparador |
|:---|:---|:---|
| `booking` | Venta en plataforma | `stripe-webhook` → `decrement_available_rooms` / `consume_inventory_hold` |
| `external_sale` | Venta externa reportada | `sync-inventory?action=external_sale` → `register_external_sale` |
| `manual_adjustment` | Hold creado/liberado | `create_inventory_hold` / `release_inventory_hold` |
| `sync` | Sincronización externa (PMS) | `sync-inventory?action=sync` → `sync_inventory_external` |
| `dispute_reversal` | Disputa bancaria | `stripe-webhook` (charge.dispute.created) → `increment_available_rooms` |

**RLS:** Agencias solo ven auditoría de paquetes de su tenant. SuperAdmin tiene visibilidad total.

### **8.6 Automatización y Ciclo de Vida del Inventario**

La plataforma ejecuta 4 cron jobs y 1 trigger para mantener la integridad del inventario sin intervención manual:

#### **Cron Jobs (pg_cron)**

| Job | Frecuencia | Función | Descripción |
|:---|:---|:---|:---|
| `auto-conclude-exhausted` | Diario 01:00 UTC | `auto_conclude_exhausted_packages()` | Paquetes `published` con `total_rooms > 0` y `available_rooms <= 0` → `concluded` |
| `evaluate-overbooking-suspension` | Diario 02:00 UTC | `evaluate_overbooking_suspension()` | Agencias con `overbooking_incidents >= 3` → `Suspendido por Fraude`. Sus paquetes `published` pasan a `draft`. |
| `notify-low-inventory` | Diario 08:00 UTC | `notify_low_inventory()` | Notifica al `owner_user_id` de la agencia cuando un paquete tiene ≤ 5 habitaciones disponibles. Inserta en `notifications`. |
| `cleanup-expired-holds` | Cada minuto | `cleanup_expired_holds()` | Libera todos los holds activos cuyo `expires_at` ya pasó, restaurando el inventario. |

#### **Trigger: enforce_inventory_first**

```
BEFORE UPDATE ON travel_packages
FOR EACH ROW
WHEN (NEW.publication_status = 'published')
EXECUTE FUNCTION enforce_inventory_first()
```

Rechaza la publicación si `total_rooms > 0 AND available_rooms <= 0` con código de error `CK002`.

#### **Validaciones en Edge Functions**

| Edge Function | Validación | Error |
|:---|:---|:---|
| `create-checkout` | `total_rooms > 0 AND available_rooms <= 0` | "Paquete agotado" (400) |
| `create-checkout` | `create_inventory_hold` falla por insuficiencia | "Error reservando inventario" (400) |
| `create-lead` | `total_rooms > 0 AND available_rooms <= 0` | "Este paquete ya no tiene disponibilidad" (400) |
| `stripe-webhook` | Pago exitoso + `hold_id` en metadata | Consume hold vía `consume_inventory_hold` |
| `stripe-webhook` | Pago exitoso sin `hold_id` | Decrementa vía `decrement_available_rooms` (retrocompatible) |
| `stripe-webhook` | Disputa + `package_id` en metadata | Incrementa vía `increment_available_rooms` + registra auditoría |

#### **Impacto en Métricas de Conversión**

La función `evaluate_conversion_rates` (ejecutada mensualmente) ahora incluye las ventas externas registradas en `external_sales_log` dentro del cómputo de `conversion_window_sales`. Esto corrige la distorsión que ocurría cuando una agencia cerraba leads en plataforma pero concretaba la venta externamente, resultando en una tasa de conversión falsamente baja y la pérdida de la tasa preferencial.

**Fórmula actualizada:**

```
ventas_totales = ventas_plataforma (transactions_orders) + ventas_externas (external_sales_log)
conversion_rate = (ventas_totales / leads_plataforma) × 100
```

### **8.7 Tabla Resumen de Nuevas Tablas y RPCs**

| Tabla / RPC | Fase | Propósito |
|:---|:---|:---|
| `travel_packages.total_rooms` / `available_rooms` | 1 | Control de inventario por paquete |
| `external_sales_log` | 2 | Registro de ventas fuera de plataforma |
| `agencies_tenants.overbooking_incidents` | 2 | Contador para suspensión por fraude |
| `decrement_available_rooms(package_id)` | 1-2 | Decrementar inventario en venta |
| `increment_available_rooms(package_id)` | 2 | Restaurar inventario en disputa |
| `register_external_sale(...)` | 2 | Registrar venta externa + decrementar |
| `auto_conclude_exhausted_packages()` | 2 | Auto-concluir paquetes agotados |
| `notify_low_inventory()` | 2 | Alertar inventario bajo (≤ 5) |
| `evaluate_overbooking_suspension()` | 2 | Suspender agencias con ≥ 3 incidentes |
| `inventory_pools` / `package_inventory_link` | 3 | Pools de inventario compartido |
| `inventory_audit_log` | 3 | Trazabilidad inmutable de cambios |
| `sync_inventory_external(pkg, total, avail, src)` | 3 | Sincronización desde PMS externo |
| `inventory_holds` | 4 | Reservas temporales anti race-condition |
| `create_inventory_hold(...)` | 4 | Crear hold con SELECT FOR UPDATE |
| `consume_inventory_hold(hold_id, session)` | 4 | Consumir hold tras pago exitoso |
| `release_inventory_hold(hold_id)` | 4 | Liberar hold (timeout/cancelación) |
| `cleanup_expired_holds()` | 4 | Limpiar holds expirados cada minuto |
| `enforce_inventory_first` (trigger) | 4 | Bloquear publicación sin inventario |

### **8.8 Diagrama de Flujo: Compra con Control de Inventario**

```
Viajero inicia checkout
       │
       ▼
create-checkout: ¿total_rooms > 0?
       │                │
      SÍ               NO
       │                │
       ▼                ▼
¿available_rooms > 0?   Continuar sin hold
       │                │
      SÍ               NO
       │                │
       ▼                ▼
create_inventory_hold  Error: "Paquete agotado"
(lock fila, decrementa)
       │
       ▼
Crear sesión Stripe
(metadata incluye hold_id)
       │
       ├──► Usuario paga ──► stripe-webhook: consume_inventory_hold
       │
       └──► Timeout/Abandono ──► cleanup_expired_holds (cron 1min)
                                  ──► release_inventory_hold
                                      (restaura available_rooms)
```

### **8.9 Consideraciones de Seguridad**

- **RLS mínimo privilegio:** Cada tabla nueva (`external_sales_log`, `inventory_pools`, `package_inventory_link`, `inventory_audit_log`, `inventory_holds`) tiene políticas RLS que restringen el acceso al tenant propietario. Solo SuperAdmin tiene visibilidad transversal.
- **SECURITY DEFINER:** Todas las RPCs de inventario operan con `SECURITY DEFINER` para garantizar atomicidad y evitar manipulación directa de las tablas por usuarios no privilegiados.
- **SELECT FOR UPDATE:** `create_inventory_hold` utiliza bloqueo de fila a nivel PostgreSQL para eliminar race conditions durante el checkout concurrente.
- **Auditoría inmutable:** `inventory_audit_log` es append-only desde la perspectiva del usuario (solo INSERT por triggers/RPCs, sin UPDATE/DELETE desde la capa de aplicación).
- **Validación de ownership:** El endpoint `sync-inventory` verifica que el `package_id` pertenezca al `tenant_id` del usuario autenticado antes de ejecutar cualquier operación.
- **Sin secretos hardcodeados:** Las edge functions acceden a `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y `STRIPE_SECRET_KEY` exclusivamente mediante `Deno.env.get()`.
