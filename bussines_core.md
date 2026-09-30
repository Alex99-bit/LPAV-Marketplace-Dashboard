# Core del negocio

## 1. Resumen ejecutivo

Avimo es una plataforma digital para la comercialización de viajes que conecta a viajeros con agencias de viajes verificadas. El negocio combina dos productos en una misma plataforma:

1. **Marketplace B2C:** permite a los viajeros descubrir paquetes turísticos, contactar agencias, guardar opciones, comprar y dar seguimiento a sus órdenes.
2. **SaaS B2B para agencias:** proporciona a cada agencia un espacio de trabajo aislado con catálogo, CRM, chat, gestión de equipo, pagos, finanzas, inventario y analítica.

El modelo de negocio de Avimo obtiene ingresos principalmente de:

- Comisiones sobre las ventas de paquetes realizadas dentro de la plataforma.
- Suscripciones mensuales de los planes Intermedio y Premium.
- Suscripción de continuidad para agencias Fundador después de su primer año.
- Servicios operativos y financieros asociados a la administración de transacciones y facturación.

La plataforma está orientada inicialmente al mercado mexicano. Por ello incorpora validación de RFC, requisitos fiscales, emisión de CFDI, cobros en MXN y reglas de operación compatibles con agencias establecidas en México.

## 2. Problema que resuelve

### Para los viajeros

Los viajeros suelen encontrar paquetes dispersos, poca trazabilidad de las conversaciones, dificultad para comparar opciones y poca claridad sobre el estado de una compra o pago parcial.

Avimo concentra en un solo lugar:

- Descubrimiento de paquetes turísticos.
- Filtros por destino, región, ciudad de salida, precio y preferencias.
- Comunicación trazable con la agencia.
- Solicitud de información y generación de leads.
- Checkout y pagos procesados por la plataforma.
- Seguimiento del estado de la orden.
- Guardado de paquetes y recomendaciones personalizadas.

### Para las agencias

Las agencias necesitan atraer demanda, administrar leads, coordinar vendedores, publicar inventario, cobrar de forma segura y controlar sus finanzas sin depender de múltiples sistemas desconectados.

Avimo les proporciona:

- Presencia comercial en un marketplace especializado.
- Catálogo de paquetes en formato flyer.
- CRM integrado.
- Asignación de leads a agentes.
- Chat interno con viajeros.
- Herramientas de IA para cualificación y seguimiento.
- Pagos mediante Stripe Connect.
- Control de inventario y prevención de sobreventa.
- Panel financiero, fiscal y de conversión.

## 3. Propuesta de valor

### Propuesta para viajeros

Avimo facilita encontrar y contratar viajes con agencias verificadas, manteniendo toda la interacción, el pago y el seguimiento dentro de una experiencia única y segura.

### Propuesta para agencias

Avimo convierte la operación digital de una agencia en un flujo integrado de adquisición, venta, cobranza, servicio al cliente y control financiero.

### Diferenciadores principales

- Marketplace especializado en agencias de viajes.
- CRM nativo y multi-tenant, sin depender de un CRM externo.
- Chat interno trazable entre agencia y viajero.
- Cualificación de leads asistida por IA en planes elegibles.
- Comisiones vinculadas al plan y al desempeño comercial.
- Pagos divididos mediante Stripe Connect.
- Control de inventario para ventas en plataforma y ventas externas.
- Requisitos de verificación orientados a agencias formales.
- Información financiera y fiscal integrada.

## 4. Modelo operativo

Avimo opera como una plataforma intermediaria tecnológica y comercial:

1. La agencia se registra, elige un plan y entrega su información corporativa.
2. Avimo valida la identidad, situación fiscal, trayectoria y presencia física de la agencia.
3. La agencia aprobada publica paquetes turísticos en el marketplace.
4. El viajero descubre un paquete y puede iniciar una conversación o crear una intención de compra.
5. La interacción genera un lead dentro del CRM de la agencia.
6. La agencia atiende al viajero exclusivamente mediante el chat interno.
7. El viajero paga mediante el checkout de la plataforma.
8. Stripe confirma el pago y Avimo registra la orden, la comisión y la distribución correspondiente.
9. La agencia gestiona la operación del viaje, el inventario y cualquier saldo pendiente.
10. Avimo conserva la trazabilidad de la relación comercial, las transacciones y los eventos relevantes.

Avimo no habilita a las agencias para trasladar la comunicación comercial fuera de la plataforma. Email y WhatsApp se reservan para campañas propias de Avimo, no para la gestión de leads de las agencias.

## 5. Actores del negocio

### 5.1 Viajero

Usuario final que consulta, guarda, solicita información o compra paquetes.

Puede:

- Navegar como invitado.
- Filtrar y consultar paquetes.
- Guardar paquetes.
- Agregar productos al carrito.
- Registrarse o iniciar sesión.
- Contactar a una agencia por chat.
- Comprar y consultar sus órdenes.
- Recibir notificaciones transaccionales.

Debe autenticarse para completar el checkout, reservar o utilizar funciones que requieran identidad, como ciertas herramientas de IA.

### 5.2 Agencia

Tenant empresarial que publica paquetes, recibe leads, atiende viajeros, cobra ventas y administra su operación.

Cada agencia tiene:

- Un identificador de tenant.
- Un administrador propietario.
- Usuarios y roles internos.
- Catálogo independiente.
- CRM y conversaciones propias.
- Cuenta de Stripe Connect.
- Información fiscal y contractual.
- Configuración de plan y comisión.

### 5.3 Administrador de agencia

Responsable de la configuración y operación del tenant. Gestiona el catálogo, miembros, roles, conversaciones, leads, finanzas y configuración de pagos, según los permisos de su plan.

### 5.4 Colaborador o agente

Usuario interno de una agencia que puede atender leads, actualizar estados, agregar actividades y participar en conversaciones de acuerdo con sus permisos RBAC.

### 5.5 SuperAdmin

Administra la plataforma completa. Puede:

- Ver y revisar agencias.
- Aprobar o rechazar agencias y solicitudes Fundador.
- Moderar paquetes.
- Consultar información financiera agregada.
- Gestionar configuración global.
- Revisar reportes, fraude e incidentes.
- Controlar la disponibilidad de solicitudes del Plan Fundador.

## 6. Modelo de agencias y planes

La plataforma tiene cuatro planes. El plan determina el precio mensual, la comisión, los límites operativos y las capacidades comerciales.

| Plan | Mensualidad | Comisión base | Comisión preferencial | Características principales |
|---|---:|---:|---:|---|
| Básico | $0 MXN | 20% | No aplica | 50 flyers, un administrador, CRM básico |
| Intermedio | $1,799 MXN | 18% | 17% con conversión de al menos 5% | 50 flyers, un rol personalizado, 3 a 5 colaboradores, IA y referidos |
| Premium | $2,999 MXN | 15% | 12% con conversión de al menos 8% | 50 flyers, tres roles personalizados, colaboradores ilimitados, apartados y soporte 24/7 |
| Fundador | $0 MXN durante el primer año | 7.5% | No aplica | Beneficios equivalentes a Premium, sujeto a aprobación y limitado a 10 agencias |

Todos los planes tienen un límite operativo de 50 flyers activos. Los límites de usuarios y roles dependen del plan.

### 6.1 Registro y activación de una agencia

La agencia debe proporcionar, como mínimo:

- Nombre comercial.
- RFC válido.
- Domicilio físico.
- Constancia de Situación Fiscal vigente en PDF.
- Certificación turística oficial.
- Logotipo.
- Aceptación de términos, privacidad y acuerdo de comisión.
- Contrato firmado con Avimo.

Además, debe demostrar:

- Al menos tres años de operación comprobable.
- Existencia de una oficina, sucursal o local físico verificable.
- RFC localizado y válido ante el SAT mediante Facturama.

La agencia comienza en estado **En Revisión**. Su perfil no debe considerarse activo en el marketplace hasta completar la verificación requerida.

### 6.2 Plan Fundador

El Plan Fundador es un programa limitado de adquisición temprana de agencias.

Reglas:

- Tiene un máximo de 10 agencias aprobadas.
- La agencia puede solicitarlo, pero no se activa automáticamente.
- Mientras espera aprobación, opera temporalmente como Básico.
- La aprobación la realiza manualmente un SuperAdmin.
- Al aprobarse, la comisión cambia a 7.5% y se habilitan sus beneficios.
- La vigencia inicial es de un año calendario desde su activación.
- Una vez ocupadas las 10 plazas, no se abren nuevas plazas ni lista de espera.

Al finalizar el primer año, la agencia recibe aviso con 30 días de anticipación y puede:

- Contratar Continuidad Fundador por $2,999 MXN mensuales, conservando la comisión de 7.5%.
- Migrar a Premium estándar, con comisión base de 15% y posibilidad de 12% por conversión.
- Migrar a Intermedio o Básico, perdiendo de forma irreversible los beneficios Fundador.

Si no selecciona una opción, se migra automáticamente a Continuidad Fundador. Si el cobro falla, aplica el periodo de gracia correspondiente.

### 6.3 Fallos de suscripción B2B

Esta regla aplica a Intermedio, Premium y Continuidad Fundador.

- Stripe Billing ejecuta hasta tres reintentos.
- La agencia recibe notificaciones de cada fallo.
- Existe un periodo de gracia de 15 días desde el primer fallo.
- Durante la gracia, los paquetes publicados siguen visibles.
- Las conversaciones existentes y los pagos en curso permanecen activos.
- La agencia no puede publicar nuevos paquetes ni incorporar nuevos leads.
- Si no se liquida el adeudo, el tenant pasa a **Suspendido por Pago** y se retira su visibilidad pública.

## 7. Marketplace y catálogo

El marketplace es la superficie pública de adquisición de demanda.

### 7.1 Paquete turístico

Un paquete pertenece a una agencia y contiene, entre otros datos:

- Título.
- Región o destino.
- Precio base.
- Moneda: MXN, USD o EUR.
- Flyer e imagen thumbnail.
- Ciudad de salida.
- Fecha de salida.
- Descripción.
- Indicador de coordinador.
- Inventario total y disponible.
- Estado de publicación.

### 7.2 Estados de publicación

- **Borrador:** aún no se muestra públicamente.
- **En revisión:** pendiente de moderación o validación.
- **Publicado:** visible y disponible para interacción o compra.
- **Concluido:** el viaje o paquete terminó.
- **Archivado:** retirado del catálogo activo.

### 7.3 Descubrimiento

El viajero puede buscar por texto y filtrar por:

- Región.
- Destino.
- Ciudad de salida.
- Rango de precio.
- Preferencias e intereses.

La experiencia incluye recomendaciones basadas en intereses y presupuesto. También puede generar itinerarios con IA para paquetes elegibles.

### 7.4 Moderación

Los paquetes pueden ser reportados por usuarios y revisados por administradores. El contenido puede ser aprobado, rechazado, archivado o sancionado según la revisión.

Avimo controla la publicación para proteger la calidad del catálogo y la confianza del viajero.

## 8. Embudo comercial del viajero

El embudo principal es:

1. **Descubrimiento:** el viajero llega al marketplace.
2. **Interés:** consulta un flyer, usa filtros o guarda un paquete.
3. **Contacto:** solicita información o abre una conversación.
4. **Lead:** se crea un registro asociado a agencia, paquete y viajero.
5. **Cualificación:** la agencia o la IA identifica fechas, presupuesto, número de viajeros y necesidades.
6. **Propuesta:** la agencia presenta una opción comercial.
7. **Compra:** el viajero paga mediante Stripe.
8. **Confirmación:** se registra la orden y se actualiza el estado del pago.
9. **Postventa:** la agencia continúa gestionando la operación y los saldos.

El objetivo de negocio es maximizar la conversión de leads generados en plataforma a ventas confirmadas, sin perder trazabilidad.

## 9. CRM integrado

El CRM es nativo de la plataforma y está aislado por tenant mediante políticas RLS.

### 9.1 Lead

Un lead representa a un viajero que mostró interés en un paquete de una agencia.

El lead relaciona:

- Agencia propietaria.
- Viajero.
- Paquete.
- Conversación.
- Agente asignado.
- Estado comercial.
- Prioridad.
- Datos de viaje.
- Presupuesto.
- Notas y actividades.

### 9.2 Pipeline

Los estados son:

1. `new`: nuevo.
2. `contacted`: contactado.
3. `qualified`: cualificado.
4. `proposal_sent`: propuesta enviada.
5. `won`: venta ganada.
6. `lost`: venta perdida.

Cada cambio importante se registra en el timeline de actividades.

### 9.3 Asignación

Los leads pueden asignarse mediante round-robin entre agentes disponibles. El administrador también puede reasignarlos manualmente de acuerdo con permisos y operación del tenant.

### 9.4 IA de cualificación

Los planes Intermedio, Premium y Fundador pueden utilizar IA para extraer del chat información como:

- Presupuesto estimado.
- Moneda.
- Fechas preferidas.
- Número de viajeros.
- Tipo de viaje.
- Ciudad de origen.
- Aerolínea preferida.
- Tipo de alojamiento.
- Requerimientos especiales.

El Plan Básico conserva un flujo tradicional sin pre-cualificación IA. La IA está sujeta a límites de uso, rate limiting y controles de costo.

## 10. Comunicación y chat

El chat interno es el canal oficial entre viajeros y agencias.

Características:

- Mensajería persistente.
- Actualización en tiempo real.
- Asociación con una conversación y, cuando aplica, un lead.
- Notificaciones de mensajes nuevos.
- Trazabilidad para calidad y soporte.
- Solicitud de pago desde la conversación.

### 10.1 Control de contacto externo

El sistema detecta y bloquea intentos de compartir datos que permitan evadir la plataforma, incluyendo:

- URLs.
- Teléfonos.
- Correos.
- CLABE y datos bancarios.
- Redes sociales.
- Instrucciones para continuar la operación fuera de Avimo.

Los mensajes transaccionales de pago son excepciones controladas y no deben ser censurados como mensajes de texto ordinarios.

## 11. Compras, órdenes y pagos

### 11.1 Carrito

El viajero puede agregar paquetes al carrito como invitado. El carrito se persiste localmente y, después de autenticarse, se fusiona con la información persistida del usuario.

### 11.2 Checkout

Para proceder al pago, el viajero debe autenticarse. El checkout valida:

- Identidad del usuario.
- Paquete y precio.
- Disponibilidad de inventario.
- Moneda.
- Importe total.
- Reglas de pago.

### 11.3 Orden

La orden pertenece a un viajero y una agencia. Registra:

- Importe total.
- Subtotal.
- IVA del paquete cuando corresponda.
- Comisión de plataforma.
- Saldo pendiente.
- Moneda.
- Sesión de Stripe.
- Estado del pago.

Estados principales:

- `pending`: pendiente.
- `partial_paid`: pago parcial.
- `paid`: liquidada.
- `moroso`: con saldo vencido.
- `cancelled`: cancelada.

### 11.4 Pagos diferidos

La plataforma permite esquemas de anticipo y pagos posteriores bajo las reglas configuradas. El anticipo mínimo definido es de 20% y el plazo diferido máximo es de cuatro meses.

Una orden parcialmente pagada conserva el saldo pendiente y la próxima fecha de pago. Los recordatorios de pago se gestionan mediante notificaciones automatizadas.

### 11.5 Pagos desde chat

Una agencia puede generar una solicitud de pago desde una conversación cuando existe una orden elegible. El sistema:

1. Valida que el usuario sea un rol autorizado de la agencia.
2. Valida la orden y el saldo.
3. Calcula la comisión aplicable.
4. Crea una sesión de Checkout de Stripe.
5. Inserta un mensaje `payment_request` en el chat.
6. Espera la confirmación del webhook.
7. Actualiza el saldo de la orden.
8. Inserta un mensaje `payment_confirmed`.
9. Registra el movimiento fiscal y envía notificaciones.

El webhook debe ser idempotente para evitar duplicar pagos, registros fiscales o mensajes.

## 12. Comisiones y monetización

### 12.1 Comisión sobre ventas

La comisión se determina por el plan de la agencia y la tasa vigente en el momento de la venta.

La fórmula conceptual es:

```text
Comisión de plataforma = Base comisionable x Tasa de comisión
Neto para la agencia = Base comisionable - Comisión de plataforma - cargos aplicables
```

La tasa se conserva en los registros financieros para permitir auditoría histórica aunque la agencia cambie de plan después.

### 12.2 Tasas preferenciales por conversión

La conversión se calcula sobre ventanas móviles de tres meses calendario:

```text
Conversión = Ventas efectivas / Leads generados x 100
```

Una venta efectiva es aquella cuyo pago fue confirmado por Stripe. Las ventas externas pueden sumarse al numerador si corresponden a leads originados en la plataforma y fueron registradas en el módulo de conciliación.

Reglas:

- Intermedio: baja de 18% a 17% al alcanzar al menos 5% de conversión.
- Premium: baja de 15% a 12% al alcanzar al menos 8% de conversión.
- Básico y Fundador no participan en este mecanismo.
- La evaluación se realiza el primer día de cada mes.
- Si se cae por debajo del umbral durante dos meses consecutivos, se pierde la tasa preferencial al mes siguiente.

## 13. Stripe y distribución de fondos

Avimo utiliza Stripe en dos contextos:

1. **Stripe Billing:** cobro recurrente de las suscripciones de agencia.
2. **Stripe Connect:** cobro de ventas y distribución de fondos entre la plataforma y la agencia.

La cuenta conectada de la agencia es necesaria para operar financieramente. El onboarding valida información de la agencia y permite recibir transferencias.

Las tarifas de Stripe se consideran dentro de la lógica financiera definida por la plataforma. Las reglas de absorción deben ser transparentes para la agencia y quedar reflejadas en los registros de cada transacción.

## 14. Fiscalidad y finanzas

### 14.1 Responsabilidad fiscal

Avimo debe distinguir entre:

- Ingreso bruto de la venta.
- Comisión de plataforma.
- IVA aplicable.
- Tarifas de procesamiento.
- Neto transferido a la agencia.

La agencia es responsable de sus obligaciones fiscales como prestadora del servicio turístico. Avimo conserva la trazabilidad necesaria para registrar comisiones y generar la documentación fiscal correspondiente.

### 14.2 CFDI

Los registros de ingresos fiscales pueden incluir:

- Fecha.
- Orden relacionada.
- Concepto.
- Subtotal.
- IVA.
- Total.
- Tasa de comisión aplicada.
- Estado del CFDI.
- UUID.
- URLs de XML y PDF.

El timbrado de CFDI puede ejecutarse bajo demanda para registros pendientes, mediante integración con Facturama.

### 14.3 Finanzas de agencia

El panel financiero de agencia tiene cinco áreas:

- **Resumen:** ingresos, comisiones, Stripe Connect y ventas externas.
- **Ingresos fiscales:** historial y timbrado de CFDI.
- **Gastos:** captura de infraestructura, nómina, renta, marketing, software y otros.
- **P&L:** ingresos brutos, comisiones pagadas, gastos operativos y utilidad neta.
- **Conversión:** leads, ventas, tasa actual y progreso hacia la tasa preferencial.

### 14.4 Finanzas de plataforma

El SuperAdmin puede operar registros de ingresos, egresos y periodos fiscales. El cierre de un periodo asigna los movimientos correspondientes y evita cambios no controlados sobre periodos cerrados.

## 15. Inventario y prevención de sobreventa

Cada paquete puede administrar habitaciones, lugares o unidades disponibles.

El sistema soporta:

- Inventario total y disponible por paquete.
- Pools de inventario compartido entre varios paquetes.
- Holds temporales durante el checkout.
- Registro de cada cambio de inventario.
- Ventas externas reportadas por la agencia.
- Alertas de inventario bajo.
- Prevención de condiciones de carrera durante compras simultáneas.

### 15.1 Venta externa

Una agencia puede registrar una venta realizada fuera de Avimo cuando consume inventario de un paquete o corresponde a un lead originado en la plataforma.

La venta externa sirve para:

- Conciliar disponibilidad.
- Evitar sobreventa.
- Mejorar la medición de conversión.
- Mantener una trazabilidad operativa.

Las ventas externas no sustituyen el checkout de Avimo ni permiten evadir la comisión cuando las reglas de conciliación determinan que corresponden a un lead de la plataforma.

## 16. Seguridad y aislamiento multi-tenant

El aislamiento de datos es una regla central del negocio, no solo una decisión técnica.

Cada consulta y operación debe respetar el tenant autenticado. Las políticas RLS protegen, entre otros, los siguientes datos:

- Agencias.
- Usuarios y roles.
- Paquetes.
- Leads.
- Conversaciones.
- Órdenes.
- Registros fiscales.
- Gastos.
- Ventas externas.
- Inventario.

Principios obligatorios:

- Una agencia no puede consultar datos de otra.
- Los usuarios solo acceden según su rol y tenant.
- Las funciones privilegiadas deben validar identidad y autorización.
- Las operaciones de pago deben ser idempotentes.
- Los archivos fiscales deben permanecer en buckets privados con URLs firmadas.
- Las credenciales sensibles nunca deben exponerse al cliente.
- Las entradas de usuario deben validarse en cliente y servidor.

## 17. Notificaciones y eventos

Las notificaciones mantienen informados a viajeros, agencias y administradores sobre eventos relevantes.

Eventos principales:

- Nuevo mensaje.
- Pago recibido.
- Cambio de estado de orden.
- Paquete reportado.
- Paquete aprobado o bloqueado.
- Solicitud de pago.
- Confirmación de pago.
- Cambio de comisión.
- Fallo de suscripción.
- Inventario bajo.
- Vencimiento de pago.

Avimo puede usar email, WhatsApp y push para campañas propias o alertas transaccionales. Las agencias no utilizan esos canales para sustituir el chat interno.

## 18. Métricas clave del negocio

### Marketplace

- Usuarios registrados.
- Visitantes recurrentes.
- Vistas por paquete.
- Paquetes guardados.
- Carritos creados.
- Tasa de checkout.
- Ventas confirmadas.
- Valor bruto de transacciones.

### Agencias

- Agencias registradas.
- Agencias verificadas.
- Agencias activas.
- Distribución por plan.
- Churn de suscripción.
- Ingresos recurrentes mensuales.
- Comisión promedio por venta.
- Inventario publicado.

### Comercial

- Leads generados.
- Tiempo hasta primer contacto.
- Leads cualificados.
- Propuestas enviadas.
- Conversión a venta.
- Ventas ganadas y perdidas.
- Desempeño por agencia y agente.

### Operación

- Pagos pendientes.
- Pagos parciales.
- Órdenes morosas.
- Contracargos y disputas.
- Incidentes de sobreventa.
- Inventario bajo.
- Tiempo de resolución de reportes.

## 19. Reglas de negocio no negociables

1. Las agencias operan dentro de un tenant aislado.
2. Solo agencias verificadas pueden estar activas en el marketplace.
3. El Plan Fundador requiere aprobación manual y está limitado a 10 plazas.
4. La comunicación comercial agencia-viajero ocurre dentro del chat interno.
5. Las ventas confirmadas deben tener trazabilidad de orden, agencia, comisión y pago.
6. La comisión aplicable debe conservarse históricamente en los registros financieros.
7. Los pagos confirmados por webhook se procesan de forma idempotente.
8. El inventario debe reservarse y descontarse sin permitir condiciones de carrera.
9. Una agencia suspendida por pago no puede publicar nuevos paquetes ni recibir nuevos leads.
10. Los accesos financieros y administrativos dependen del rol y del tenant.
11. Los documentos fiscales y contractuales se almacenan de forma privada.
12. La IA está limitada por plan, cuota, rate limiting y controles de costo.
13. Las ventas externas deben registrarse para mantener inventario y métricas consistentes.
14. El sistema de puntos de lealtad está temporalmente desactivado, aunque sus datos históricos y tablas se conservan para una futura reactivación.

## 20. Estado actual y alcance temporal

Según el estado documentado del proyecto, el sistema de puntos Avimo Puntos está temporalmente inactivo en frontend, backend y aplicaciones móviles. No debe considerarse parte del flujo comercial operativo actual.

El núcleo actualmente activo se concentra en:

- Marketplace de paquetes.
- Registro y gestión de agencias.
- Planes y comisiones.
- CRM y leads.
- Chat interno.
- Checkout y pagos.
- Stripe Connect y Billing.
- Finanzas y CFDI.
- Inventario y conciliación.
- Notificaciones, moderación y seguridad multi-tenant.

## 21. Resumen del ciclo de valor

```text
Agencia verificada
        |
        v
Publica paquete e inventario
        |
        v
Viajero descubre y muestra interés
        |
        v
Lead en CRM + conversación interna
        |
        v
Cualificación y propuesta
        |
        v
Pago confirmado por Stripe
        |
        v
Orden + comisión + transferencia + registro fiscal
        |
        v
Gestión de inventario y postventa
        |
        v
Medición de conversión y optimización del negocio
```

El core del negocio de Avimo es, por tanto, un circuito cerrado de **demanda turística, operación comercial, pago seguro y control empresarial**, donde cada interacción relevante queda asociada a un viajero, una agencia, un paquete y una transacción trazable.

## 22. Modelo económico actualizado de intermediación

Avimo actúa como intermediario entre el viajero y la agencia. La agencia es responsable de prestar y facturar el servicio turístico; Avimo proporciona el marketplace, el procesamiento operativo, la trazabilidad y la liquidación mediante Stripe Connect.

### 22.1 Componentes del cobro

El checkout muestra el total de forma transparente y separa sus componentes:

```text
Precio del paquete turístico
+ Tarifa de procesamiento del pago
+ IVA y conceptos fiscales aplicables
= Total cobrado al viajero
```

La tarifa de procesamiento se calcula para cubrir el costo de Stripe más el IVA aplicable. No es la comisión comercial de Avimo. La comisión de Avimo se descuenta de la liquidación de la agencia.

El sistema debe conciliar la tarifa estimada del checkout contra el costo real de Stripe, porque el cargo de procesamiento también forma parte del importe que procesa Stripe.

### 22.2 Anticipo global

El anticipo inicial estándar es del **20% del precio total del paquete**. Es una regla global de Avimo y no puede ser modificada por cada agencia desde el checkout.

El anticipo confirma la reserva, reduce el riesgo de apartar inventario sin compromiso y se imputa al precio total del viaje. No elimina derechos legales del viajero.

### 22.3 Cancelaciones y penalizaciones

La política pública de Avimo aplica de forma uniforme y no puede sustituirse por una condición menos favorable no informada.

Reglas operativas:

- Dentro de los primeros cinco días hábiles posteriores a la contratación, puede proceder el reembolso sin penalización cuando el servicio no haya iniciado ni sido consumido, sujeto a la legislación aplicable.
- Con 60 días o más de anticipación, se devuelve el importe pagado menos costos no recuperables comprobables e informados.
- Entre 30 y 59 días puede aplicarse hasta 25% de penalización operativa.
- Entre 15 y 29 días puede aplicarse hasta 50% de penalización operativa.
- Con menos de 15 días se devuelve únicamente el importe recuperable del proveedor final.
- No procede devolución por servicios ya iniciados, abandonados voluntariamente o no utilizados por causas imputables al viajero, salvo autorización del proveedor.
- Si la cancelación es imputable a la agencia, la agencia absorbe la comisión de Avimo, la tarifa de procesamiento no recuperable y los costos del reembolso.

La penalización nunca debe utilizarse para retener impuestos como margen de Avimo. Los ajustes fiscales deben realizarse mediante el CFDI que corresponda.

### 22.4 Protección financiera de Avimo

Para no trasladar el riesgo de la cancelación a Avimo, la plataforma puede mantener una reserva financiera por agencia, retener liquidaciones futuras, revertir transferencias de Stripe, registrar saldos negativos, compensar reembolsos contra nuevas ventas y suspender liquidaciones o catálogo cuando exista deuda vencida.

El viajero recibe el reembolso que corresponda; la recuperación económica se realiza contra la agencia conforme al contrato B2B.

### 22.5 Trazabilidad obligatoria

Cada orden debe guardar el precio total del paquete, anticipos y abonos, saldo pendiente, tarifa de procesamiento, IVA de la tarifa, comisión de Avimo, costo real de Stripe, versión de la política aceptada, motivo y fecha de cancelación, penalización, importe reembolsado e importe cargado a la agencia.

Los reembolsos se procesan de forma idempotente, regresan al medio de pago original cuando es posible y actualizan inventario, orden, contabilidad y notificaciones.
