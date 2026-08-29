// 03-agency/crm.spec.ts
import { test, expect } from "@playwright/test";
import { navigateTo } from "../fixtures/helpers";

test.use({ storageState: "tests/e2e/fixtures/.auth/agencyAdmin.json" });

test.describe("Agency CRM", () => {
  test("CRM page loads", async ({ page }) => {
    await navigateTo(page, "/agency/crm");
    await page.waitForTimeout(4000);
    const bodyText = await page.textContent("body");
    expect(bodyText!.length).toBeGreaterThan(50);
  });

  test("CRM shows content", async ({ page }) => {
    await navigateTo(page, "/agency/crm");
    await page.waitForTimeout(4000);
    const bodyText = await page.textContent("body");
    expect(bodyText!.length).toBeGreaterThan(50);
  });

  test("CRM has interactive elements", async ({ page }) => {
    await navigateTo(page, "/agency/crm");
    await page.waitForTimeout(3000);
    const buttons = await page.locator("button, input").count();
    expect(buttons).toBeGreaterThan(0);
  });

  test("CRM renders without critical errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await navigateTo(page, "/agency/crm");
    await page.waitForTimeout(4000);
    const criticalErrors = errors.filter(e => !e.includes("ResizeObserver") && !e.includes("downloadable font"));
    expect(criticalErrors.length).toBe(0);
  });
});
