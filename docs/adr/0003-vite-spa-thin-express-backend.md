# ADR 0003 — Vite + React-Router SPA with a thin Express backend

- Status: Accepted
- Date: 2026-06-19

## Context

The app was a Next.js application that was `force-dynamic` on every route (no
SSR/ISR benefit) and ~90% `"use client"` — an SPA wearing a Next costume. None
of the 15 server actions needed the service-role key for their *write*; they
were RLS-scoped writes using the user session. The Next server earned its keep
only for a handful of things a browser must not do.

A code audit classified the server surface:

- **Editorial writes (15)** — RLS-scoped writes on the user session. Client-able
  on their own, **but** each calls `logAudit()`, which writes `audit_log` via the
  **service-role** (no insert policy, for audit integrity). So the write is
  client-able; the audit is not.
- **API routes that must stay server-side** — `/api/upload` (service-role Storage
  write to `kb-images`), `/api/ask` (LLM + embeddings secrets), `/api/[transport]`
  (MCP, static bearer + service-role writes), and the `/auth/callback` editorial-
  role sync (service-role elevation from Keycloak groups).
- **Movable to the client** — `/api/search` and `/api/track` (analytics inserts),
  given an insert RLS policy.

Moving to Vite + react-router aligns the app with `intervention-client` (Vite +
RR7) and drops the Next server overhead. The open question was **where audited
writes and secret-bearing endpoints live** once Next is gone.

## Decision

**Frontend:** Vite + React 19 + react-router 7 SPA, Tailwind v4 via
`@tailwindcss/vite`, served under base path `/knowledge-base`. Client config
reads `VITE_*` via `import.meta.env` (see `src/lib/config.ts`).

**Backend (the fork): Topology A — a thin Express backend in this repo.** One
container runs both the built SPA (static + history fallback) and the API. The
backend hosts:

- the 15 editorial writes, keeping `logAudit()` service-role audit integrity;
- the secret-bearing endpoints: `/api/upload`, `/api/ask`, `/api/mcp`,
  `/api/auth/*` (Keycloak group → editorial-role sync);
- the analytics endpoints `/api/search`, `/api/track`.

See `server/index.ts` (mounts everything under `${BASE_PATH}/api`, serves `dist/`)
and `src/spa/data/writes.ts` (the typed client calling `/api/admin/*`).

This was chosen over the alternatives because it is the most faithful port: it
preserves the audit model and the security boundary unchanged, with the least
new conceptual surface. Writes keep going through one place that owns the audit
trail.

## Alternatives considered

- **B. Direct-to-Supabase writes + minimal secret backend** — writes go
  client→Supabase; audit moves to a DB trigger or insert RLS policy. Least backend
  code, but changes the audit model (the part most sensitive for gated pharma
  content) at the same time as the framework. Rejected: too much change at once.
- **C. Fold the KB backend into `fe-node-services`** — the existing Express
  service hosts the KB API; one fewer deployable. Attractive for consolidation but
  couples this app's cutover to another service's release cadence. Deferred — A
  does not preclude C later (the routes are already plain Express routers).

## Consequences

- One container serves SPA + API under `/knowledge-base` (see `Dockerfile`); no
  Next runtime.
- The audit boundary stays exactly where it was — service-role writes to
  `audit_log` behind the backend.
- Env vars moved from `NEXT_PUBLIC_*` to `VITE_*`; server-only secrets
  (`SUPABASE_SERVICE_ROLE_KEY`, `MCP_API_TOKEN`, LLM/embeddings, Keycloak logout)
  live only in the backend env, never in the Vite bundle.
- `next`, `next.config.ts`, `app/`, and `proxy.ts` are removed; route guarding is
  a react-router `<ProtectedRoute>` + `supabase.auth.getSession()`.

## Reversal trigger

If operating a second Express deployable proves not worth it, fold the API into
`fe-node-services` (Topology C) — the routers are already framework-agnostic
Express. Revisit the audit model (Topology B) only as a separate, deliberate
change, not as a side effect of hosting.
