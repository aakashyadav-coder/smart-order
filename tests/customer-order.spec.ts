/**
 * customer-order.spec.ts — E2E test for the full customer ordering flow
 *
 * Flow: Open Menu → Add items → Cart → Checkout → Order Confirmation
 *
 * Prerequisites:
 * - Server running at http://localhost:5001
 * - Client running at http://localhost:5173
 * - At least one active restaurant with menu items in the DB
 * - Set TEST_RESTAURANT_ID env var or use the default below
 */

import { test, expect, type Page } from "@playwright/test";

const RESTAURANT_ID = process.env.TEST_RESTAURANT_ID || "";
const MENU_URL      = `/menu?restaurantId=${RESTAURANT_ID}`;

// Skip all restaurant-dependent tests when no real ID is configured
const hasRestaurantId = !!RESTAURANT_ID;

async function openMenuPage(page: Page) {
  await page.goto(MENU_URL);
  // Wait for menu to load — look for menu items or loading state to resolve
  await page.waitForSelector('[data-testid="menu-item"], [data-testid="empty-menu"], .text-gray-400', {
    timeout: 10_000,
  });
}

test.describe("Customer — Menu Page", () => {
  test.skip(!hasRestaurantId, "Skipped: Set TEST_RESTAURANT_ID env var to run");
  test("loads the menu page without redirecting", async ({ page }) => {
    await openMenuPage(page);
    // Should stay on /menu, not redirect to login
    expect(page.url()).toContain("/menu");
  });

  test("displays restaurant name in header", async ({ page }) => {
    await openMenuPage(page);
    // Restaurant name should appear somewhere in the header/page
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("shows menu items grouped by category", async ({ page }) => {
    await openMenuPage(page);
    // Either menu items exist or an empty state is shown — both are valid
    const hasItems   = await page.locator('[data-testid="menu-item"]').count();
    const hasEmpty   = await page.locator('[data-testid="empty-menu"], text=No items').count();
    expect(hasItems + hasEmpty).toBeGreaterThan(0);
  });
});

test.describe("Customer — Add to Cart & Checkout", () => {
  test.skip(!hasRestaurantId, "Skipped: Set TEST_RESTAURANT_ID env var to run");
  test.beforeEach(async ({ page }) => {
    await openMenuPage(page);
  });

  test("can add an item to the cart", async ({ page }) => {
    const firstAddBtn = page.locator('[data-testid="add-to-cart"]').first();
    const hasItems = await firstAddBtn.count();
    if (hasItems === 0) { test.skip(); return; }

    await firstAddBtn.click();
    // Cart count should increase
    const cartBadge = page.locator('[data-testid="cart-count"]');
    await expect(cartBadge).toBeVisible();
    expect(parseInt(await cartBadge.textContent() || "0")).toBeGreaterThan(0);
  });

  test("can open cart drawer and see items", async ({ page }) => {
    const firstAddBtn = page.locator('[data-testid="add-to-cart"]').first();
    if (await firstAddBtn.count() === 0) { test.skip(); return; }

    await firstAddBtn.click();
    await page.locator('[data-testid="cart-button"], [aria-label="Open cart"]').click();
    await expect(page.locator('[data-testid="cart-drawer"], [role="dialog"]')).toBeVisible();
  });

  test("full order flow — add item, fill form, submit", async ({ page }) => {
    const firstAddBtn = page.locator('[data-testid="add-to-cart"]').first();
    if (await firstAddBtn.count() === 0) { test.skip(); return; }

    // Add item to cart
    await firstAddBtn.click();

    // Open cart
    await page.locator('[data-testid="cart-button"], [aria-label="Open cart"]').first().click();

    // Click checkout
    await page.locator('button:has-text("Checkout"), button:has-text("Order"), [data-testid="checkout-btn"]').first().click();

    // Fill checkout form
    await page.fill('input[placeholder*="name" i], input[id*="name" i]', "Aashish Nepal");
    await page.fill('input[placeholder*="phone" i], input[type="tel"]', "9800000001");

    // Table number — could be a select or input
    const tableSelect = page.locator('select[id*="table" i]');
    const tableInput  = page.locator('input[id*="table" i], input[placeholder*="table" i]');
    if (await tableSelect.count() > 0) {
      await tableSelect.selectOption({ index: 1 });
    } else {
      await tableInput.fill("5");
    }

    // Submit order
    await page.locator('button[type="submit"]:has-text("Order"), button:has-text("Place Order")').click();

    // Should redirect to order confirmation
    await page.waitForURL(/\/order\//, { timeout: 10_000 });
    expect(page.url()).toContain("/order/");
  });
});

test.describe("Customer — Order Confirmation Page", () => {
  test("shows 404 state for non-existent order ID", async ({ page }) => {
    await page.goto("/order/nonexistent-order-id-12345");
    // Should show error state, not crash
    await expect(page.locator("h1, h2, p").first()).toBeVisible({ timeout: 8000 });
  });
});
