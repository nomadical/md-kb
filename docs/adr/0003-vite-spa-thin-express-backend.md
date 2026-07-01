# ADR 0003 — Vite + React-Router SPA with a thin Express backend

- Status: Accepted

## Context

The app began as a Next.js application that was `force-dynamic` on every route
(no SSR/ISR benefit) and almost entirely `"use client"` — an SPA wearing a Next
costume. Most server actions were RLS-scoped writes on the user session that a
browser could make directly. The Next server earned its keep only for a handful
of things a browser must not do.

A code audit classified the server surface:

- **Editorial writes** — RLS-scoped writes on the user session. Client-able on
  their own, **but** each calls `logAudit()`, which writes `audit_log` via the
  **service-role** (no insert policy, for audit integrity). So the write is
  client-able; the audit is not.
- **Endpoints that must stay server-side** — `/api/upload` (service-role Storage
  write), `/api/ask` (LLM + embeddings secrets), and `/api/mcp` (MCP, static
  bearer + service-role writes).
- **Movable to the client** — `/api/search` and `/api/track` (analytics inserts),
  given an insert RLS policy.

Moving to Vite + react-router drops the Next server overhead. The open question
was **where audited writes and secret-bearing endpoints live** once Next is gone.

## Decision

**Frontend:** Vite + React 19 + react-router 7 SPA, Tailwind v4 via
`@tailwindcss/vite`, served under a configurable base path (`VITE_BASE_PATH`,
default `/`). Client config reads `VITE_*` via `import.meta.env` (see
`src/lib/config.ts`).

**Backend: a thin Express backend in this repo.** One container runs both the
built SPA (static + history fallback) and the API. The backend hosts:

- the editorial writes, keeping `logAudit()` service-role audit integrity;
- the secret-bearing endpoints: `/api/upload`, `/api/ask`, `/api/mcp`;
- the analytics endpoints `/api/search`, `/api/track`.

See `server/index.ts` (mounts everything under `${BASE_PATH}/api`, serves `dist/`)
and `src/spa/data/writes.ts` (the typed client calling `/api/admin/*`).

This was chosen over the alternatives because it is the most faithful port: it
preserves the audit model and the security boundary unchanged, with the least
new conceptual surface. Writes keep going through one place that owns the audit
trail.

## Alternatives considered

- **Direct-to-Supabase writes + minimal secret backend** — writes go
  client→Supabase; audit moves to a DB trigger or insert RLS policy. Least backend
  code, but changes the audit model at the same time as the framework. Rejected:
  too much change at once.
- **Keep Next.js** — rejected: the app used none of Next's SSR/ISR value while
  paying its runtime and build complexity.

## Consequences

- One container serves SPA + API under the base path (see `Dockerfile`); no Next
  runtime.
- The audit boundary stays exactly where it was — service-role writes to
  `audit_log` behind the backend.
- Env vars are `VITE_*` for the client; server-only secrets
  (`SUPABASE_SERVICE_ROLE_KEY`, `MCP_API_TOKEN`, LLM/embeddings) live only in the
  backend env, never in the Vite bundle.
- `next`, `next.config.ts`, `app/`, and the Next proxy are removed; route
  guarding is a react-router `<ProtectedRoute>` + `supabase.auth.getSession()`.

## Reversal trigger

If operating a separate backend proves not worth it, the routes are
framework-agnostic Express and can be folded into another host. Revisit the audit
model (direct-to-Supabase) only as a separate, deliberate change, not as a side
effect of hosting.
