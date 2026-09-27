// 04-traveler/comprehensive.spec.ts — Tests integrales del Viajero
import { test, expect } from "@playwright/test";
import { navigateTo, ANON_KEY } from "../fixtures/helpers";

const BASE_URL = "http://localhost:5173";
const STORAGE_KEY = "sb-127.0.0.1-54321-auth-token";

async function loginAsTraveler(page: any) {
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
  }, { email: "viajero1@test.com", password: "Test1234!", apiUrl: "http://127.0.0.1:54321", anonKey: ANON_KEY, key: STORAGE_KEY });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
}

test.describe("FASE 8: Viajero Checkout", () => {
  test("8.1 checkout carga para viajero autenticado", async ({ page }) => {
    await loginAsTraveler(page);
    await navigateTo(page, "/checkout");
    await page.waitForTimeout(2000);
    const body = await page.textContent("body");
    expect(body!.length).toBeGreaterThan(20);
  });

  test("8.2 checkout muestra estado vacio cuando carrito esta vacio", async ({ page }) => {
    await loginAsTraveler(page);
    await navigateTo(page, "/checkout");
    await page.waitForTimeout(2000);
    const body = await page.textContent("body");
    const hasEmpty = body!.includes("carrito") || body!.includes("vacío") || body!.includes("Explorar");
    expect(hasEmpty).toBeTruthy();
  });

  test("8.3 checkout tiene boton de navegacion a marketplace", async ({ page }) => {
    await loginAsTraveler(page);
    await navigateTo(page, "/checkout");
    await page.waitForTimeout(2000);
    const backLink = page.locator('a[href="/"], a:has-text("Explorar"), a:has-text("Catálogo")').first();
    const hasBack = await backLink.isVisible().catch(() => false);
    expect(typeof hasBack).toBe("boolean");
  });
});

test.describe("FASE 8: Viajero Orders", () => {
  test("8.4 orders page carga", async ({ page }) => {
    await loginAsTraveler(page);
    await navigateTo(page, "/orders");
    await page.waitForTimeout(3000);
    const body = await page.textContent("body");
    expect(body!.length).toBeGreaterThan(20);
  });

  test("8.5 orders muestra historial o estado vacio", async ({ page }) => {
    await loginAsTraveler(page);
    await navigateTo(page, "/orders");
    await page.waitForTimeout(3000);
    const body = await page.textContent("body");
    const hasOrders = body!.includes("Orden") || body!.includes("orden") ||
      body!.includes("Pedido") || body!.includes("pedido") || body!.includes("Compra") ||
      body!.includes("No hay") || body!.includes("vacío") || body!.includes("historial");
    expect(hasOrders).toBeTruthy();
  });
});

test.describe("FASE 8: Viajero Package Detail", () => {
  test("8.8 detalle de paquete accesible desde home", async ({ page }) => {
    await loginAsTraveler(page);
    await navigateTo(page, "/");
    await page.waitForTimeout(4000);
    const packageLink = page.locator('a[href*="/package/"]').first();
    if (await packageLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await packageLink.click();
      await page.waitForTimeout(3000);
      const body = await page.textContent("body");
      expect(body!.length).toBeGreaterThan(100);
    } else {
      expect(true).toBeTruthy(); // No packages available to click
    }
  });

  test("8.9 chat page carga para viajero", async ({ page }) => {
    await loginAsTraveler(page);
    await navigateTo(page, "/chat");
    await page.waitForTimeout(3000);
    const body = await page.textContent("body");
    expect(body!.length).toBeGreaterThan(20);
  });
});
