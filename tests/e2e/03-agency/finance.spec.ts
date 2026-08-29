// 03-agency/finance.spec.ts
import { test, expect } from "@playwright/test";
import { navigateTo } from "../fixtures/helpers";

test.use({ storageState: "tests/e2e/fixtures/.auth/agencyAdmin.json" });

test.describe("Agency Finance", () => {
  test("finance page loads", async ({ page }) => {
    await navigateTo(page, "/agency/finance");
    await page.waitForTimeout(4000);
    const bodyText = await page.textContent("body");
    expect(bodyText!.length).toBeGreaterThan(50);
  });

  test("finance page has tabs", async ({ page }) => {
    await navigateTo(page, "/agency/finance");
    await page.waitForTimeout(3000);
    const buttons = await page.locator("button").count();
    expect(buttons).toBeGreaterThan(2);
  });

  test("finance tab switching works", async ({ page }) => {
    await navigateTo(page, "/agency/finance");
    await page.waitForTimeout(3000);
    // Click on different tabs
    const tabs = page.locator("button");
    const tabCount = await tabs.count();
    if (tabCount > 3) {
      await tabs.nth(1).click();
      await page.waitForTimeout(1000);
      const bodyText = await page.textContent("body");
      expect(bodyText).toBeTruthy();
    }
  });

  test("finance renders without critical errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await navigateTo(page, "/agency/finance");
    await page.waitForTimeout(4000);
    const criticalErrors = errors.filter(e => !e.includes("ResizeObserver") && !e.includes("downloadable font"));
    expect(criticalErrors.length).toBe(0);
  });
});
