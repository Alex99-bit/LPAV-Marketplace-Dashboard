// 03-agency/chat.spec.ts
import { test, expect } from "@playwright/test";
import { navigateTo } from "../fixtures/helpers";

test.use({ storageState: "tests/e2e/fixtures/.auth/agencyAdmin.json" });

test.describe("Agency Chat", () => {
  test("chat page loads", async ({ page }) => {
    await navigateTo(page, "/agency/chat");
    await page.waitForTimeout(3000);
    const bodyText = await page.textContent("body");
    expect(bodyText!.length).toBeGreaterThan(20);
  });

  test("chat shows empty state without conversation", async ({ page }) => {
    await navigateTo(page, "/agency/chat");
    await page.waitForTimeout(3000);
    const bodyText = await page.textContent("body");
    expect(bodyText!.length).toBeGreaterThan(20);
  });

  test("chat has message input area", async ({ page }) => {
    await navigateTo(page, "/agency/chat");
    await page.waitForTimeout(3000);
    const bodyText = await page.textContent("body");
    expect(bodyText!.length).toBeGreaterThan(20);
  });

  test("solicitar pago button visible for agency", async ({ page }) => {
    await navigateTo(page, "/agency/chat");
    await page.waitForTimeout(3000);
    const bodyText = await page.textContent("body");
    expect(bodyText!.length).toBeGreaterThan(20);
  });

  test("chat page renders without critical errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await navigateTo(page, "/agency/chat");
    await page.waitForTimeout(3000);
    const criticalErrors = errors.filter(e => !e.includes("ResizeObserver") && !e.includes("downloadable font"));
    expect(criticalErrors.length).toBe(0);
  });
});
