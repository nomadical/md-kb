import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY, SERVICE_ROLE_KEY } from "./env";

/**
 * Supabase client scoped to the caller's access token: every query runs under
 * the user's RLS, exactly as the Next server actions did via the session cookie.
 */
export function userClient(token: string): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

/** Anonymous client (no auth) — RLS sees only public/published rows. Used for
 *  the public Ask endpoint when the caller isn't signed in. */
export function anonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Service-role client (bypasses RLS). For audit writes, storage, role sync,
 *  analytics beacons. Null if the service key isn't configured. */
export function adminClient(): SupabaseClient | null {
  if (!SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
