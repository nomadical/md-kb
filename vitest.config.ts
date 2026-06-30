import path from "node:path";
import { defineConfig } from "vitest/config";

// Unit/integration tests run in jsdom. The `@` alias mirrors vite.config.ts so
// imports resolve the same way in tests as in the app.
export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}", "server/**/*.test.ts"],
  },
});
