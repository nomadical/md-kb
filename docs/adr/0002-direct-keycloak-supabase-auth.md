# ADR 0002 — Trust Keycloak JWTs directly in Supabase (retire the OAuth bridge)

- Status: Proposed (spike)
- Date: 2026-06-16
- Supersedes the auth half of [ADR 0001](0001-self-hosted-supabase.md) (we keep
  self-hosted Supabase; we change *how* it authenticates).

## Context

Authentication is the most complex, most incident-prone subsystem in the KB
ecosystem. Today a user's Keycloak session is converted into a *separate*
Supabase (GoTrue) session, and entitlements are mirrored into a `profiles` row:

- **GoTrue OAuth bridge.** The KB app logs in via GoTrue's Keycloak provider
  (cookie session, `@supabase/ssr`). The embed (`@skycell-ag/kb-react`) can't do
  a top-level redirect, so it runs the OAuth grant in a hidden iframe/popup that
  lands on the host's `/kb-auth` page and `postMessage`s the code back
  (`kb-react/src/auth.ts`, `completeKbAuthRedirect`).
- **Cross-origin allow-list.** Because the embed's `redirectTo` is the *consuming*
  app's origin, every embedding host must be added to `GOTRUE_URI_ALLOW_LIST`
  (the `EMBED_ORIGINS` plumbing in `knowledge-base-app#26` /
  `fe-node-services#36`).
- **Entitlement mirror.** `sync_my_access_roles(text[])` copies the Keycloak
  `groups` claim into `profiles.access_roles` on each login; admin grants live in
  `profiles.manual_access_roles`; the editorial role lives in `profiles.role`
  with `role_source` provenance. RLS reads these via `current_user_role()` /
  `current_user_access_roles()`.

This is a lot of moving parts to express one idea: *"the Keycloak token already
proves who you are and what you can see."* It caused most of this project's
incidents (signInWithIdToken not supporting Keycloak, the iframe grant, the
allow-list, the role-sync RPC ordering).

## Decision (proposed)

Have the Supabase data plane (PostgREST + Storage) **validate the Keycloak
access token directly** and read identity + entitlements from its claims. The
client passes the Keycloak token it already holds; no Supabase session is
minted.

The enabler is shipping already: **`@supabase/supabase-js` 2.107** (both repos)
supports the third-party-auth `accessToken` option:

```ts
createClient(url, anonKey, { accessToken: async () => getKeycloakToken() })
```

PostgREST then trusts that bearer if it's signed by Keycloak.

## What changes

### Supabase stack (`deploy/supabase/docker-compose.yml`)
- **PostgREST** must validate Keycloak's RS256 signature instead of the shared
  HS256 `JWT_SECRET`. Set `PGRST_JWT_SECRET` to the Keycloak realm **JWKS**
  (`https://id.<env>.skymind.com/realms/secure/protocol/openid-connect/certs`)
  and `PGRST_JWT_AUD` to the expected audience.
- **Role claim.** PostgREST maps `PGRST_ROLE_CLAIM_KEY` (default `.role`) to a
  Postgres role. Keycloak tokens have no `role` claim, so add a **hardcoded-claim
  protocol mapper** in the `secure` realm injecting `"role": "authenticated"`
  (the `groups` mapper already exists).
- **GoTrue** is no longer in the request path for the data plane. Keep it only if
  we still want the dev email magic-link fallback; otherwise it can be dropped.
- **`GOTRUE_URI_ALLOW_LIST` / `EMBED_ORIGINS`** become unnecessary — there is no
  OAuth redirect to allow-list. Retire `#26`/`#36`.

### Database / RLS (`supabase/schema.sql` + `migrations.sql`)
- `auth.uid()` resolves from the Keycloak `sub` (a UUID) — no GoTrue user row.
- Read entitlements straight from the token; drop the synced mirror:
  ```sql
  create or replace function public.current_user_access_roles()
  returns text[] language sql stable as $$
    select coalesce(
      array(select jsonb_array_elements_text(auth.jwt()->'groups')), '{}')
      || coalesce((select manual_access_roles from public.profiles where id = auth.uid()), '{}');
  $$;
  ```
- `current_user_role()` (editorial admin/editor/reviewer/viewer) derives from a
  Keycloak group claim, unioned with an admin-pinned override kept in `profiles`.
- **Delete** `sync_my_access_roles`, the synced `profiles.access_roles` column,
  and the `handle_new_user` trigger. `profiles` shrinks to **override-only**
  rows (editorial pin + `manual_access_roles`), created lazily on first admin
  grant — pure read needs no profile row at all.

### Embed — `@skycell-ag/kb-react`  (the big win)
- `createKbClient`: `createClient(url, anon, { accessToken: () => getKeycloakToken() })`.
- **Delete** `src/auth.ts` (the iframe/popup grant), `ensureSupabaseSession`,
  `completeKbAuthRedirect`, `getAuthUrl`, the `sync_my_access_roles` RPC call,
  and the `redirectTo`/`silentTimeoutMs`/`persistSession` config.
- `KbProvider` loses `redirectTo`; consumers stop needing a `/kb-auth` route.

### Consumers — `intervention-client`
- Delete `KbAuthCallback` + the public `/kb-auth` route; `KnowledgePage` already
  has `getKeycloakToken: () => token`, which becomes the *only* auth wiring.

### KB app (Next.js, `@supabase/ssr`) — the harder half
- The app uses cookie GoTrue sessions via `createServerClient`/`createBrowserClient`.
  Moving it to pass the Keycloak token (from `keycloak-js`/NextAuth) via the
  `accessToken` option needs verification that `@supabase/ssr` forwards that
  option. **Open question / spike item.**

## What gets deleted (the simplification)

OAuth iframe-popup grant · `/kb-auth` relay · `completeKbAuthRedirect` ·
`GOTRUE_URI_ALLOW_LIST` + `EMBED_ORIGINS` (#26/#36) · `sync_my_access_roles` ·
synced `profiles.access_roles` · `handle_new_user` trigger · `role_source`
provenance complexity · (optionally) GoTrue itself.

Embedding the KB anywhere becomes: *pass the Keycloak token you already have.*

## Risks & open questions

1. **`@supabase/ssr` + `accessToken`** — does the SSR wrapper forward it? If not,
   the KB app needs a thin custom client. (Spike must answer before app cutover.)
2. **Dual-JWT window** — during migration PostgREST can validate only one
   issuer/secret. Plan: stand up trust on a staging stack; cut the embed over
   first (it's isolated), then the app; don't run both auth modes against one
   PostgREST.
3. **Role claim** — the hardcoded `role: authenticated` mapper must be present in
   every realm/env, or PostgREST rejects tokens.
4. **`sub` as `auth.uid()`** — confirm Keycloak `sub` is a stable UUID and that
   existing `profiles`/audit rows (keyed by GoTrue uid) are migrated or
   regenerated.
5. **Token audience/expiry/refresh** — the host refreshes the Keycloak token; the
   `accessToken` getter must always return a fresh one (it does in kb-react).
6. **RLS re-verification** — re-run the rolled-back impersonation harness
   (publish gate + entitlement read/write) against the new claim-sourced
   functions.

## Rollout (flagged, reversible)

1. **Spike** (read-only, this ADR): confirm PostgREST JWKS validation + the
   `accessToken` path on a scratch stack. Answer risks 1 & 4.
2. Add a `kb-react` config flag `authMode: 'bridge' | 'token'` (default `bridge`)
   so the embed can switch without a breaking release.
3. Enable Keycloak-JWKS trust on a **staging** Supabase; migrate the **embed**
   first (lowest blast radius, biggest payoff). Verify RLS.
4. Migrate the **KB app** once risk 1 is resolved.
5. Remove GoTrue (optional), `EMBED_ORIGINS`, `sync_my_access_roles`, and the
   bridge code. Default `authMode` to `token`.
6. **Rollback:** flip `authMode` back to `bridge` and restore `PGRST_JWT_SECRET`;
   the bridge code stays until step 5 is proven.

## Verification

- Scratch stack: `curl` PostgREST with a real Keycloak access token →
  RLS-filtered rows; with a tampered/expired token → 401.
- Impersonation harness (as in the publish-gate/entitlement tests) against the
  claim-sourced `current_user_*` functions.
- Embed e2e: `intervention.dev.validaide.com/knowledge` reads entitled content
  with **no** `/kb-auth` round-trip.
