# KB Embed Auth — kill the iframe/popup bridge (OAuth-redirect)

## What changed

The read-only KB embed (`@skycell-ag/kb-react`) used to mint its Supabase session
by running the Keycloak OAuth grant inside a **hidden iframe** (popup fallback) —
the source of the CORS / frame-ancestors / "widget configuration" errors.

`0.3.0` replaces that with a plain **full-page OAuth redirect** through the
Keycloak provider Supabase already has configured. Because the host app is
already Keycloak-SSO'd, the redirect is **silent** (no login prompt): the page
bounces to Keycloak and straight back, supabase-js exchanges the `?code`
(`detectSessionInUrl`), and the session persists in `localStorage`.

## Why this needs no DB migration / no third-party-auth config

It reuses the **existing** `[auth.external.keycloak]` OAuth provider, so a real
GoTrue session is created — `auth.uid()` stays the Supabase user id and
`profiles.id` keeps its `auth.users(id)` link. Nothing about the schema, RLS, or
`sync_my_access_roles` changes. (This is why we did **not** take the third-party
JWT-trust route: the local/self-hosted Supabase `config.toml` only exposes the
named third-party providers — firebase/auth0/cognito/clerk — not a custom
Keycloak issuer.)

## Prerequisites (already true on dev — just confirm)

- `supabase/config.toml` → `[auth.external.keycloak] enabled = true` ✓
  (`client_id`/`secret`/`url` come from `SUPABASE_AUTH_EXTERNAL_KEYCLOAK_*`).
- `auth.additional_redirect_urls` includes the host KB page origin
  (`localhost:3000/**`, `localhost:3005/**` are already listed).
- The Keycloak `md-kb` client allows Supabase's callback
  (`http://127.0.0.1:54321/auth/v1/callback` on dev) — same as the KB app login.

## Verify on dev

1. `supabase start`; run the host (`intervention-client` on :3000, or the KB app).
2. Signed into Keycloak, open the KB (`/knowledge` or the ⌘K launcher).
3. Expected: a brief redirect to Keycloak and back (no prompt) → session set →
   entitled articles load; an anonymous/again-visit loads instantly (session
   persisted). **No** hidden iframe, **no** popup.

## UX note

The first KB use per session does one silent redirect round-trip (the whole host
page navigates and returns). Subsequent uses reuse the persisted session. If that
round-trip is undesirable from the ⌘K launcher, the host can pre-establish the
session on app load instead — out of scope for the library change.
