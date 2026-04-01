import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/__tests__/helpers/setup.js"],
    // Run tests serially so each test has an isolated DB connection
    pool: "forks",
    poolOptions: {
      forks: { singleFork: true },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.js"],
      exclude: ["src/__tests__/**"],
    },
    // Give async tests enough time (DB ops)
    testTimeout: 15000,
    hookTimeout: 15000,
  },
});
