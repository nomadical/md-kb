import type { Request } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Role } from "../src/lib/types";
import { userClient } from "./supabase";

export type Actor = {
  token: string;
  userId: string;
  email: string | null;
  role: Role;
  /** Supabase client scoped to this user (RLS applies). */
  supabase: SupabaseClient;
};

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function bearer(req: Request): string | null {
  const h = req.header("authorization") ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1].trim() : null;
}

/** Resolve the caller from the bearer token: validates the session and loads the
 *  editorial role. Throws HttpError(401) if not signed in. */
export async function getActor(req: Request): Promise<Actor> {
  const token = bearer(req);
  if (!token) throw new HttpError(401, "Not signed in");
  const supabase = userClient(token);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new HttpError(401, "Not signed in");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  return {
    token,
    userId: user.id,
    email: user.email ?? null,
    role: (profile?.role as Role) ?? "viewer",
    supabase,
  };
}

/** Require one of the given roles; throws HttpError(403) otherwise. */
export async function requireRole(req: Request, ...roles: Role[]): Promise<Actor> {
  const actor = await getActor(req);
  if (!roles.includes(actor.role)) {
    throw new HttpError(403, "Forbidden: insufficient role");
  }
  return actor;
}
