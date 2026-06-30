/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SITE_URL?: string;
  readonly VITE_ENABLE_EMAIL_LOGIN?: string;
  readonly VITE_KEYCLOAK_AUTO_SSO?: string;
  readonly VITE_KEYCLOAK_LOGOUT_URL?: string;
  readonly VITE_KEYCLOAK_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
