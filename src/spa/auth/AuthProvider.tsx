import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Role } from "@/lib/types";

// Editorial tier, mirroring profiles.role (lib/types Role) in the Supabase schema.
export type EditorialRole = Role;

type AuthState = {
  supabase: SupabaseClient;
  session: Session | null;
  /** Editorial role from the user's profile; null until loaded / for anon. */
  role: EditorialRole | null;
  /** Effective entitlements: Keycloak-synced ∪ admin-granted (manual). */
  accessRoles: string[];
  loading: boolean;
};

const AuthContext = createContext<AuthState | null>(null);

/**
 * SPA replacement for the Next server session (proxy.ts + lib/auth.ts). Tracks
 * the Supabase session client-side and the caller's editorial role for guards.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<EditorialRole | null>(null);
  const [accessRoles, setAccessRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session);
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (active) setSession(next);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  // Load the editorial role + entitlements for the signed-in user (RLS:
  // self-read on profiles).
  useEffect(() => {
    if (!session) {
      setRole(null);
      setAccessRoles([]);
      return;
    }
    let active = true;
    supabase
      .from("profiles")
      .select("role,access_roles,manual_access_roles")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setRole((data?.role as EditorialRole) ?? "viewer");
        setAccessRoles([
          ...new Set([
            ...((data?.access_roles as string[] | null) ?? []),
            ...((data?.manual_access_roles as string[] | null) ?? []),
          ]),
        ]);
      });
    return () => {
      active = false;
    };
  }, [supabase, session]);

  const value = useMemo<AuthState>(
    () => ({ supabase, session, role, accessRoles, loading }),
    [supabase, session, role, accessRoles, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>.");
  return ctx;
}
