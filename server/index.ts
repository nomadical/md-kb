import path from "node:path";
import fs from "node:fs";
import express from "express";
import cors from "cors";
import { PORT, DIST_DIR, BASE_PATH } from "./env";
import adminRouter from "./routes/admin";
import askRouter from "./routes/ask";
import mediaRouter from "./routes/media";
import mcpRouter from "./routes/mcp";
import sitemapRouter from "./routes/sitemap";
import { renderShell } from "./html";

// Thin backend for the KB SPA: audited editorial writes + secret-bearing
// endpoints (upload/ask/MCP/auth-sync), and serves the built SPA in production.
// Replaces the Next server. Mounted under /knowledge-base to match the SPA base
// path (and Traefik routing).
const app = express();
app.disable("x-powered-by");
app.use(cors());

const api = `${BASE_PATH}/api`;
app.use(api, express.json({ limit: "1mb" })); // multipart (/upload) is untouched
app.get(`${api}/health`, (_req, res) => res.json({ ok: true }));
app.use(`${api}/admin`, adminRouter);
app.use(`${api}/mcp`, mcpRouter);
app.use(api, askRouter); // POST /ask
app.use(api, mediaRouter); // POST /upload, /track, /search

// SEO endpoints at the domain root, where crawlers expect them.
app.use("/", sitemapRouter);

// Serve the built SPA + history fallback (production). In dev, run Vite (3005)
// with a proxy to this server instead (see vite.config.ts).
const dist = path.resolve(process.cwd(), DIST_DIR);
app.use(BASE_PATH, express.static(dist));
// Cache the shell once; article routes get per-request OG/meta injected.
const indexHtml = (() => {
  try {
    return fs.readFileSync(path.join(dist, "index.html"), "utf8");
  } catch {
    return ""; // dist not built yet (dev) — Vite serves the shell instead.
  }
})();
// Any non-API GET under the base path → index.html (client routing).
app.get(new RegExp(`^${BASE_PATH}(?!/api)(/.*)?$`), async (req, res) => {
  if (!indexHtml) return res.sendFile(path.join(dist, "index.html"));
  const origin = `${req.protocol}://${req.get("host") ?? ""}`;
  res.type("html").send(await renderShell(indexHtml, req.path, origin));
});

app.listen(PORT, () => {
  console.log(`[kb] backend listening on :${PORT} (base ${BASE_PATH})`);
});
