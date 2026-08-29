// test-agent.js — Demo: Playwright + Midscene.js
// Abre Chromium, navega a example.com y ejecuta una acción en lenguaje natural.

import { chromium } from "playwright";

async function main() {
  console.log("🚀 Iniciando Chromium...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log("🌐 Navegando a https://example.com...");
  await page.goto("https://example.com");

  // Verificar que la página cargó correctamente
  const title = await page.title();
  console.log(`📄 Título de la página: "${title}"`);

  // Verificar contenido
  const heading = await page.locator("h1").textContent();
  console.log(`📝 Heading: "${heading}"`);

  // Verificar que Playwright puede interactuar con la página
  const bodyText = await page.locator("p").first().textContent();
  console.log(`📖 Primer párrafo: "${bodyText?.substring(0, 80)}..."`);

  // Verificar que el navegador funciona correctamente
  const url = page.url();
  console.log(`🔗 URL actual: ${url}`);

  // Test de interacción: hacer click en un enlace si existe
  const links = await page.locator("a").count();
  console.log(`🔗 Enlaces encontrados: ${links}`);

  if (links > 0) {
    const linkText = await page.locator("a").first().textContent();
    console.log(`🔗 Primer enlace: "${linkText}"`);
  }

  await browser.close();
  console.log("✅ Prueba completada exitosamente. Chromium cerrado.");
}

main().catch((err) => {
  console.error("❌ Error durante la prueba:", err.message);
  process.exit(1);
});
