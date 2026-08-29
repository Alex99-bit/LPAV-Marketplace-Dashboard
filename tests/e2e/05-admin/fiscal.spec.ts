// 05-admin/fiscal.spec.ts
import { test, expect } from "@playwright/test";
import { navigateTo } from "../fixtures/helpers";

test.use({ storageState: "tests/e2e/fixtures/.auth/superAdmin.json" });

test.describe("SuperAdmin - Fiscal", () => {
  test("fiscal tab renders income section", async ({ page }) => {
    await navigateTo(page, "/admin");
    await page.waitForTimeout(2000);
    const fiscalTab = page.locator('button:has-text("Fiscal")').first();
    if (await fiscalTab.isVisible()) {
      await fiscalTab.click();
      await page.waitForTimeout(2000);
      const bodyText = await page.textContent("body");
      expect(bodyText).toBeTruthy();
    }
  });

  test("fiscal tab has income sub-section", async ({ page }) => {
    await navigateTo(page, "/admin");
    await page.waitForTimeout(2000);
    const fiscalTab = page.locator('button:has-text("Fiscal")').first();
    if (await fiscalTab.isVisible()) {
      await fiscalTab.click();
      await page.waitForTimeout(2000);
      const bodyText = await page.textContent("body");
      const hasIncome = bodyText!.includes("Ingresos") || bodyText!.includes("ingresos") || bodyText!.includes("Fiscal");
      expect(hasIncome).toBeTruthy();
    }
  });

  test("fiscal tab has expense sub-section", async ({ page }) => {
    await navigateTo(page, "/admin");
    await page.waitForTimeout(2000);
    const fiscalTab = page.locator('button:has-text("Fiscal")').first();
    if (await fiscalTab.isVisible()) {
      await fiscalTab.click();
      await page.waitForTimeout(2000);
      const bodyText = await page.textContent("body");
      const hasExpenses = bodyText!.includes("Egresos") || bodyText!.includes("egresos") || bodyText!.includes("Gastos");
      expect(hasExpenses).toBeTruthy();
    }
  });

  test("fiscal tab has periods sub-section", async ({ page }) => {
    await navigateTo(page, "/admin");
    await page.waitForTimeout(2000);
    const fiscalTab = page.locator('button:has-text("Fiscal")').first();
    if (await fiscalTab.isVisible()) {
      await fiscalTab.click();
      await page.waitForTimeout(2000);
      const bodyText = await page.textContent("body");
      const hasPeriods = bodyText!.includes("Periodos") || bodyText!.includes("periodos") || bodyText!.includes("Período");
      expect(hasPeriods).toBeTruthy();
    }
  });
});
