// Server env. Accepts VITE_*-prefixed names (shared .env with the SPA) and
// falls back to the legacy NEXT_PUBLIC_* / KB_* names.
export const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
export const PORT = Number(process.env.PORT ?? process.env.API_PORT ?? 8787);
// Where the built SPA lives (served in production). Vite outputs to ./dist.
export const DIST_DIR = process.env.KB_DIST_DIR ?? "dist";
// App base path the SPA + API are mounted under (default "/"); no trailing slash.
export const BASE_PATH = (process.env.VITE_BASE_PATH ?? "/").replace(/\/$/, "");
// MCP remote connector: static bearer gate + public site URL for draft links.
export const MCP_API_TOKEN = process.env.MCP_API_TOKEN ?? "";
export const SITE_URL = (
  process.env.VITE_SITE_URL ??
  process.env.KB_SITE_URL ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  ""
).replace(/\/$/, "");
