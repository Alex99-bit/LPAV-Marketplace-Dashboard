import chainlit as cl
from agents import build_crew

DASHBOARD_TEMPLATE = """
## 🖥️ Dashboard de Agentes

| Agente | Rol | Estado |
|--------|-----|--------|
| 🛡️ **Ciberseguridad** | Auditoría de secrets, RLS, .gitignore | {sec_status} |
| ⚙️ **Backend DevOps** | Supabase: migraciones + edge functions | {be_status} |
| 🚀 **Orquestador** | Vercel: frontend a producción | {orc_status} |

---
"""


def render_dashboard(sec: str = "⏳ Pendiente", be: str = "⏳ Pendiente", orc: str = "⏳ Pendiente"):
    return DASHBOARD_TEMPLATE.format(sec_status=sec, be_status=be, orc_status=orc)


@cl.on_chat_start
async def on_chat_start():
    await cl.Message(content=render_dashboard()).send()
    await cl.Message(
        content=(
            "Escribe tu requerimiento de despliegue y los 3 agentes trabajarán **en secuencia**:\n\n"
            "1. 🛡️ Ciberseguridad audita el proyecto\n"
            "2. ⚙️ Backend DevOps despliega Supabase\n"
            "3. 🚀 Orquestador despliega Vercel"
        )
    ).send()


@cl.on_message
async def on_message(message: cl.Message):
    user_input = message.content

    # ── Dashboard inicial ──
    await cl.Message(content=render_dashboard(
        sec="🔄 Ejecutando...",
        be="⏳ Esperando",
        orc="⏳ Esperando",
    )).send()

    try:
        crew = build_crew(user_input)

        # ── Ejecutar el crew async y capturar resultado ──
        result = await crew.kickoff_async()

        # ── Dashboard final ──
        await cl.Message(content=render_dashboard(
            sec="✅ Completado",
            be="✅ Completado",
            orc="✅ Completado",
        )).send()

        # ── Resultado detallado ──
        final_output = str(result)
        await cl.Message(content=f"## 📋 Reporte Final del Despliegue\n\n{final_output}").send()

    except Exception as e:
        await cl.Message(content=render_dashboard(
            sec="❌ Error",
            be="❌ Error",
            orc="❌ Error",
        )).send()

        await cl.Message(
            content=f"## ❌ Error durante la ejecución\n\n```\n{str(e)}\n```"
        ).send()


if __name__ == "__main__":
    cl.run()
