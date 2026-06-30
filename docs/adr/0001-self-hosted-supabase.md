# ADR 0001 — Keep Supabase, self-hosted on SkyCell infrastructure

- Status: Accepted
- Date: 2026-06-08

## Context

md-kb's defining feature is **role-based article visibility** for internal,
compliance-sensitive (pharma cold-chain) content. We questioned whether Supabase
is needed, given we already run Keycloak and our own Postgres, and self-host on
the `fe-node-services` stack.

Two distinct questions were conflated:

1. Do we need **supabase.com (the SaaS)**? — No.
2. Do we need the **Supabase architecture** (Postgres + PostgREST + GoTrue + RLS)?
   — Yes; it is load-bearing.

What the app actually relies on:

- **RLS is the security boundary.** Visibility is enforced in the database, so it
  holds regardless of an application bug.
- **PostgREST is an unwritten backend.** The browser issues RLS-filtered queries
  directly (⌘K search, feedback/view inserts, user admin).
- **GoTrue brokers Keycloak OAuth** + sessions (verified working against the
  `secure` realm).

## Decision

**Keep Supabase, self-hosted on SkyCell infrastructure** (not the SaaS, not
removed). The only strong objection — internal data + tokens in a third-party US
cloud — is about *hosting*, not the *architecture*; self-hosting resolves it
while keeping RLS in the database.

The application code does not change: production simply points the same env vars
at a self-hosted instance. See `deploy/supabase/` and its `RUNBOOK.md`.

## Alternatives considered

- **Hosted supabase.com** — rejected: data-residency/compliance risk.
- **Drop Supabase; plain Postgres + hand-rolled Keycloak OIDC** — rejected:
  moves the security boundary into app code and requires reimplementing OIDC,
  sessions, and a PostgREST-equivalent API. High risk for gated pharma content,
  and counter to the "reuse mature OSS / keep it simple" brief.

## Consequences

- One additional operated OSS stack (trimmed to db/auth/rest/meta/studio/kong).
- Security boundary stays in Postgres RLS — auditable, app-independent.
- First-party domain (`supabase.<env>.skymind.com`), same network as Keycloak.

## Reversal trigger

If ops refuses to operate the Supabase stack **and** a blessed pattern exists for
Keycloak-token-validating Node services sharing a Postgres, revisit — but keep
visibility in Postgres RLS via a per-request role GUC, not in app code.
