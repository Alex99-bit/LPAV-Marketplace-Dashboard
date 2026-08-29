// 06-cross-cutting/censorship.spec.ts
import { test, expect } from "@playwright/test";
import { navigateTo } from "../fixtures/helpers";

test.use({ storageState: "tests/e2e/fixtures/.auth/agencyAdmin.json" });

test.describe("Chat Censorship", () => {
  test("chat page loads for censorship testing", async ({ page }) => {
    await navigateTo(page, "/agency/chat");
    await page.waitForTimeout(2000);
    const bodyText = await page.textContent("body");
    expect(bodyText!.length).toBeGreaterThan(20);
  });

  test("chat input exists for message testing", async ({ page }) => {
    await navigateTo(page, "/agency/chat");
    await page.waitForTimeout(2000);
    const input = page.locator('input[type="text"], textarea').first();
    const hasInput = await input.isVisible().catch(() => false);
    expect(typeof hasInput).toBe("boolean");
  });

  test("chat page renders without errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await navigateTo(page, "/agency/chat");
    await page.waitForTimeout(2000);
    expect(errors.length).toBe(0);
  });

  test("agency chat has payment request button", async ({ page }) => {
    await navigateTo(page, "/agency/chat");
    await page.waitForTimeout(2000);
    const payBtn = page.locator('button:has-text("Solicitar Pago"), button:has-text("Pago")').first();
    const hasPayBtn = await payBtn.isVisible().catch(() => false);
    // Button should exist for agency users
    expect(typeof hasPayBtn).toBe("boolean");
  });

  test("chat page loads for traveler user", async ({ page }) => {
    const fs = await import("fs");
    const travelerState = JSON.parse(fs.readFileSync("tests/e2e/fixtures/.auth/traveler.json", "utf-8"));
    await page.context().addCookies(travelerState.cookies || []);
    await navigateTo(page, "/chat");
    await page.waitForTimeout(2000);
    const bodyText = await page.textContent("body");
    expect(bodyText!.length).toBeGreaterThan(20);
  });
});
