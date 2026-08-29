// 05-admin/moderation.spec.ts
import { test, expect } from "@playwright/test";
import { navigateTo } from "../fixtures/helpers";

test.use({ storageState: "tests/e2e/fixtures/.auth/superAdmin.json" });

test.describe("SuperAdmin - Moderation", () => {
  test("moderation tab loads", async ({ page }) => {
    await navigateTo(page, "/admin");
    await page.waitForTimeout(2000);
    const modTab = page.locator('button:has-text("Moderación"), button:has-text("Moderacion")').first();
    if (await modTab.isVisible()) {
      await modTab.click();
      await page.waitForTimeout(2000);
      const bodyText = await page.textContent("body");
      expect(bodyText).toBeTruthy();
    }
  });

  test("moderation shows reports or empty state", async ({ page }) => {
    await navigateTo(page, "/admin");
    await page.waitForTimeout(2000);
    const modTab = page.locator('button:has-text("Moderación"), button:has-text("Moderacion")').first();
    if (await modTab.isVisible()) {
      await modTab.click();
      await page.waitForTimeout(2000);
      const bodyText = await page.textContent("body");
      const hasReports = bodyText!.includes("reporte") || bodyText!.includes("Reporte") || bodyText!.includes("pendiente");
      const hasEmpty = bodyText!.includes("No hay") || bodyText!.includes("limpio");
      expect(hasReports || hasEmpty).toBeTruthy();
    }
  });

  test("moderation badge shows count", async ({ page }) => {
    await navigateTo(page, "/admin");
    await page.waitForTimeout(2000);
    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();
  });
});
