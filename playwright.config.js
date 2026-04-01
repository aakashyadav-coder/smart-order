import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E Configuration for Smart Order
 * Runs against the local dev server (must be started before running tests)
 *
 * Usage:
 *   npx playwright test              # run all tests
 *   npx playwright test --ui         # interactive UI mode
 *   npx playwright test customer-order  # run specific file
 */

export default defineConfig({
  testDir: "./tests",
  timeout:  30_000,   // 30s per test
  retries:  process.env.CI ? 2 : 0,
  workers:  process.env.CI ? 1 : 2,

  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],

  use: {
    baseURL:     "http://localhost:5173",
    trace:       "retain-on-failure",    // Capture trace on failure for debugging
    screenshot:  "only-on-failure",
    video:       "retain-on-failure",
    // Add common headers
    extraHTTPHeaders: {
      "Accept": "application/json",
    },
  },

  projects: [
    {
      name:  "Chromium (Desktop)",
      use:   { ...devices["Desktop Chrome"] },
    },
    {
      name:  "Mobile Chrome",
      use:   { ...devices["Pixel 5"] },
    },
  ],

  // Note: Ensure 'npm run dev' is running in both /server and /client
  // before executing E2E tests.
  // webServer is commented out because dev servers are already running:
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:5173',
  //   reuseExistingServer: true,
  // },
});
