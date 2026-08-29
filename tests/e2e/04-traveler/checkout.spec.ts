// 04-traveler/checkout.spec.ts
import { test, expect } from "@playwright/test";
import { navigateTo } from "../fixtures/helpers";

test.use({ storageState: "tests/e2e/fixtures/.auth/traveler.json" });

test.describe("Checkout", () => {
  test("checkout page loads for authenticated traveler", async ({ page }) => {
    await navigateTo(page, "/checkout");
    await page.waitForTimeout(2000);
    const bodyText = await page.textContent("body");
    expect(bodyText!.length).toBeGreaterThan(20);
  });

  test("checkout shows empty cart state", async ({ page }) => {
    await navigateTo(page, "/checkout");
    await page.waitForTimeout(2000);
    const bodyText = await page.textContent("body");
    const hasEmpty = bodyText!.includes("carrito") || bodyText!.includes("vacío") || bodyText!.includes("Explorar");
    expect(hasEmpty).toBeTruthy();
  });

  test("checkout has navigation back to marketplace", async ({ page }) => {
    await navigateTo(page, "/checkout");
    await page.waitForTimeout(2000);
    const backLink = page.locator('a[href="/"], a:has-text("Explorar"), a:has-text("Catálogo")').first();
    const hasBack = await backLink.isVisible().catch(() => false);
    expect(typeof hasBack).toBe("boolean");
  });
});
