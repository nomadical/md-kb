# md-kb — Vite SPA + thin Express backend (served under basePath /knowledge-base).
#
#   docker build -t skycellregistry.azurecr.io/knowledge-base:$VERSION \
#     --build-arg VITE_SUPABASE_URL=... \
#     --build-arg VITE_SUPABASE_ANON_KEY=... \
#     --build-arg VITE_SITE_URL=https://node-services.dev.skymind.com/knowledge-base .
#
# VITE_* vars are inlined into the SPA at build time. Server-only secrets
# (SUPABASE_SERVICE_ROLE_KEY, KEYCLOAK_*, EMBEDDINGS_*/LLM_*/KB_AZURE_OPENAI_*,
# MCP_API_TOKEN) and the runtime NEXT_PUBLIC_SUPABASE_* the Express server reads
# are passed at runtime (see fe-node-services docker-compose).

FROM node:22-alpine AS build
WORKDIR /app
# Install in the same stage as the build so workspace-local devDeps (e.g.
# kb-core's `tsup`, which npm installs under packages/kb-core/node_modules, NOT
# the hoisted root) are present when `npm run build` builds the package.
COPY package.json package-lock.json ./
COPY packages/kb-core/package.json ./packages/kb-core/
RUN npm ci --ignore-scripts
COPY . .
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_SITE_URL
# Keycloak RP-initiated logout endpoint, baked in so sign-out ends the SSO
# session (otherwise the next gated page silently re-authenticates). The client
# id is sent on that logout request; defaults to "md-kb" in the SPA if unset.
ARG VITE_KEYCLOAK_LOGOUT_URL
ARG VITE_KEYCLOAK_CLIENT_ID
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    VITE_SITE_URL=$VITE_SITE_URL \
    VITE_KEYCLOAK_LOGOUT_URL=$VITE_KEYCLOAK_LOGOUT_URL \
    VITE_KEYCLOAK_CLIENT_ID=$VITE_KEYCLOAK_CLIENT_ID
# prebuild hook builds @md-kb/core (tsup), then `vite build` emits ./dist.
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production PORT=3000
# Runtime needs: node_modules (express + tsx + the @md-kb/core symlink),
# the kb-core build it points at, the built SPA (dist), and the server + the
# src/lib modules (and tsconfig path aliases) the server imports at runtime.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/kb-core/package.json ./packages/kb-core/package.json
COPY --from=build /app/packages/kb-core/dist ./packages/kb-core/dist
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/src ./src
COPY --from=build /app/package.json /app/tsconfig.json ./
EXPOSE 3000
# `npm start` -> tsx server/index.ts: serves dist + the /knowledge-base/api/* API.
CMD ["npm", "start"]
