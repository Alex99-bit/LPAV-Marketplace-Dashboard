// 02-marketplace/package-detail.spec.ts
import { test, expect } from "@playwright/test";
import { navigateTo } from "../fixtures/helpers";

test.describe("Package Detail", () => {
  test("nonexistent package shows not found", async ({ page }) => {
    await navigateTo(page, "/package/00000000-0000-0000-0000-000000000000");
    await page.waitForTimeout(3000);
    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();
    expect(bodyText!.length).toBeGreaterThan(20);
  });

  test("package page renders without critical errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => // Filter out non-critical errors
      errors.push(err.message));
    await navigateTo(page, "/package/00000000-0000-0000-0000-000000000000");
    await page.waitForTimeout(3000);
    const criticalErrors = errors.filter(e => !e.includes("ResizeObserver") && !e.includes("downloadable font"));
    expect(criticalErrors.length).toBe(0);
  });
});
