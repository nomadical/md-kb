/**
 * Centralized config for code shared between the Vite browser bundle and the
 * Node Express server (e.g. src/lib/markdown.ts is imported by both).
 *
 * It must therefore be isomorphic: read Vite's `import.meta.env` in the browser,
 * and fall back to `process.env` (the server sets NEXT_PUBLIC_* at runtime) /
 * sane defaults under Node, where `import.meta.env` is undefined. Reading
 * `import.meta.env.X` directly would throw at server startup.
 */

// `import.meta.env` is a Vite-injected object in the browser, and undefined
// under Node — cast to an optional shape so accessing it never throws.
const viteEnv = (import.meta as { env?: Record<string, string | undefined> }).env;
const nodeEnv: Record<string, string | undefined> | undefined =
  typeof process !== "undefined" ? process.env : undefined;

/** App base path the SPA is served under, without a trailing slash
 *  (e.g. "/knowledge-base"). In the browser this is the Vite `base`
 *  (`import.meta.env.BASE_URL` = "/knowledge-base/"); the server uses the same
 *  fixed base path. */
export const BASE_PATH = (
  viteEnv?.BASE_URL ??
  nodeEnv?.VITE_BASE_PATH ??
  "/"
).replace(/\/$/, "");

/** Supabase project URL and anon key. */
export const SUPABASE_URL =
  viteEnv?.VITE_SUPABASE_URL ?? nodeEnv?.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY =
  viteEnv?.VITE_SUPABASE_ANON_KEY ?? nodeEnv?.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Absolute site URL for OAuth redirects. When empty, callers fall back to the
 *  current origin + BASE_PATH at runtime. */
export const SITE_URL =
  viteEnv?.VITE_SITE_URL ?? nodeEnv?.NEXT_PUBLIC_SITE_URL ?? "";

/** Optional OAuth providers to offer on the login UI (email/password +
 *  magic-link always work). Enable them in the Supabase dashboard, then list
 *  them in VITE_OAUTH_PROVIDERS, e.g. "github,google". */
export const OAUTH_PROVIDERS = (viteEnv?.VITE_OAUTH_PROVIDERS ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);
