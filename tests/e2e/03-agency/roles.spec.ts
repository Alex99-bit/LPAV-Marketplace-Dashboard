// 03-agency/roles.spec.ts
import { test, expect } from "@playwright/test";
import { navigateTo } from "../fixtures/helpers";

test.use({ storageState: "tests/e2e/fixtures/.auth/agencyAdmin.json" });

test.describe("Agency Roles", () => {
  test("roles page loads", async ({ page }) => {
    await navigateTo(page, "/agency/roles");
    await page.waitForTimeout(3000);
    const bodyText = await page.textContent("body");
    expect(bodyText!.length).toBeGreaterThan(50);
  });

  test("roles page has interactive elements", async ({ page }) => {
    await navigateTo(page, "/agency/roles");
    await page.waitForTimeout(3000);
    const buttons = await page.locator("button").count();
    expect(buttons).toBeGreaterThan(0);
  });

  test("roles page renders without critical errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await navigateTo(page, "/agency/roles");
    await page.waitForTimeout(3000);
    const criticalErrors = errors.filter(e => !e.includes("ResizeObserver") && !e.includes("downloadable font"));
    expect(criticalErrors.length).toBe(0);
  });
});
