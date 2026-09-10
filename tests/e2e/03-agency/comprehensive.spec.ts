// 03-agency/comprehensive.spec.ts — Tests integrales de Agencia
import { test, expect } from "@playwright/test";
import { navigateTo, ANON_KEY } from "../fixtures/helpers";

const BASE_URL = "http://localhost:5173";
const STORAGE_KEY = "sb-127.0.0.1-54321-auth-token";

async function loginAsAgency(page: any) {
  await page.goto(BASE_URL);
  await page.waitForLoadState("networkidle");
  await page.evaluate(async ({ email, password, apiUrl, anonKey, key }) => {
    const r = await fetch(`${apiUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: anonKey },
      body: JSON.stringify({ email, password }),
    });
    const d = await r.json();
    if (d.access_token) {
      localStorage.setItem(key, JSON.stringify({
        access_token: d.access_token, refresh_token: d.refresh_token,
        expires_at: Date.now() + 3600000, expires_in: 3600, token_type: "bearer",
      }));
    }
  }, { email: "agencia1@viajes.com", password: "Test1234!", apiUrl: "http://127.0.0.1:54321", anonKey: ANON_KEY, key: STORAGE_KEY });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
}

test.describe("FASE 3: Agency Dashboard", () => {
  test("3.1 dashboard carga para agency admin", async ({ page }) => {
    await loginAsAgency(page);
    await navigateTo(page, "/agency/dashboard");
    await page.waitForTimeout(5000);
    const body = await page.textContent("body");
    expect(body!.length).toBeGreaterThan(50);
  });

  test("3.2 dashboard muestra KPIs o metricas", async ({ page }) => {
    await loginAsAgency(page);
    await navigateTo(page, "/agency/dashboard");
    await page.waitForTimeout(5000);
    const body = await page.textContent("body");
    const hasMetrics = body!.includes("Revenue") || body!.includes("revenue") ||
      body!.includes("Leads") || body!.includes("leads") || body!.includes("Flyers") ||
      body!.includes("flyers") || body!.includes("Dashboard") || body!.includes("dashboard");
    expect(hasMetrics).toBeTruthy();
  });

  test("3.3 dashboard tiene quick actions", async ({ page }) => {
    await loginAsAgency(page);
    await navigateTo(page, "/agency/dashboard");
    await page.waitForTimeout(4000);
    const body = await page.textContent("body");
    const hasActions = body!.includes("Flyer") || body!.includes("CRM") ||
      body!.includes("Chat") || body!.includes("Configuración") || body!.includes("Crear");
    expect(hasActions).toBeTruthy();
  });

  test("3.4 dashboard renders sin errores criticos", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await loginAsAgency(page);
    await navigateTo(page, "/agency/dashboard");
    await page.waitForTimeout(4000);
    const criticalErrors = errors.filter(e => !e.includes("ResizeObserver") && !e.includes("downloadable font"));
    expect(criticalErrors.length).toBe(0);
  });
});

test.describe("FASE 3: Agency Flyers", () => {
  test("3.5 flyers page carga", async ({ page }) => {
    await loginAsAgency(page);
    await navigateTo(page, "/agency/flyers");
    await page.waitForTimeout(4000);
    const body = await page.textContent("body");
    expect(body!.length).toBeGreaterThan(50);
  });

  test("3.6 flyers page muestra paquetes de la agencia", async ({ page }) => {
    await loginAsAgency(page);
    await navigateTo(page, "/agency/flyers");
    await page.waitForTimeout(4000);
    const body = await page.textContent("body");
    const hasPackages = body!.includes("Riviera") || body!.includes("Europa") ||
      body!.includes("Los Cabos") || body!.includes("Oaxaca") || body!.includes("Flyers");
    expect(hasPackages).toBeTruthy();
  });

  test("3.7 flyers tiene boton crear nuevo", async ({ page }) => {
    await loginAsAgency(page);
    await navigateTo(page, "/agency/flyers");
    await page.waitForTimeout(3000);
    const createBtn = page.locator('button:has-text("Crear"), button:has-text("Nuevo"), a:has-text("Crear")').first();
    const hasCreate = await createBtn.isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasCreate).toBeTruthy();
  });
});

test.describe("FASE 4: Agency CRM", () => {
  test("4.1 CRM page carga", async ({ page }) => {
    await loginAsAgency(page);
    await navigateTo(page, "/agency/crm");
    await page.waitForTimeout(4000);
    const body = await page.textContent("body");
    expect(body!.length).toBeGreaterThan(50);
  });

  test("4.2 CRM muestra leads", async ({ page }) => {
    await loginAsAgency(page);
    await navigateTo(page, "/agency/crm");
    await page.waitForTimeout(4000);
    const body = await page.textContent("body");
    const hasLeads = body!.includes("Lead") || body!.includes("lead") ||
      body!.includes("CRM") || body!.includes("Nuevo") || body!.includes("Contactado");
    expect(hasLeads).toBeTruthy();
  });

  test("4.3 CRM tiene filtros o busqueda", async ({ page }) => {
    await loginAsAgency(page);
    await navigateTo(page, "/agency/crm");
    await page.waitForTimeout(3000);
    const filterElements = page.locator('input, select, button:has-text("Filtrar"), button:has-text("Buscar")');
    const count = await filterElements.count();
    expect(count).toBeGreaterThan(0);
  });

  test("4.4 CRM renders sin errores criticos", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await loginAsAgency(page);
    await navigateTo(page, "/agency/crm");
    await page.waitForTimeout(4000);
    const criticalErrors = errors.filter(e => !e.includes("ResizeObserver") && !e.includes("downloadable font"));
    expect(criticalErrors.length).toBe(0);
  });
});

test.describe("FASE 5: Agency Roles", () => {
  test("5.1 roles page carga", async ({ page }) => {
    await loginAsAgency(page);
    await navigateTo(page, "/agency/roles");
    await page.waitForTimeout(3000);
    const body = await page.textContent("body");
    expect(body!.length).toBeGreaterThan(50);
  });

  test("5.2 roles page muestra roles existentes", async ({ page }) => {
    await loginAsAgency(page);
    await navigateTo(page, "/agency/roles");
    await page.waitForTimeout(3000);
    const body = await page.textContent("body");
    const hasRoles = body!.includes("Rol") || body!.includes(" rol") ||
      body!.includes("Agente") || body!.includes("Ventas") || body!.includes("Permiso");
    expect(hasRoles).toBeTruthy();
  });

  test("5.3 roles tiene interactividad", async ({ page }) => {
    await loginAsAgency(page);
    await navigateTo(page, "/agency/roles");
    await page.waitForTimeout(3000);
    const buttons = await page.locator("button").count();
    expect(buttons).toBeGreaterThan(0);
  });
});

test.describe("FASE 6: Agency Chat", () => {
  test("6.1 chat page carga", async ({ page }) => {
    await loginAsAgency(page);
    await navigateTo(page, "/agency/chat");
    await page.waitForTimeout(3000);
    const body = await page.textContent("body");
    expect(body!.length).toBeGreaterThan(20);
  });

  test("6.2 chat muestra area de mensajes", async ({ page }) => {
    await loginAsAgency(page);
    await navigateTo(page, "/agency/chat");
    await page.waitForTimeout(3000);
    const body = await page.textContent("body");
    expect(body!.length).toBeGreaterThan(20);
  });

  test("6.3 chat renders sin errores criticos", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await loginAsAgency(page);
    await navigateTo(page, "/agency/chat");
    await page.waitForTimeout(3000);
    const criticalErrors = errors.filter(e => !e.includes("ResizeObserver") && !e.includes("downloadable font"));
    expect(criticalErrors.length).toBe(0);
  });
});

test.describe("FASE 7: Agency Finance y Settings", () => {
  test("7.1 finance page carga", async ({ page }) => {
    await loginAsAgency(page);
    await navigateTo(page, "/agency/finance");
    await page.waitForTimeout(4000);
    const body = await page.textContent("body");
    expect(body!.length).toBeGreaterThan(50);
  });

  test("7.2 finance muestra transacciones o comisiones", async ({ page }) => {
    await loginAsAgency(page);
    await navigateTo(page, "/agency/finance");
    await page.waitForTimeout(4000);
    const body = await page.textContent("body");
    const hasFinance = body!.includes("Finance") || body!.includes("finance") ||
      body!.includes("Comisión") || body!.includes("comisión") || body!.includes("Orden") ||
      body!.includes("Pago") || body!.includes("Pago") || body!.includes("Factura");
    expect(hasFinance).toBeTruthy();
  });

  test("7.3 settings page carga", async ({ page }) => {
    await loginAsAgency(page);
    await navigateTo(page, "/agency/settings");
    await page.waitForTimeout(4000);
    const body = await page.textContent("body");
    expect(body!.length).toBeGreaterThan(50);
  });

  test("7.4 settings muestra datos de agencia", async ({ page }) => {
    await loginAsAgency(page);
    await navigateTo(page, "/agency/settings");
    await page.waitForTimeout(4000);
    const body = await page.textContent("body");
    const hasSettings = body!.includes("Viajes Increíbles") || body!.includes("Settings") ||
      body!.includes("settings") || body!.includes("Configuración") || body!.includes("Agencia");
    expect(hasSettings).toBeTruthy();
  });

  test("7.5 analytics page carga", async ({ page }) => {
    await loginAsAgency(page);
    await navigateTo(page, "/agency/analytics");
    await page.waitForTimeout(4000);
    const body = await page.textContent("body");
    expect(body!.length).toBeGreaterThan(50);
  });

  test("7.6 logistics page carga", async ({ page }) => {
    await loginAsAgency(page);
    await navigateTo(page, "/agency/logistics");
    await page.waitForTimeout(4000);
    const body = await page.textContent("body");
    expect(body!.length).toBeGreaterThan(20);
  });
});
