import { createClient } from "@/lib/supabase/client";

// Client-side sign-out (replaces the Next /auth/signout route). Ends the
// Supabase session and, for Keycloak SSO, also ends the shared realm session via
// RP-initiated logout so the next gated page doesn't silently re-authenticate.
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const KC_LOGOUT = import.meta.env.VITE_KEYCLOAK_LOGOUT_URL as string | undefined;
const KC_CLIENT = (import.meta.env.VITE_KEYCLOAK_CLIENT_ID as string) || "md-kb";

export async function signOut(): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const provider = user?.app_metadata?.provider;
  await supabase.auth.signOut();

  const site = `${window.location.origin}${BASE}`;
  if (KC_LOGOUT && provider === "keycloak") {
    const url = new URL(KC_LOGOUT);
    url.searchParams.set("client_id", KC_CLIENT);
    url.searchParams.set("post_logout_redirect_uri", `${site}/`);
    window.location.href = url.toString();
    return;
  }
  window.location.href = `${site}/`;
}
