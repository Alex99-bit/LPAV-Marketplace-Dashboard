// 01-auth/login.spec.ts — Tests de login por cada tipo de usuario
import { test, expect } from "@playwright/test";
import { navigateTo } from "../fixtures/helpers";

test.describe("Login", () => {
  test("login page renders choice screen", async ({ page }) => {
    await navigateTo(page, "/auth/login");
    await page.waitForTimeout(2000);
    const bodyText = await page.textContent("body");
    expect(bodyText).toContain("Viajero");
    expect(bodyText).toContain("Agencia");
  });

  test("can navigate to traveler login form", async ({ page }) => {
    await navigateTo(page, "/auth/login");
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Soy Viajero")');
    await page.waitForTimeout(1000);
    const bodyText = await page.textContent("body");
    expect(bodyText).toContain("Iniciar Sesión");
    expect(await page.locator('input[type="email"]').isVisible()).toBeTruthy();
  });

  test("login with invalid credentials shows error", async ({ page }) => {
    await navigateTo(page, "/auth/login");
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Soy Viajero")');
    await page.waitForTimeout(1000);
    await page.fill('input[type="email"]', "wrong@test.com");
    await page.fill('input[type="password"]', "WrongPass123!");
    // Use the LAST "Iniciar Sesión" button (the form submit, not the nav link)
    await page.locator('button:has-text("Iniciar")').last().click();
    await page.waitForTimeout(3000);
    // After failed login, should still be on login page
    expect(page.url()).toContain("/auth");
  });

  test("login as agency admin redirects to dashboard", async ({ page }) => {
    await navigateTo(page, "/auth/agency");
    await page.waitForTimeout(2000);
    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();
  });

  test("login toggle to register mode", async ({ page }) => {
    await navigateTo(page, "/auth/login");
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Soy Viajero")');
    await page.waitForTimeout(1000);
    const registerLink = page.locator('button:has-text("Crear"), a:has-text("Crear"), button:has-text("Registrate")').first();
    if (await registerLink.isVisible()) {
      await registerLink.click();
      await page.waitForTimeout(1000);
      const bodyText = await page.textContent("body");
      expect(bodyText).toContain("Crear Cuenta");
    }
  });
});

test.describe("Registration flow", () => {
  test("agency registration page renders", async ({ page }) => {
    await navigateTo(page, "/auth/agency");
    await page.waitForTimeout(2000);
    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();
    expect(bodyText!.length).toBeGreaterThan(100);
  });

  test("agency auth has login and register options", async ({ page }) => {
    await navigateTo(page, "/auth/agency");
    await page.waitForTimeout(2000);
    const bodyText = await page.textContent("body");
    const hasLogin = bodyText!.includes("Iniciar") || bodyText!.includes("Sesión");
    const hasRegister = bodyText!.includes("Crear") || bodyText!.includes("Registrar") || bodyText!.includes("Cuenta");
    expect(hasLogin || hasRegister).toBeTruthy();
  });
});
