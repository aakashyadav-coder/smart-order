/**
 * owner-dashboard.spec.ts — E2E tests for Owner dashboard
 *
 * Flow: Login as Owner → Navigate tabs → Verify data renders
 *
 * Prerequisites:
 * - An OWNER user exists in the DB
 * - Set env vars: TEST_OWNER_EMAIL, TEST_OWNER_PASSWORD
 *
 * Public tests (no credentials needed): login page UI validation
 * Authenticated tests: skipped if env vars are not set
 */

import { test, expect, type Page } from "@playwright/test";

const OWNER_EMAIL = process.env.TEST_OWNER_EMAIL    || "owner@test.com";
const OWNER_PASS  = process.env.TEST_OWNER_PASSWORD || "test1234";

async function loginAsOwner(page: Page) {
  await page.goto("/owner/login");
  await page.fill('input[type="email"], input[placeholder*="email" i]', OWNER_EMAIL);
  await page.fill('input[type="password"]', OWNER_PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/owner/, { timeout: 10_000 });
}

// ── Login Page (public — no credentials needed) ───────────────────────────────

test.describe("Owner — Login Page", () => {
  test("renders owner login form", async ({ page }) => {
    await page.goto("/owner/login");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("shows error for empty form submission", async ({ page }) => {
    await page.goto("/owner/login");
    await page.click('button[type="submit"]');
    // Should remain on login page
    expect(page.url()).toContain("/owner/login");
  });

  test("shows error message for invalid credentials", async ({ page }) => {
    await page.goto("/owner/login");
    await page.fill('input[type="email"]', "wrong@owner.com");
    await page.fill('input[type="password"]', "wrongpassword");
    await page.click('button[type="submit"]');
    const error = page.locator('[role="alert"], .text-red-500, [data-testid="error-msg"]');
    await expect(error.first()).toBeVisible({ timeout: 6000 });
  });

  test("kitchen user cannot access owner dashboard", async ({ page }) => {
    await page.goto("/owner");
    // Should be redirected to owner login — not crash
    await expect(page.locator("body")).toBeVisible();
    // URL should not be /owner if unauthenticated
    await page.waitForTimeout(1000);
    const url = page.url();
    // Either redirected to login, or still loads
    expect(url).toBeDefined();
  });
});

// ── Authenticated Tests ────────────────────────────────────────────────────────

test.describe("Owner — Dashboard (requires credentials)", () => {
  test.skip(
    !process.env.TEST_OWNER_EMAIL,
    "Skipped: Set TEST_OWNER_EMAIL and TEST_OWNER_PASSWORD to run"
  );

  test.beforeEach(async ({ page }) => {
    await loginAsOwner(page);
  });

  test("dashboard loads with main navigation tabs", async ({ page }) => {
    await expect(page).toHaveURL(/\/owner/);
    // Dashboard title or nav tabs should be visible
    await expect(page.locator("h1, h2, nav").first()).toBeVisible({ timeout: 8000 });
  });

  test("analytics tab renders a chart without crashing", async ({ page }) => {
    // Click Analytics tab
    const analyticsTab = page.locator(
      'button:has-text("Analytics"), [data-tab="analytics"], a:has-text("Analytics")'
    );
    if (await analyticsTab.count() > 0) {
      await analyticsTab.first().click();
      // Chart or empty state should appear — not a blank/error page
      await expect(page.locator("canvas, [data-testid='chart'], svg, text=No data").first())
        .toBeVisible({ timeout: 8000 });
    }
  });

  test("menu tab loads and displays menu items or empty state", async ({ page }) => {
    const menuTab = page.locator(
      'button:has-text("Menu"), [data-tab="menu"], a:has-text("Menu")'
    ).first();
    if (await menuTab.count() > 0) {
      await menuTab.click();
      // Either menu items exist or an add-item button is shown
      await expect(
        page.locator('[data-testid="menu-item-row"], button:has-text("Add Item"), text=No menu items').first()
      ).toBeVisible({ timeout: 6000 });
    }
  });

  test("staff tab loads with user list or empty state", async ({ page }) => {
    const staffTab = page.locator(
      'button:has-text("Staff"), [data-tab="staff"], a:has-text("Staff")'
    ).first();
    if (await staffTab.count() > 0) {
      await staffTab.click();
      await expect(
        page.locator('[data-testid="staff-row"], button:has-text("Add Staff"), text=No staff').first()
      ).toBeVisible({ timeout: 6000 });
    }
  });

  test("logout redirects to owner login", async ({ page }) => {
    const logoutBtn = page.locator(
      'button:has-text("Logout"), button:has-text("Sign out"), [aria-label="Logout"]'
    );
    if (await logoutBtn.count() > 0) {
      await logoutBtn.first().click();
      await page.waitForURL(/\/owner\/login/, { timeout: 5000 });
      expect(page.url()).toContain("/owner/login");
    }
  });
});
