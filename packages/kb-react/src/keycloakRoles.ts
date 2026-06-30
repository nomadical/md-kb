// Extract entitlement roles from a Keycloak token, mirroring
// knowledge-base-app/src/lib/keycloak.ts. We decode the JWT (no verification —
// Supabase/Keycloak already authenticated the user) and keep only
// UPPER_SNAKE_CASE entitlement names from the `groups` claim (with realm/client
// role fallbacks). These feed `sync_my_access_roles` so the KB's RLS entitlement
// model works for the host's session.

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    // Browser library: atob is always available. Handle UTF-8 payloads.
    const json = decodeURIComponent(
      atob(b64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join(""),
    );
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

const ENTITLEMENT_RE = /^[A-Z][A-Z0-9_]+$/;
const norm = (s: string) => s.replace(/^\//, "").trim();

export function extractKeycloakRoles(
  token: string | null | undefined,
): string[] {
  if (!token) return [];
  const payload = decodeJwtPayload(token);
  if (!payload) return [];

  const roles = new Set<string>();
  (payload.groups as string[] | undefined)?.forEach((g) => roles.add(norm(g)));
  (payload.realm_access as { roles?: string[] } | undefined)?.roles?.forEach(
    (r) => roles.add(norm(r)),
  );
  const resources = payload.resource_access as
    | Record<string, { roles?: string[] }>
    | undefined;
  if (resources)
    for (const client of Object.values(resources))
      client.roles?.forEach((r) => roles.add(norm(r)));

  return [...roles].filter((r) => ENTITLEMENT_RE.test(r));
}
