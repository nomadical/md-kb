/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SITE_URL?: string;
  /** Comma-separated OAuth providers to surface on the login UI, e.g. "github,google". */
  readonly VITE_OAUTH_PROVIDERS?: string;
  /** "false" hides the in-app sign-up option (curated/demo instances). */
  readonly VITE_ALLOW_SIGNUP?: string;
  /** "true" builds the static demo: in-memory data, no Supabase or API server. */
  readonly VITE_DEMO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
