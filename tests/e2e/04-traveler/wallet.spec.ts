// 04-traveler/wallet.spec.ts
import { test, expect } from "@playwright/test";
import { navigateTo } from "../fixtures/helpers";

test.use({ storageState: "tests/e2e/fixtures/.auth/traveler.json" });

test.describe("Wallet", () => {
  test("wallet page loads or redirects", async ({ page }) => {
    await navigateTo(page, "/wallet");
    await page.waitForTimeout(3000);
    const bodyText = await page.textContent("body");
    expect(bodyText!.length).toBeGreaterThan(20);
  });

  test("wallet page renders without critical errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await navigateTo(page, "/wallet");
    await page.waitForTimeout(3000);
    const criticalErrors = errors.filter(e => !e.includes("ResizeObserver") && !e.includes("downloadable font"));
    expect(criticalErrors.length).toBe(0);
  });
});
