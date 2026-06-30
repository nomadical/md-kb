import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// SPA build for the KB app. The base path defaults to "/" and is configurable
// via VITE_BASE_PATH (e.g. "/kb" when mounted behind a prefix). Client config
// reads VITE_* via import.meta.env (see src/lib/config.ts).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const raw = env.VITE_BASE_PATH || "/";
  const base = raw.endsWith("/") ? raw : `${raw}/`; // vite wants a trailing slash
  const apiPort = env.API_PORT || "8787";
  return {
    base,
    plugins: [react(), tailwindcss()],
    resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
    server: {
      port: 5173,
      proxy: {
        [`${base}api`]: {
          target: `http://localhost:${apiPort}`,
          changeOrigin: true,
        },
      },
    },
  };
});