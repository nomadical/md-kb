import path from "node:path";
import express from "express";
import cors from "cors";
import { PORT, DIST_DIR, BASE_PATH } from "./env";
import adminRouter from "./routes/admin";
import askRouter from "./routes/ask";
import mediaRouter from "./routes/media";
import authSyncRouter from "./routes/authSync";
import mcpRouter from "./routes/mcp";

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
app.use(`${api}/auth`, authSyncRouter);
app.use(`${api}/mcp`, mcpRouter);
app.use(api, askRouter); // POST /ask
app.use(api, mediaRouter); // POST /upload, /track, /search

// Serve the built SPA + history fallback (production). In dev, run Vite (3005)
// with a proxy to this server instead (see vite.config.ts).
const dist = path.resolve(process.cwd(), DIST_DIR);
app.use(BASE_PATH, express.static(dist));
// Any non-API GET under the base path → index.html (client routing).
app.get(new RegExp(`^${BASE_PATH}(?!/api)(/.*)?$`), (_req, res) => {
  res.sendFile(path.join(dist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`[kb] backend listening on :${PORT} (base ${BASE_PATH})`);
});
