import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// SPA build for the KB app. Served under /knowledge-base. Client config reads
// VITE_* via import.meta.env (see src/lib/config.ts).
export default defineConfig({
  base: "/knowledge-base/",
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  // Dev: SPA on 3005; proxy API calls to the Express backend (run it with
  // `PORT=3006 npm run server:dev`). In prod the backend serves both.
  server: {
    port: 3005,
    proxy: {
      "/knowledge-base/api": {
        target: "http://localhost:3006",
        changeOrigin: true,
      },
    },
  },
});
