from crewai import Agent, Crew, Task

from tools import ShellTool

LLM_MODEL = "ollama/qwen2.5-coder:7b"
PROJECT_DIR = "/Users/alexc/Documents/GitHub/LPAV-Marketplace-Dashboard"
SUPABASE_REF = "qmcpaqbxbmkhxjezhlch"

shell = ShellTool()

# ── Agente 1: Ciberseguridad ──────────────────────────────────────────────
security_agent = Agent(
    role="Auditor de Ciberseguridad",
    goal=(
        "Auditar la seguridad del proyecto antes de cada despliegue: "
        "detectar secrets expuestos, validar .gitignore, revisar políticas RLS "
        "en migraciones de Supabase, y reportar vulnerabilidades."
    ),
    backstory=(
        "Eres un experto en ciberseguridad especializado en aplicaciones web. "
        "Escaneas archivos de configuración, variables de entorno y políticas "
        "de acceso (RLS) para encontrar riesgos antes de que lleguen a producción."
    ),
    tools=[shell],
    llm=LLM_MODEL,
    verbose=True,
    allow_delegation=False,
)

# ── Agente 2: Backend DevOps ───────────────────────────────────────────────
backend_agent = Agent(
    role="Backend DevOps — Supabase",
    goal=(
        "Desplegar el backend completo en Supabase: vincular el proyecto remoto, "
        "ejecutar migraciones SQL, desplegar edge functions y verificar que "
        "todo esté operativo."
    ),
    backstory=(
        "Eres un ingeniero DevOps especializado en Supabase. Conoces la CLI "
        "a profundidad: link, db push, functions deploy, secrets set. "
        "Siempre verificas el estado después de cada operación."
    ),
    tools=[shell],
    llm=LLM_MODEL,
    verbose=True,
    allow_delegation=False,
)

# ── Agente 3: Orquestador (Frontend Vercel) ───────────────────────────────
orchestrator_agent = Agent(
    role="Orquestador — Despliegue Frontend",
    goal=(
        "Desplegar el frontend React/Vite en Vercel: crear vercel.json si no existe, "
        "ejecutar el build, desplegar a producción y reportar la URL pública."
    ),
    backstory=(
        "Eres el orquestador general. Supervisas el despliegue del frontend en Vercel, "
        "creas archivos de configuración necesarios y garanticizas que la aplicación "
        "quede accesible públicamente."
    ),
    tools=[shell],
    llm=LLM_MODEL,
    verbose=True,
    allow_delegation=False,
)


def build_crew(task_description: str) -> Crew:
    """Construye el crew con los 3 agentes en secuencia."""

    task_security = Task(
        description=(
            f"Auditoría de ciberseguridad para: {task_description}\n\n"
            f"Directorio del proyecto: {PROJECT_DIR}\n\n"
            "Pasos:\n"
            "1. Verifica que .env esté en .gitignore (cat .gitignore | grep .env).\n"
            "2. Escanea .env buscando secrets con valores placeholder o débiles "
            "(grep -E '(sk_|whsec_|GEMINI_API_KEY=AIza|_SECRET=$|_KEY=$)' .env).\n"
            "3. Revisa las migraciones de Supabase en supabase/migrations/ buscando "
            "políticas RLS: lista las tablas y confirma que tienen RLS habilitado "
            "(grep -rl 'ENABLE ROW LEVEL SECURITY' supabase/migrations/).\n"
            "4. Verifica que no haya archivos .env en el repositorio "
            "(git ls-files .env).\n"
            "5. Genera un reporte de hallazgos con estado: OK o ALERTA por cada ítem."
        ),
        expected_output=(
            "Reporte de ciberseguridad con:\n"
            "- Estado de .gitignore (OK/ALERTA)\n"
            "- Secrets detectados en .env (OK/ALERTA)\n"
            "- Tablas con RLS habilitado (lista)\n"
            "- .env en git (OK/ALERTA)\n"
            "- Resumen final: APTO para despliegue o REQUIERE CORRECCIONES"
        ),
        agent=security_agent,
    )

    task_backend = Task(
        description=(
            f"Despliegue de Supabase para: {task_description}\n\n"
            f"Project ref: {SUPABASE_REF}\n"
            f"Directorio: {PROJECT_DIR}\n\n"
            "Pasos:\n"
            "1. Vincula el proyecto remoto: "
            f"cd {PROJECT_DIR} && supabase link --project-ref {SUPABASE_REF}\n"
            "2. Ejecuta las migraciones: "
            f"cd {PROJECT_DIR} && supabase db push\n"
            "3. Despliega todas las edge functions: "
            f"cd {PROJECT_DIR} && supabase functions deploy --no-verify-jwt\n"
            "4. Verifica el estado: "
            f"cd {PROJECT_DIR} && supabase projects list\n"
            "5. Reporta el estado de cada operación."
        ),
        expected_output=(
            "Reporte de despliegue Supabase:\n"
            "- Link del proyecto (éxito/error)\n"
            "- Migraciones aplicadas (cuántas, estado)\n"
            "- Edge functions desplegadas (cuántas, estado)\n"
            "- Estado general del proyecto\n"
            "- URL del proyecto Supabase"
        ),
        agent=backend_agent,
    )

    task_orchestrator = Task(
        description=(
            f"Despliegue del frontend en Vercel para: {task_description}\n\n"
            f"Directorio: {PROJECT_DIR}\n\n"
            "Pasos:\n"
            "1. Verifica que vercel.json exista. Si no, créalo con esta configuración:\n"
            '   {"buildCommand": "pnpm build", "outputDirectory": "dist", '
            '"framework": "vite", "installCommand": "pnpm install"}\n'
            f"2. Verifica que vercel esté logueado: cd {PROJECT_DIR} && vercel whoami\n"
            f"3. Despliega a producción: cd {PROJECT_DIR} && vercel --prod --yes\n"
            "4. Reporta la URL pública de despliegue.\n"
            "5. Si vercel no está logueado, reporta que se necesita: vercel login"
        ),
        expected_output=(
            "Reporte de despliegue Vercel:\n"
            "- vercel.json (creado/existente)\n"
            "- Estado de autenticación\n"
            "- URL de despliegue\n"
            "- Estado final"
        ),
        agent=orchestrator_agent,
    )

    crew = Crew(
        agents=[security_agent, backend_agent, orchestrator_agent],
        tasks=[task_security, task_backend, task_orchestrator],
        verbose=True,
    )

    return crew
