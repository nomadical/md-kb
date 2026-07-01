# ADR 0002 — Authenticate with GoTrue (email/password + magic-link), OAuth optional

- Status: Accepted
- Builds on [ADR 0001](0001-supabase.md) (we keep Supabase; this fixes *how* it
  authenticates).

## Context

A self-hostable, plug-and-play knowledge base can't assume any particular
identity provider. It has to work the moment someone clones it — no SSO tenant,
no OAuth app registration, no IdP to stand up first. At the same time, teams that
*do* have an IdP should be able to wire it in without code changes.

Supabase ships **GoTrue**, which already handles email/password, passwordless
magic-links, sessions, password reset, and a list of OAuth providers. The
decision is how much of that to use and what to expose by default.

## Decision

**Default to GoTrue email/password + magic-link; make OAuth opt-in via config.**

- A shared `AuthPanel` component renders email/password and magic-link sign-in,
  used by both the `/login` page and the in-app sign-in modal.
- **OAuth is configuration, not code.** `VITE_OAUTH_PROVIDERS` (e.g.
  `github,google`) lists the providers to surface; the matching buttons render
  only when set, and the provider must also be enabled in the Supabase project.
  Email/password + magic-link always work regardless.
- **Sign-up visibility** is a flag: `VITE_ALLOW_SIGNUP=false` hides the in-app
  "create account" option for curated/demo instances. The real boundary is the
  Supabase dashboard's sign-up setting; the flag only hides UI.
- **Bootstrapping:** the first account to sign up is promoted to `admin`; the
  default role for subsequent users is an admin setting.

Sessions are cookie-based via `@supabase/ssr`. `auth.uid()` resolves to the
GoTrue user id, which keys `profiles`, drafts, and audit rows.

## Alternatives considered

- **Require an external IdP (OIDC/SSO) out of the box** — rejected: defeats
  plug-and-play; most self-hosters have no IdP, and forcing one is a large setup
  cost before the app does anything.
- **OAuth-only (no password/magic-link)** — rejected: same problem; also makes
  local development and demos depend on a third-party app registration.
- **Hand-rolled auth** — rejected per [ADR 0001](0001-supabase.md): reuse GoTrue
  rather than reimplement sessions and token refresh.

## Consequences

- Clone → set Supabase env → sign in. No IdP prerequisite.
- Adding SSO later is a config + dashboard change, not a code change.
- Editorial and entitlement authorization remain in Postgres RLS (ADR 0001),
  independent of which sign-in method a user used.

## Reversal trigger

If a deployment needs claims-based authorization straight from an external IdP
token (bypassing a GoTrue session), revisit using PostgREST third-party-auth
(JWKS validation of the IdP token) — but keep email/magic-link as the zero-config
default.
