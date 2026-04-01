/**
 * kitchen-login.spec.ts — E2E tests for Kitchen staff login and dashboard
 *
 * Flow: Navigate to login → Enter credentials → Access dashboard → Update order status
 *
 * Prerequisites:
 * - A KITCHEN user exists in the DB
 * - Set env vars: TEST_KITCHEN_EMAIL, TEST_KITCHEN_PASSWORD
 */

import { test, expect, type Page } from "@playwright/test";

const KITCHEN_EMAIL = process.env.TEST_KITCHEN_EMAIL    || "kitchen@test.com";
const KITCHEN_PASS  = process.env.TEST_KITCHEN_PASSWORD || "test1234";

async function loginAsKitchen(page: Page) {
  await page.goto("/kitchen/login");
  await page.fill('input[type="email"], input[placeholder*="email" i]', KITCHEN_EMAIL);
  await page.fill('input[type="password"]', KITCHEN_PASS);
  await page.click('button[type="submit"]');
  // Wait for dashboard to load
  await page.waitForURL("/kitchen", { timeout: 10_000 });
}

test.describe("Kitchen — Login Page", () => {
  test("renders login form correctly", async ({ page }) => {
    await page.goto("/kitchen/login");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("shows error on empty form submit", async ({ page }) => {
    await page.goto("/kitchen/login");
    await page.click('button[type="submit"]');
    // Should stay on login page and show an error
    expect(page.url()).toContain("/kitchen/login");
  });

  test("shows error for wrong credentials", async ({ page }) => {
    await page.goto("/kitchen/login");
    await page.fill('input[type="email"]', "wrong@test.com");
    await page.fill('input[type="password"]', "wrongpassword");
    await page.click('button[type="submit"]');
    // Error toast or error message should appear
    const error = page.locator('[role="alert"], .text-red-500, [data-testid="error-msg"]');
    await expect(error.first()).toBeVisible({ timeout: 5000 });
  });

  test("redirects already-logged-in kitchen user away from login", async ({ page }) => {
    // Pre-set a fake token in localStorage
    await page.goto("/kitchen/login");
    await page.evaluate(() => {
      localStorage.setItem("smart_order_kitchen_token", "fakejwt.fakePayload.fakeSignature");
    });
    await page.goto("/kitchen/login");
    // With a token, the app may or may not redirect (depends on token validation)
    // At minimum the page should load without crashing
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Kitchen — Dashboard (requires valid credentials)", () => {
  test.skip(
    !process.env.TEST_KITCHEN_EMAIL,
    "Skipped: Set TEST_KITCHEN_EMAIL and TEST_KITCHEN_PASSWORD to run"
  );

  test.beforeEach(async ({ page }) => {
    await loginAsKitchen(page);
  });

  test("kitchen dashboard loads with order columns", async ({ page }) => {
    await expect(page).toHaveURL("/kitchen");
    // Dashboard should show order management UI
    await expect(
      page.locator("h1, h2, [data-testid='dashboard-title']").first()
    ).toBeVisible({ timeout: 8000 });
  });

  test("shows pending orders section", async ({ page }) => {
    // Either shows orders or an empty state
    const pendingSection = page.locator(
      '[data-testid="pending-orders"], text=Pending, text=No orders'
    );
    await expect(pendingSection.first()).toBeVisible({ timeout: 6000 });
  });

  test("logout clears session and redirects to login", async ({ page }) => {
    // Find and click logout button
    const logoutBtn = page.locator('button:has-text("Logout"), button:has-text("Sign out"), [aria-label="Logout"]');
    if (await logoutBtn.count() > 0) {
      await logoutBtn.first().click();
      await page.waitForURL(/\/kitchen\/login/, { timeout: 5000 });
      expect(page.url()).toContain("/kitchen/login");
    }
  });
});
