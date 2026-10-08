# LPAV Marketplace & Dashboard

Plataforma SaaS multi-tenant para agencias de viaje. El proyecto conecta a viajeros con agencias mediante un marketplace de paquetes turísticos y proporciona herramientas operativas para administrar ventas, clientes, contenido y finanzas desde un solo dashboard.

Este repositorio se publica exclusivamente como muestra de portafolio y demostración técnica.

## Descripción

LPAV Marketplace está diseñado para centralizar el ciclo completo de una operación turística:

- Marketplace de paquetes y perfiles públicos de agencias.
- Registro, autenticación y flujos diferenciados para viajeros, agencias y administradores.
- CRM integrado para leads, actividades, asignación de agentes y seguimiento comercial.
- Chat interno para la comunicación entre clientes y agencias.
- Gestión de flyers, catálogos, itinerarios, reseñas y contenido comercial.
- Paneles de analítica, ventas, logística y finanzas para agencias.
- Checkout y funcionalidades de marketplace orientadas a pagos y comisiones.
- Administración de planes, usuarios, roles y configuración multi-tenant.
- Páginas legales, consentimiento de cookies y validaciones de seguridad.
- Soporte de internacionalización mediante i18next.

## Arquitectura Y Tecnologías

| Área | Tecnología |
| --- | --- |
| Frontend | React 19, TypeScript, React Router |
| Build tool | Vite |
| Estilos | Tailwind CSS |
| Backend y datos | Supabase, PostgreSQL, Auth, Realtime y Storage |
| Pagos | Stripe y Stripe Connect |
| IA | Integración preparada para Gemini |
| Pruebas | Vitest, Testing Library y Playwright |
| PWA | Vite PWA |

La arquitectura contempla aislamiento de tenants, control de acceso basado en roles y políticas de seguridad a nivel de fila para proteger los datos de cada agencia.

## Módulos Principales

### Marketplace

Catálogo de paquetes turísticos con filtros, perfiles públicos de agencias, itinerarios, precios, reseñas y flujo de compra.

### Portal De Agencia

Dashboard para administrar el perfil comercial, flyers, paquetes, clientes, leads, ventas, logística, documentos, gastos e ingresos.

### CRM

Gestión de leads y actividades comerciales, filtros, métricas, asignación de agentes, calificación asistida y chat integrado.

### Administración

Panel de supervisión para agencias, usuarios, roles, planes, configuración de la plataforma y operaciones financieras.

### Seguridad Y Cumplimiento

El proyecto incluye pruebas enfocadas en aislamiento multi-tenant, autenticación, exposición de secretos, validación de entradas, CORS, rate limiting y protección de claves de API.

## Estado Del Proyecto

Proyecto personal en desarrollo, publicado con fines demostrativos y de portafolio. Algunas integraciones y funcionalidades pueden requerir servicios externos configurados en el entorno privado del proyecto.

El sistema de puntos de lealtad **Avimo Puntos** se encuentra temporalmente desactivado en la interfaz y las aplicaciones. Las estructuras relacionadas se conservan para una posible reactivación futura.

## Visualización

Este repositorio puede visualizarse públicamente en GitHub únicamente con fines demostrativos. No se autoriza descargar, clonar, copiar, ejecutar, modificar, redistribuir, crear forks ni utilizar el contenido en otros proyectos.

Para conocer las condiciones completas, consulta el archivo [`LICENSE`](./LICENSE).

## Autor

**Carlos Alejandro Coronado Obregón**

Contacto: [alejandro.co.dev@gmail.com](mailto:alejandro.co.dev@gmail.com)

## Derechos Reservados

Copyright (c) 2026 Carlos Alejandro Coronado Obregón. Todos los derechos reservados.
