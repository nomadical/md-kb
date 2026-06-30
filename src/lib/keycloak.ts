// Helpers to pull entitlement roles out of a Keycloak token.
//
// After a Supabase OAuth sign-in, `session.provider_token` is the provider's
// access token. The SkyCell `secure` realm carries the user's entitlements in
// the **`groups`** claim (this mirrors the Intervention client, which reads
// `keycloak.tokenParsed.groups`). We also fall back to `realm_access.roles` /
// `resource_access.<client>.roles` in case a deployment maps them there.
//
// We decode the JWT (no verification needed — Supabase already authenticated the
// user) and keep only UPPER_SNAKE_CASE entitlement names (e.g. ASSET_MANAGEMENT),
// dropping Keycloak defaults like `offline_access` / `default-roles-*`.

import type { Role } from "@/lib/types";

// Keycloak groups that grant an editorial tier in md-kb. Highest match wins.
// Extend this to also elevate e.g. CUSTOMER_ADMIN_INTERVENTION -> "editor" or a
// dedicated group -> "reviewer".
export const KEYCLOAK_EDITORIAL_MAP: Record<string, Role> = {
  SKYMIND_ADMIN: "admin",
};

const ROLE_RANK: Record<Role, number> = {
  admin: 4,
  editor: 3,
  reviewer: 2,
  viewer: 1,
};

/** Highest editorial role granted by the user's Keycloak groups, or null. */
export function editorialRoleFromGroups(roles: string[]): Role | null {
  let best: Role | null = null;
  for (const r of roles) {
    const mapped = KEYCLOAK_EDITORIAL_MAP[r];
    if (mapped && (best === null || ROLE_RANK[mapped] > ROLE_RANK[best])) {
      best = mapped;
    }
  }
  return best;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(b64, "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

const ENTITLEMENT_RE = /^[A-Z][A-Z0-9_]+$/;

// Keycloak group claims can come back as full paths ("/ASSET_MANAGEMENT");
// the Intervention client uses bare names, so strip a leading slash.
const norm = (s: string) => s.replace(/^\//, "").trim();

export function extractKeycloakRoles(
  providerToken: string | null | undefined,
): string[] {
  if (!providerToken) return [];
  const payload = decodeJwtPayload(providerToken);
  if (!payload) return [];

  const roles = new Set<string>();

  // Primary source: the `groups` claim (Group Membership mapper).
  const groups = payload.groups as string[] | undefined;
  groups?.forEach((g) => roles.add(norm(g)));

  // Fallbacks: realm + client roles.
  (payload.realm_access as { roles?: string[] } | undefined)?.roles?.forEach(
    (r) => roles.add(norm(r)),
  );
  const resources = payload.resource_access as
    | Record<string, { roles?: string[] }>
    | undefined;
  if (resources) {
    for (const client of Object.values(resources)) {
      client.roles?.forEach((r) => roles.add(norm(r)));
    }
  }

  // Keep only entitlement-style names (UPPER_SNAKE_CASE).
  return [...roles].filter((r) => ENTITLEMENT_RE.test(r));
}
