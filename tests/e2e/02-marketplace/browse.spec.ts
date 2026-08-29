// 02-marketplace/browse.spec.ts
import { test, expect } from "@playwright/test";
import { navigateTo } from "../fixtures/helpers";

test.describe("Marketplace Browse", () => {
  test("homepage loads with content", async ({ page }) => {
    await navigateTo(page, "/");
    await page.waitForLoadState("networkidle");
    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();
    expect(bodyText!.length).toBeGreaterThan(50);
  });

  test("homepage has interactive elements", async ({ page }) => {
    await navigateTo(page, "/");
    await page.waitForLoadState("networkidle");
    const buttons = await page.locator("button, a[href]").count();
    expect(buttons).toBeGreaterThan(0);
  });

  test("homepage renders without errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await navigateTo(page, "/");
    await page.waitForLoadState("networkidle");
    // Filter out non-critical errors
    const criticalErrors = errors.filter(e => !e.includes("ResizeObserver") && !e.includes("downloadable font"));
    expect(criticalErrors.length).toBe(0);
  });
});
