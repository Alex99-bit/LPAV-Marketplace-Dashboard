// 01-auth/registration.spec.ts
import { test, expect } from "@playwright/test";
import { navigateTo } from "../fixtures/helpers";

test.describe("Agency Registration", () => {
  test("registration page renders", async ({ page }) => {
    await navigateTo(page, "/auth/agency");
    await page.waitForTimeout(2000);
    const bodyText = await page.textContent("body");
    expect(bodyText!.length).toBeGreaterThan(50);
  });

  test("registration has interactive elements", async ({ page }) => {
    await navigateTo(page, "/auth/agency");
    await page.waitForTimeout(2000);
    const buttons = await page.locator("button").count();
    expect(buttons).toBeGreaterThan(0);
  });

  test("registration page renders without errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await navigateTo(page, "/auth/agency");
    await page.waitForTimeout(2000);
    const criticalErrors = errors.filter(e => !e.includes("ResizeObserver") && !e.includes("downloadable font"));
    expect(criticalErrors.length).toBe(0);
  });
});
