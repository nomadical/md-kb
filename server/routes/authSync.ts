import { Router } from "express";
import { editorialRoleFromGroups, extractKeycloakRoles } from "../../src/lib/keycloak";
import { getActor } from "../auth";
import { adminClient } from "../supabase";

// Port of the Keycloak role-sync side of /auth/callback. The SPA exchanges the
// OAuth code client-side, then POSTs the provider (Keycloak) token here so the
// privileged editorial-role elevation happens server-side with the service role.
const r = Router();

r.post("/sync-roles", async (req, res) => {
  try {
    const actor = await getActor(req); // 401 if not signed in
    const providerToken = (req.body?.providerToken ?? null) as string | null;
    const roles = extractKeycloakRoles(providerToken);

    // Entitlement roles -> article visibility (safe self-update).
    await actor.supabase.rpc("sync_my_access_roles", { new_roles: roles });

    // Editorial role: Keycloak is authoritative for AUTO-managed roles. Pinned
    // (manual) roles are left untouched. Service-role write — never client-side.
    const admin = adminClient();
    let role = actor.role;
    if (admin) {
      const { data: profile } = await admin
        .from("profiles")
        .select("role_source")
        .eq("id", actor.userId)
        .maybeSingle();
      if (profile?.role_source !== "manual") {
        role = editorialRoleFromGroups(roles) ?? "viewer";
        await admin.from("profiles").update({ role }).eq("id", actor.userId);
      }
    }
    res.json({ ok: true, role });
  } catch (e) {
    const status = (e as { status?: number }).status ?? 500;
    res.status(status).json({ ok: false, error: (e as Error).message });
  }
});

export default r;
