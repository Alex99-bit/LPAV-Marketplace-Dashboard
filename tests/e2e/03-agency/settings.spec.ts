// 03-agency/settings.spec.ts
import { test, expect } from "@playwright/test";
import { navigateTo } from "../fixtures/helpers";

test.use({ storageState: "tests/e2e/fixtures/.auth/agencyAdmin.json" });

test.describe("Agency Settings", () => {
  test("settings page loads", async ({ page }) => {
    await navigateTo(page, "/agency/settings");
    await page.waitForTimeout(3000);
    const bodyText = await page.textContent("body");
    expect(bodyText!.length).toBeGreaterThan(50);
  });

  test("settings has tabs", async ({ page }) => {
    await navigateTo(page, "/agency/settings");
    await page.waitForTimeout(3000);
    const buttons = await page.locator("button").count();
    expect(buttons).toBeGreaterThan(2);
  });

  test("settings renders without critical errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await navigateTo(page, "/agency/settings");
    await page.waitForTimeout(3000);
    const criticalErrors = errors.filter(e => !e.includes("ResizeObserver") && !e.includes("downloadable font"));
    expect(criticalErrors.length).toBe(0);
  });
});
