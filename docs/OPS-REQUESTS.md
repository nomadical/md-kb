# Ops Requests — Deploy `knowledge-base-app` (internal)

Three small, well-scoped grants are needed to get `knowledge-base-app` running
internally in the **fe-node-services** stack with **shared SkyMind SSO**. None
can be self-served from a `Reader`/`CDN Endpoint Contributor` account (the tenant
also blocks app-registration creation), so each goes to the owning team. Once all
three are done, the deploy is fully automated.

Context: the app is a single container running a Vite SPA + thin Express backend
(`server/index.ts`, base path `/knowledge-base`, listens on port 3000 — see
[ADR 0003](adr/0003-vite-spa-thin-express-backend.md)). It reuses the existing internal Supabase
(`supabase.dev.skymind.com`), embeddings/LLM, and the **`secure`** Keycloak realm
(`id.dev.skymind.com`) — the same realm the Intervention client uses.

---

## 1. Azure — OIDC app + ACR push (Platform / DevOps)

**Why:** `.github/workflows/build.yml` authenticates to Azure via OIDC and pushes
the image to `skycellregistry.azurecr.io/knowledge-base`. The repo's `AzurePlan`
environment currently has **no client-id secret**, and no service principal has
push rights. (Tenant/subscription already resolve — they're org-level secrets.)

**Mirror the proven `fe-node-services-oidc-azure` app reg.** Run as someone with
app-registration rights + `Owner`/`User Access Administrator` on RG `infrastructure`:

```bash
SUB=8640bde2-4e10-443a-b873-769f2204da02
APPID=$(az ad app create --display-name knowledge-base-app-oidc-azure --query appId -o tsv)
az ad sp create --id "$APPID"

# Federated credential — subject MUST be the environment form (the job uses
# `environment: AzurePlan`), exactly like fe-node-services.
az ad app federated-credential create --id "$APPID" --parameters '{
  "name": "github-knowledge-base-app-ci",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:SkyCell-AG/knowledge-base-app:environment:AzurePlan",
  "audiences": ["api://AzureADTokenExchange"]
}'

# Push rights on the registry
az role assignment create --assignee "$APPID" --role AcrPush \
  --scope /subscriptions/$SUB/resourceGroups/infrastructure/providers/Microsoft.ContainerRegistry/registries/skycellregistry

echo "Client ID to hand back: $APPID"
```

**Hand back:** the `$APPID` (the Application/client ID — not sensitive).
→ I then set the GitHub secret `ARM_SKYMIND_KNOWLEDGE_BASE_OIDC_CLIENT_ID` (the
exact name `build.yml` already expects) plus the three Supabase build-args, and
re-run the build.

---

## 2. Keycloak — confidential client in realm `secure` (Identity)

**Why:** the app federates Supabase Auth to the existing `secure` realm so users
share one SkyMind session (no second login). It needs its own confidential client.

**Create in `secure` @ `id.dev.skymind.com`:**

| Setting | Value |
|---|---|
| Client ID | `md-kb` (or `knowledge-base-app`) |
| Access type | `confidential` (client authentication ON) |
| Standard flow | ON (authorization code) |
| PKCE | **OFF** (Advanced → PKCE Code Challenge Method = empty) |
| Valid Redirect URIs | `https://supabase.dev.skymind.com/auth/v1/callback` (add `http://127.0.0.1:54321/auth/v1/callback` for local dev) |
| Mapper | **Group Membership** → token claim name `groups`, *Full group path* OFF, *Add to access token* ON |

The `groups` mapper is required: the backend's `/api/auth/*` sync
(`server/routes/authSync.ts`) reads it to set
editorial roles (`SKYMIND_ADMIN` → admin). This matches how the Intervention
client consumes `tokenParsed.groups`.

**Hand back:** the client **secret**.
→ goes into Supabase as `SUPABASE_AUTH_EXTERNAL_KEYCLOAK_CLIENT_ID` /
`SUPABASE_AUTH_EXTERNAL_KEYCLOAK_SECRET` (URL is already
`https://id.dev.skymind.com/realms/secure`).

---

## 3. fe-node-services — add the service (FE Platform)

**Why:** this is the internal host (Traefik). Per `docs/DEPLOY.md` Option A, add
`knowledge-base` as a sibling service and bump the image version after each build.

- Add the compose service from `docs/DEPLOY.md` (Traefik routes `PathPrefix(/knowledge-base)`; no StripPrefix — the app owns the base path).
- Provide runtime secret `KB_SUPABASE_SERVICE_ROLE_KEY` (→ `SUPABASE_SERVICE_ROLE_KEY`).
- Set `KB_IMAGE_VERSION=main-<sha>` (the build prints this) and run the stack's Deploy.

Result: reachable at `https://node-services.dev.skymind.com/knowledge-base`.
(Optionally, point the `knowledge.dev.skymind.com` Front Door at this origin
later to retire the old static KB.)

---

## What I do once these land (no further ops needed)

1. Set GitHub secrets/vars: `ARM_SKYMIND_KNOWLEDGE_BASE_OIDC_CLIENT_ID`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SITE_URL`.
2. Re-run `build.yml`, confirm the image pushes green.
3. Hand FE Platform the `KB_IMAGE_VERSION`.
4. Smoke-test login (shared SSO from the Intervention client → straight into `/admin`).
