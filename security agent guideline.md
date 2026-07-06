# Guía de Seguridad para Agentes de IA (OpenCode)

> Este documento instruye al agente para que tenga en cuenta la ciberseguridad de forma
> sistemática al desarrollar y desplegar proyectos, apoyándose en las skills de
> [Anthropic-Cybersecurity-Skills](https://github.com/mukul975/Anthropic-Cybersecurity-Skills)
> instaladas localmente.

## 1. Contexto del proyecto

Stack principal: Vue + Supabase (frontend en Vercel), con proyectos adicionales en
React, Laravel + Inertia.js, Node.js, y Unity/Unreal para desarrollos XR.
Los productos incluyen dashboards con roles y control de acceso (RBAC), copilotos con
integración a la API de Anthropic, y aplicaciones SaaS con datos de clientes.

Dado este perfil, la superficie de riesgo principal está en: autenticación/autorización,
seguridad de API, configuración de base de datos (RLS en Supabase), manejo de secretos,
dependencias de terceros (npm/composer) y configuración de despliegue (Vercel/Supabase CLI).

## 2. Skills instaladas

Ubicación (ajustar según versión de OpenCode):
- Nativa (`>= v1.0.190`): `skill/` en la raíz del proyecto, o `~/.config/opencode/skill/` global.
- Legacy / plugin: `.opencode/skills/` en el proyecto, o `~/.config/opencode/skills/` global.

Dominios curados desde Anthropic-Cybersecurity-Skills (no se carga el repositorio completo):

| Dominio | Motivo |
|---|---|
| `web-application-security` | XSS, inyección, CSRF, validación de inputs en Vue/React/Laravel |
| `api-security` | Autenticación de endpoints, rate limiting, JWT/OAuth |
| `cloud-security` | Configuración segura de Supabase/Vercel |
| `iam` | Diseño de RBAC (relevante para dashboards tipo Legal Tech) |
| `devsecops` / `supply-chain` | Auditoría de dependencias npm/composer, CI/CD |
| `cryptography` | Manejo correcto de secretos, hashing, tokens |

No se cargan dominios ofensivos/dual-use (red-team, exploitation, C2) porque no aplican
al flujo normal de desarrollo de producto.

## 3. Reglas para el agente

El agente **debe**:

1. **Antes de escribir código de autenticación, autorización, manejo de sesiones o RBAC**,
   consultar la skill correspondiente en `iam` o `web-application-security` y seguir su
   checklist de verificación antes de dar el código por terminado.
2. **Antes de crear o modificar un endpoint de API**, revisar la skill de `api-security`
   para validar: sanitización de inputs, límites de tasa, autenticación por token,
   exposición mínima de datos en las respuestas.
3. **Antes de escribir políticas de Supabase (RLS) o configuración de base de datos**,
   verificar que las políticas sigan el principio de mínimo privilegio y no dejen tablas
   con acceso público por defecto.
4. **Antes de hacer commit o desplegar (`vercel deploy`, `supabase db push`, etc.)**,
   comprobar que no haya:
   - claves de API, tokens o credenciales hardcodeadas en el código.
   - archivos `.env` incluidos en el control de versiones.
   - dependencias con vulnerabilidades conocidas (correr auditoría si está disponible).
5. **Al integrar la API de Anthropic u otro LLM en un proyecto**, aplicar las skills de
   seguridad para agentes de IA (prompt injection, exposición de herramientas, límites de
   permisos) si están disponibles en el set instalado.
6. **Al trabajar en proyectos Unity/Unreal (XR)**, considerar seguridad de almacenamiento
   local, protección de builds, y manejo seguro de credenciales si el proyecto se conecta
   a backends.
7. Si una tarea no tiene relación directa con seguridad, el agente no debe forzar el uso
   de las skills ni añadir advertencias innecesarias — la seguridad se aplica cuando el
   código toca datos, accesos o infraestructura.

## 4. Checklist rápido antes de dar una tarea por completada

- [ ] ¿Hay inputs de usuario sin validar/sanitizar?
- [ ] ¿Los endpoints exponen más datos de los necesarios?
- [ ] ¿Las políticas de acceso (RLS, RBAC) siguen mínimo privilegio?
- [ ] ¿Hay secretos o claves expuestas en código o logs?
- [ ] ¿Las dependencias nuevas tienen vulnerabilidades conocidas?
- [ ] ¿La configuración de despliegue (Vercel/Supabase) es segura por defecto?

## 5. Notas

- Las skills son guías estructuradas (playbooks), no herramientas mágicas: la calidad del
  resultado depende de que el agente las siga y de que la infraestructura real (logs,
  permisos, licencias) soporte lo que la skill recomienda.
- Repositorio de referencia: https://github.com/mukul975/Anthropic-Cybersecurity-Skills
  (proyecto comunitario, no afiliado a Anthropic PBC).