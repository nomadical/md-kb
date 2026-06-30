// Server env. Reuses the existing names so the same .env works for Next + the
// new Express backend during the migration.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
export const PORT = Number(process.env.PORT ?? 3005);
// Where the built SPA lives (served in production). Vite outputs to ./dist.
export const DIST_DIR = process.env.KB_DIST_DIR ?? "dist";
export const BASE_PATH = "/knowledge-base";
// MCP remote connector: static bearer gate + public site URL for draft links.
export const MCP_API_TOKEN = process.env.MCP_API_TOKEN ?? "";
export const SITE_URL = (
  process.env.KB_SITE_URL ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  ""
).replace(/\/$/, "");
