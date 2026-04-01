import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path  from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals:      true,
    environment:  "jsdom",
    setupFiles:   ["./src/__tests__/setup.js"],
    css:          false,   // skip CSS processing in tests
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include:  ["src/**/*.{js,jsx}"],
      exclude:  ["src/__tests__/**", "src/main.jsx"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
