/**
 * super-admin.spec.ts — E2E tests for the Super Admin portal
 *
 * Flow: Login → Dashboard → Navigate to Restaurants → Create Restaurant → Verify
 *
 * Prerequisites:
 * - A SUPER_ADMIN user exists in the DB
 * - Set env vars: TEST_SA_EMAIL, TEST_SA_PASSWORD
 */

import { test, expect, type Page } from "@playwright/test";

const SA_EMAIL = process.env.TEST_SA_EMAIL    || "superadmin@test.com";
const SA_PASS  = process.env.TEST_SA_PASSWORD || "superadmin123";

async function loginAsSuperAdmin(page: Page) {
  await page.goto("/super/login");
  await page.fill('input[type="email"]', SA_EMAIL);
  await page.fill('input[type="password"]', SA_PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/super(\/|$)/, { timeout: 10_000 });
}

test.describe("Super Admin — Login", () => {
  test("renders super admin login page", async ({ page }) => {
    await page.goto("/super/login");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("shows error for wrong super admin credentials", async ({ page }) => {
    await page.goto("/super/login");
    await page.fill('input[type="email"]', "wrong@super.com");
    await page.fill('input[type="password"]', "wrongpass");
    await page.click('button[type="submit"]');

    const error = page.locator('[role="alert"], .text-red-500, [data-testid="error-msg"]');
    await expect(error.first()).toBeVisible({ timeout: 5000 });
    // Still on login page
    expect(page.url()).toContain("/super/login");
  });

  test("non-super-admin is blocked from /super dashboard", async ({ page }) => {
    // Try navigating to super dashboard without auth
    await page.goto("/super");
    // Should be redirected to super login
    await page.waitForURL(/\/super\/login/, { timeout: 5000 });
    expect(page.url()).toContain("/super/login");
  });
});

test.describe("Super Admin — Dashboard & Navigation", () => {
  test.skip(
    !process.env.TEST_SA_EMAIL,
    "Skipped: Set TEST_SA_EMAIL and TEST_SA_PASSWORD to run"
  );

  test.beforeEach(async ({ page }) => {
    await loginAsSuperAdmin(page);
  });

  test("dashboard loads with KPI cards", async ({ page }) => {
    await expect(page).toHaveURL(/\/super/);
    // KPI cards should be visible: orders, revenue, restaurants, users
    const kpiCards = page.locator('[data-testid="kpi-card"], .text-2xl, .text-3xl');
    await expect(kpiCards.first()).toBeVisible({ timeout: 8000 });
  });

  test("can navigate to Restaurants page", async ({ page }) => {
    const restaurantsLink = page.locator('a:has-text("Restaurants"), nav >> text=Restaurants');
    await restaurantsLink.first().click();
    await expect(page).toHaveURL(/\/super\/restaurants/);
  });

  test("can navigate to Users page", async ({ page }) => {
    const usersLink = page.locator('a:has-text("Users"), nav >> text=Users');
    await usersLink.first().click();
    await expect(page).toHaveURL(/\/super\/users/);
  });

  test("Restaurants page shows restaurant list", async ({ page }) => {
    await page.goto("/super/restaurants");
    await page.waitForLoadState("networkidle");
    // Should show table/list or empty state
    const content = page.locator(
      'table, [data-testid="restaurant-list"], text=No restaurants'
    );
    await expect(content.first()).toBeVisible({ timeout: 8000 });
  });
});

test.describe("Super Admin — Role Escalation Security (Browser)", () => {
  test.skip(
    !process.env.TEST_SA_EMAIL,
    "Skipped: Set TEST_SA_EMAIL and TEST_SA_PASSWORD to run"
  );

  test.beforeEach(async ({ page }) => {
    await loginAsSuperAdmin(page);
  });

  test("API rejects SUPER_ADMIN role assignment via fetch", async ({ page }) => {
    // Attempt to call the API directly with SUPER_ADMIN role
    const response = await page.evaluate(async () => {
      const token = localStorage.getItem("smart_order_sa_token");
      const res = await fetch("http://localhost:5001/api/super/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: "Hacker",
          email: `hacker-${Date.now()}@evil.com`,
          password: "hacked123",
          role: "SUPER_ADMIN",
        }),
      });
      return { status: res.status, body: await res.json() };
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/invalid role/i);
  });
});
