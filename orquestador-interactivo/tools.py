import subprocess
import asyncio
from typing import Type
from pydantic import BaseModel, Field
from crewai.tools import BaseTool


class ShellCommandInput(BaseModel):
    command: str = Field(..., description="Comando de shell a ejecutar")


class ShellTool(BaseTool):
    name: str = "shell_executor"
    description: str = (
        "Ejecuta comandos de terminal en la máquina local. "
        "Útil para instalar paquetes, correr tests, ejecutar scripts, etc."
    )
    args_schema: Type[BaseModel] = ShellCommandInput

    def _run(self, command: str) -> str:
        try:
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                timeout=120,
            )
            output = result.stdout
            if result.stderr:
                output += f"\n[STDERR]\n{result.stderr}"
            return output if output else "Comando ejecutado sin salida."
        except subprocess.TimeoutExpired:
            return "ERROR: El comando excedió el timeout de 120 segundos."
        except Exception as e:
            return f"ERROR: {str(e)}"


class BrowserActionInput(BaseModel):
    action: str = Field(
        ...,
        description=(
            "Acción a realizar. Opciones: 'goto', 'click', 'fill', 'screenshot', 'get_text', 'get_url'. "
            "goto requiere 'url'. click requiere 'selector'. fill requiere 'selector' y 'value'."
        ),
    )
    url: str = Field(default="", description="URL para navegación (acción 'goto')")
    selector: str = Field(default="", description="Selector CSS del elemento")
    value: str = Field(default="", description="Valor para campos de texto")


class BrowserTool(BaseTool):
    name: str = "browser_navigator"
    description: str = (
        "Navega y controla un navegador Chromium para interactuar con sitios web. "
        "Puede abrir URLs, hacer clic, llenar formularios y capturar pantalla."
    )
    args_schema: Type[BaseModel] = BrowserActionInput

    def _run(self, action: str, url: str = "", selector: str = "", value: str = "") -> str:
        try:
            return asyncio.get_event_loop().run_until_complete(
                self._async_run(action, url, selector, value)
            )
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            return loop.run_until_complete(self._async_run(action, url, selector, value))

    async def _async_run(self, action: str, url: str, selector: str, value: str) -> str:
        from playwright.async_api import async_playwright

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=False)
            page = await browser.new_page()

            try:
                if action == "goto":
                    if not url:
                        return "ERROR: Se requiere una URL para 'goto'."
                    await page.goto(url, wait_until="networkidle", timeout=30000)
                    title = await page.title()
                    return f"Navegado a {url} — Título: {title}"

                elif action == "click":
                    if not selector:
                        return "ERROR: Se requiere un selector para 'click'."
                    await page.click(selector, timeout=10000)
                    return f"Clic en {selector} exitoso."

                elif action == "fill":
                    if not selector or not value:
                        return "ERROR: Se requieren selector y value para 'fill'."
                    await page.fill(selector, value, timeout=10000)
                    return f"Campo {selector} llenado con '{value}'."

                elif action == "screenshot":
                    path = "/tmp/browser_screenshot.png"
                    await page.screenshot(path=path, full_page=True)
                    return f"Screenshot guardado en {path}"

                elif action == "get_text":
                    if not selector:
                        return "ERROR: Se requiere un selector para 'get_text'."
                    text = await page.inner_text(selector)
                    return text[:2000]

                elif action == "get_url":
                    return page.url

                else:
                    return f"ERROR: Acción '{action}' no reconocida."

            finally:
                await browser.close()
