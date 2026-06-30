import { createClient } from "@/lib/supabase/client";

// Client-side sign-out: end the Supabase session and return to the home page.
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export async function signOut(): Promise<void> {
  await createClient().auth.signOut();
  window.location.href = `${BASE}/`;
}