import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/config";

let client: SupabaseClient | undefined;

/**
 * Supabase client for the browser (singleton).
 *
 * `detectSessionInUrl` is disabled: the SPA's /auth/callback exchanges the PKCE
 * code explicitly (exchangeCodeForSession). With auto-detect on, the client
 * created by <AuthProvider> on the callback page also tries to exchange the
 * `?code=`, racing the explicit call and consuming the single-use code verifier
 * first — surfacing "PKCE code verifier not found in storage". One shared
 * instance + explicit exchange keeps the flow deterministic (covers both the
 * Keycloak OAuth and the dev magic-link, which both return to /auth/callback).
 */
export function createClient(): SupabaseClient {
  client ??= createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { detectSessionInUrl: false },
  });
  return client;
}
