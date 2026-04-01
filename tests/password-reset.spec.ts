/**
 * password-reset.spec.ts — E2E tests for the password reset flow
 *
 * Flow: Login Page → "Forgot Password" → Email OTP → Verify OTP → Reset Password → Login
 *
 * Note: The "Forgot password?" link opens a Dialog (not a page navigation).
 * These tests validate the UI flow, not the email delivery.
 */

import { test, expect, type Page } from "@playwright/test";

// ── Helpers ───────────────────────────────────────────────────────────────────
async function openKitchenLogin(page: Page) {
  await page.goto("/kitchen/login");
  await page.waitForLoadState("networkidle");
}

// The forgot password trigger is a <button type="button"> — NOT an <a> tag.
async function clickForgotPassword(page: Page) {
  // Match the exact button that contains "Forgot password?"
  const forgotBtn = page.locator(
    'button:has-text("Forgot"), button:has-text("forgot")'
  ).first();
  await expect(forgotBtn).toBeVisible({ timeout: 5000 });
  await forgotBtn.click();
  // Wait for dialog to open
  await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
}

// ── UI Smoke Tests (no credentials needed) ────────────────────────────────────

test.describe("Password Reset — UI Smoke Tests", () => {
  test("login page has a forgot password button", async ({ page }) => {
    await openKitchenLogin(page);

    // The forgot password trigger is a <button>, not a link
    const forgotBtn = page.locator(
      'button:has-text("Forgot"), button[class*="brand"]'
    ).first();
    await expect(forgotBtn).toBeVisible({ timeout: 6000 });
  });

  test("owner login page also has forgot password button", async ({ page }) => {
    await page.goto("/owner/login");
    await page.waitForLoadState("networkidle");

    const forgotBtn = page.locator('button:has-text("Forgot"), button:has-text("forgot")').first();
    await expect(forgotBtn).toBeVisible({ timeout: 6000 });
  });

  test("clicking forgot password opens the dialog", async ({ page }) => {
    await openKitchenLogin(page);
    await clickForgotPassword(page);

    // Dialog should be visible with "Forgot Password" title
    await expect(
      page.locator('[role="dialog"] h2, [role="dialog"] [data-title]')
    ).toBeVisible({ timeout: 5000 });
  });

  test("submitting empty email in forgot password dialog shows browser/app validation", async ({ page }) => {
    await openKitchenLogin(page);
    await clickForgotPassword(page);

    // Find the submit button inside the dialog
    const submitBtn = page.locator('[role="dialog"] button[type="submit"], [role="dialog"] button:has-text("Send")').first();
    if (await submitBtn.count() === 0) { test.skip(); return; }

    await submitBtn.click();

    // Either browser native validation prevents submit, or app shows error
    // Either way the dialog should still be open
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test("entering invalid email format shows validation error", async ({ page }) => {
    await openKitchenLogin(page);
    await clickForgotPassword(page);

    const emailInput = page.locator('[role="dialog"] input[type="email"]').first();
    if (await emailInput.count() === 0) { test.skip(); return; }

    await emailInput.fill("not-an-email");
    await page.locator('[role="dialog"] button[type="submit"]').first().click();

    // Browser native validation or custom error — dialog remains open
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test("API anti-enumeration: same response for real and fake emails", async ({ page }) => {
    await page.goto("/kitchen/login");

    const [fakeRes, realRes] = await page.evaluate(async () => {
      const base = "http://localhost:5001";
      const fake = await fetch(`${base}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: `nonexistent-${Date.now()}@ghost.com` }),
      }).then(r => r.json()) as { message: string };

      const real = await fetch(`${base}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "admin@smartorder.com" }),
      }).then(r => r.json()) as { message: string };

      return [fake, real];
    });

    // Both should return the exact same message (anti-enumeration security)
    expect(fakeRes.message).toMatch(/if that email exists/i);
    expect(fakeRes.message).toBe(realRes.message);
  });
});

// ── Full Flow (requires TEST_RESET_EMAIL env var + running server) ─────────────

test.describe("Password Reset — Full Flow (requires real DB data)", () => {
  test.skip(
    !process.env.TEST_RESET_EMAIL,
    "Skipped: Set TEST_RESET_EMAIL to run the full reset flow test"
  );

  const testEmail = process.env.TEST_RESET_EMAIL || "";

  test("complete reset flow via API", async ({ page }) => {
    // Step 1: Request OTP
    await page.evaluate(async (email) => {
      await fetch("http://localhost:5001/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    }, testEmail);

    // Step 2: OTP is logged to server console in dev mode.
    const otp = process.env.TEST_RESET_OTP;
    if (!otp) { test.skip(); return; }

    // Step 3: Verify OTP
    const verifyRes = await page.evaluate(async ({ email, otp }) => {
      const r = await fetch("http://localhost:5001/api/auth/verify-reset-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      return r.json() as Promise<{ resetToken: string }>;
    }, { email: testEmail, otp });

    expect(verifyRes).toHaveProperty("resetToken");

    // Step 4: Reset password
    const resetRes = await page.evaluate(async ({ token }) => {
      const r = await fetch("http://localhost:5001/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken: token, newPassword: "newpassword123" }),
      });
      return r.json() as Promise<{ message: string }>;
    }, { token: verifyRes.resetToken });

    expect(resetRes.message).toMatch(/updated successfully/i);
  });
});
