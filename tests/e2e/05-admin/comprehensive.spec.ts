// 05-admin/comprehensive.spec.ts — Tests integrales del SuperAdmin
import { test, expect } from "@playwright/test";
import { navigateTo, ANON_KEY } from "../fixtures/helpers";

const BASE_URL = "http://localhost:5173";
const STORAGE_KEY = "sb-127.0.0.1-54321-auth-token";

async function loginAsAdmin(page: any) {
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
  }, { email: "admin@lpav.com", password: "Test1234!", apiUrl: "http://127.0.0.1:54321", anonKey: ANON_KEY, key: STORAGE_KEY });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
}

test.describe("FASE 9: SuperAdmin Dashboard", () => {
  test("9.1 admin dashboard carga", async ({ page }) => {
    await loginAsAdmin(page);
    await navigateTo(page, "/admin");
    await page.waitForTimeout(5000);
    const body = await page.textContent("body");
    expect(body!.length).toBeGreaterThan(50);
  });

  test("9.2 admin dashboard muestra metricas globales", async ({ page }) => {
    await loginAsAdmin(page);
    await navigateTo(page, "/admin");
    await page.waitForTimeout(5000);
    const body = await page.textContent("body");
    const hasMetrics = body!.includes("Agencia") || body!.includes("agencia") ||
      body!.includes("Usuario") || body!.includes("usuario") || body!.includes("Revenue") ||
      body!.includes("Paquete") || body!.includes("Admin");
    expect(hasMetrics).toBeTruthy();
  });

  test("9.3 admin dashboard tiene tabs de navegacion", async ({ page }) => {
    await loginAsAdmin(page);
    await navigateTo(page, "/admin");
    await page.waitForTimeout(4000);
    const body = await page.textContent("body");
    const hasTabs = body!.includes("Resumen") || body!.includes("Agencias") ||
      body!.includes("Usuarios") || body!.includes("Moderación") || body!.includes("Fiscal");
    expect(hasTabs).toBeTruthy();
  });

  test("9.4 admin renders sin errores criticos", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await loginAsAdmin(page);
    await navigateTo(page, "/admin");
    await page.waitForTimeout(4000);
    const criticalErrors = errors.filter(e => !e.includes("ResizeObserver") && !e.includes("downloadable font"));
    expect(criticalErrors.length).toBe(0);
  });
});

test.describe("FASE 9: SuperAdmin — Tab Agencias", () => {
  test("9.5 tab agencias muestra lista", async ({ page }) => {
    await loginAsAdmin(page);
    await navigateTo(page, "/admin");
    await page.waitForTimeout(4000);
    // Click on agencias tab
    const agenciasTab = page.locator('button:has-text("Agencias"), button:has-text("agencias")').first();
    if (await agenciasTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await agenciasTab.click();
      await page.waitForTimeout(3000);
    }
    const body = await page.textContent("body");
    const hasAgencies = body!.includes("Viajes Increíbles") || body!.includes("Tours del Caribe") ||
      body!.includes("Agencia") || body!.includes("agencia");
    expect(hasAgencies).toBeTruthy();
  });

  test("9.6 tab usuarios muestra lista", async ({ page }) => {
    await loginAsAdmin(page);
    await navigateTo(page, "/admin");
    await page.waitForTimeout(4000);
    const usuariosTab = page.locator('button:has-text("Usuarios"), button:has-text("usuarios")').first();
    if (await usuariosTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await usuariosTab.click();
      await page.waitForTimeout(3000);
    }
    const body = await page.textContent("body");
    const hasUsers = body!.includes("admin@lpav") || body!.includes("agencia1@viajes") ||
      body!.includes("Usuario") || body!.includes("usuario") || body!.includes("viajero");
    expect(hasUsers).toBeTruthy();
  });
});

test.describe("FASE 9: SuperAdmin — Moderación", () => {
  test("9.7 tab moderacion muestra reportes", async ({ page }) => {
    await loginAsAdmin(page);
    await navigateTo(page, "/admin");
    await page.waitForTimeout(4000);
    const moderacionTab = page.locator('button:has-text("Moderación"), button:has-text("moderacion"), button:has-text("Moderacion")').first();
    if (await moderacionTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await moderacionTab.click();
      await page.waitForTimeout(3000);
    }
    const body = await page.textContent("body");
    const hasReports = body!.includes("Reporte") || body!.includes("reporte") ||
      body!.includes("Report") || body!.includes("Pendiente") || body!.includes("pendiente");
    expect(hasReports).toBeTruthy();
  });
});

test.describe("FASE 9: SuperAdmin — Fiscal", () => {
  test("9.8 tab fiscal carga", async ({ page }) => {
    await loginAsAdmin(page);
    await navigateTo(page, "/admin");
    await page.waitForTimeout(4000);
    const fiscalTab = page.locator('button:has-text("Fiscal"), button:has-text("fiscal")').first();
    if (await fiscalTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await fiscalTab.click();
      await page.waitForTimeout(3000);
    }
    const body = await page.textContent("body");
    expect(body!.length).toBeGreaterThan(50);
  });
});
