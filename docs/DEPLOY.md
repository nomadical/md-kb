# Deploying md-kb behind fe-node-services (`/knowledge-base`)

The app is a **Vite + React-Router SPA with a thin Express backend** (see
[ADR 0003](adr/0003-vite-spa-thin-express-backend.md)). A single container
(`Dockerfile`) runs `server/index.ts`, which serves the built SPA (`dist/`) and
the API under **base path `/knowledge-base`** (`BASE_PATH` in `server/env.ts`,
matching the Vite `base`). It plugs into the existing `fe-node-services` stack,
which is exposed through **Traefik** at `node-services.<env>.skymind.com`. The
container listens on **port 3000** (`Dockerfile` sets `PORT=3000`).

> There is no Next.js, no `next.config.ts`, and no `output: standalone`. The base
> path is owned by the app itself (Vite `base` + the Express mounts), so **no
> StripPrefix middleware is needed** — the app expects the `/knowledge-base`
> prefix on every route, including `/knowledge-base/api/*`.

## Option A — Traefik route (recommended)

No code changes in fe-node-services: add md-kb as a sibling service in
`fe-node-services/docker-compose.yaml` and let Traefik route the path:

```yaml
  knowledge-base:
    image: skycellregistry.azurecr.io/knowledge-base:${KB_IMAGE_VERSION}
    restart: always
    container_name: fe-node-services_kb_1
    environment:
      # Runtime env the Express server reads (server/env.ts). These keep the
      # NEXT_PUBLIC_* names for back-compat even though the client now reads VITE_*.
      - "NEXT_PUBLIC_SUPABASE_URL=https://supabase.${ENV_URL_PREFIX}skymind.com"
      - "NEXT_PUBLIC_SUPABASE_ANON_KEY=${KB_SUPABASE_ANON_KEY}"
      - "NEXT_PUBLIC_SITE_URL=https://node-services.${ENV_URL_PREFIX}skymind.com/knowledge-base"
      - "SUPABASE_SERVICE_ROLE_KEY=${KB_SUPABASE_SERVICE_ROLE_KEY}"
      # Optional: MCP connector + Ask-the-KB (omit to disable those features).
      - "MCP_API_TOKEN=${KB_MCP_API_TOKEN}"
    networks:
      - web
    expose:
      - 3000
    labels:
      - "traefik.enable=true"
      - "traefik.docker.network=web"
      - "traefik.http.routers.knowledge-base.entrypoints=https"
      - "traefik.http.routers.knowledge-base.tls=true"
      - "traefik.http.routers.knowledge-base.tls.certresolver=letsEncrypt"
      - "traefik.http.routers.knowledge-base.rule=Host(`node-services.${ENV_URL_PREFIX}skymind.com`) && PathPrefix(`/knowledge-base`)"
      - "traefik.http.routers.knowledge-base.service=knowledge-base"
      - "traefik.http.services.knowledge-base.loadbalancer.server.port=3000"
```

## Option B — Express endpoint inside fe-node-services

If you'd rather route through `server.ts` (adds a proxy hop):

```ts
// pnpm add http-proxy-middleware
import { createProxyMiddleware } from "http-proxy-middleware";

app.use(
  "/knowledge-base",
  createProxyMiddleware({
    target: process.env.KB_URL ?? "http://fe-node-services_kb_1:3000",
    changeOrigin: true,
    // The base path is expected by the app — don't strip it.
    pathRewrite: (path) => `/knowledge-base${path}`,
  }),
);
```

(The container still needs to be on the same network; Option A is simpler.)

## Build args vs. runtime env (important)

The two halves of the container read config from **different** places — get this
wrong and you ship a blank SPA or a 404-ing backend:

| Consumer | Reads | Set at | Vars |
|---|---|---|---|
| SPA (browser bundle) | `import.meta.env.VITE_*` | **build time** (inlined into `dist/`) | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SITE_URL`, `VITE_KEYCLOAK_LOGOUT_URL` |
| Express backend | `process.env.*` (`server/env.ts`) | **runtime** | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `MCP_API_TOKEN`, `KB_SITE_URL`/`NEXT_PUBLIC_SITE_URL`, `PORT` |

`VITE_*` values are baked into the static bundle and **cannot** be changed
without rebuilding. Server-only secrets (`SUPABASE_SERVICE_ROLE_KEY`,
`MCP_API_TOKEN`, LLM/embeddings) are runtime-only and must **never** be passed as
`VITE_*` build args — that would leak them into the browser bundle.

## Build & push the image

```bash
docker build -t skycellregistry.azurecr.io/knowledge-base:$VERSION \
  --build-arg VITE_SUPABASE_URL=https://supabase.dev.skymind.com \
  --build-arg VITE_SUPABASE_ANON_KEY=<anon-key> \
  --build-arg VITE_SITE_URL=https://node-services.dev.skymind.com/knowledge-base \
  --build-arg VITE_KEYCLOAK_LOGOUT_URL=https://id.dev.skymind.com/realms/secure/protocol/openid-connect/logout \
  .
docker push skycellregistry.azurecr.io/knowledge-base:$VERSION
```

CI normally does this — every push to `main` triggers a `repository_dispatch`
to `SkyCell-AG/fe-node-services`, which owns the Azure OIDC credential, the ACR
push role, and the self-hosted runner (see `.github/workflows/deploy-dev.yml`).

## Production checklist

1. **Supabase (self-hosted)**: per [ADR 0001](adr/0001-self-hosted-supabase.md),
   stand up the trimmed self-hosted stack — follow
   [`deploy/supabase/RUNBOOK.md`](../deploy/supabase/RUNBOOK.md). The schema and
   Keycloak provider are wired there; the local CLI stack is dev-only. The
   stack's Kong gateway is the single public entrypoint and **must be attached to
   the Traefik `web` network** at `supabase.<env>.skymind.com` — if it stops or
   drops off that network, Traefik returns a bare `404 page not found` for every
   `/auth/*` and `/rest/*` path, which breaks both login and article loading.
2. **Keycloak (`md-kb` client in the `secure` realm)**: add the Supabase callback
   `https://supabase.<env>.skymind.com/auth/v1/callback` to *Valid Redirect
   URIs* (keep the Group Membership `groups` mapper; PKCE not enforced).
3. **App env**: build args `VITE_SUPABASE_URL=https://supabase.<env>.skymind.com`,
   `VITE_SUPABASE_ANON_KEY=<ANON_KEY>` (baked into the SPA); runtime
   `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (same values, for
   the backend) plus the secret `SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY>`
   (all from `deploy/supabase/.env`).
4. **Secrets at runtime**: `SUPABASE_SERVICE_ROLE_KEY` (for the Keycloak →
   editorial role sync and audited writes). Never bake it into the image.
5. **Disable the dev email login** in prod — the magic-link fallback is off
   automatically when the bundle is built outside dev unless
   `VITE_ENABLE_EMAIL_LOGIN=true` (see `src/spa/pages/LoginPage.tsx`).

## Smoke test after deploy

```bash
# SPA + history fallback (should be 200 and serve index.html)
curl -sI https://node-services.<env>.skymind.com/knowledge-base/ | head -1
# Backend health
curl -s  https://node-services.<env>.skymind.com/knowledge-base/api/health   # {"ok":true}
# Supabase reachable through Traefik (NOT a bare "404 page not found")
curl -s  "https://supabase.<env>.skymind.com/auth/v1/settings" -H "apikey: <ANON_KEY>"
curl -s  "https://supabase.<env>.skymind.com/rest/v1/articles?select=slug&limit=1" -H "apikey: <ANON_KEY>"
```
