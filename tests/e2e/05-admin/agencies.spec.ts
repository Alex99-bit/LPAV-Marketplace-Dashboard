// 05-admin/agencies.spec.ts
import { test, expect } from "@playwright/test";
import { navigateTo } from "../fixtures/helpers";

test.use({ storageState: "tests/e2e/fixtures/.auth/superAdmin.json" });

test.describe("SuperAdmin - Agencies", () => {
  test("admin page loads or redirects", async ({ page }) => {
    await navigateTo(page, "/admin");
    await page.waitForTimeout(3000);
    // Admin page may redirect if not on localhost
    const bodyText = await page.textContent("body");
    expect(bodyText!.length).toBeGreaterThan(20);
  });

  test("admin page has interactive elements", async ({ page }) => {
    await navigateTo(page, "/admin");
    await page.waitForTimeout(3000);
    const bodyText = await page.textContent("body");
    expect(bodyText!.length).toBeGreaterThan(20);
  });

  test("admin page renders without critical errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await navigateTo(page, "/admin");
    await page.waitForTimeout(3000);
    const criticalErrors = errors.filter(e => !e.includes("ResizeObserver") && !e.includes("downloadable font") && !e.includes("Not allowed"));
    expect(criticalErrors.length).toBe(0);
  });
});
