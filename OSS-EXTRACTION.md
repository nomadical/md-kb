# OSS extraction checklist

Tracking the genericization of the SkyCell knowledge base into a plug-and-play
open-source app. Decisions: standalone public repo · email/password + magic-link
auth (OAuth optional).

## Milestone 1 — clean scaffold (done)
- [x] Clean copy (no `.git` history, `.env.local`, `node_modules`, build artifacts).
- [x] Remove SkyCell deploy infra (`deploy/`, deploy/release workflows); keep lint CI.
- [x] MIT `LICENSE`, generic `README.md`, generic `.env.example`.
- [x] Fresh git history.

## Milestone 2 — auth (Keycloak/Azure → Supabase email + magic-link)
- [ ] Make email/password + magic-link the default login (it already exists as a
      dev fallback — promote it); render OAuth buttons only for
      `VITE_OAUTH_PROVIDERS`.
- [ ] Drop `src/lib/keycloak.ts`, `server/routes/authSync.ts`,
      `packages/kb-react/src/keycloakRoles.ts`; simplify `AuthProvider`,
      `signOut`, `AuthCallbackPage` (no Keycloak RP-logout / group sync).
- [ ] Editorial role still comes from `profiles.role`; access-role tags become
      purely admin-managed (drop IdP sync + the `BASIC_ACCESS` special-case).

## Milestone 3 — config / branding / i18n
- [ ] `BASE_PATH` from `VITE_BASE_PATH` (default `/`) across vite config, router,
      server mount, config.ts.
- [ ] Neutral default branding (already Settings-driven); strip SkyCell footer
      links + logo + the `skymind.com` domains in `inference.ts` / `ask.ts` /
      scripts.
- [ ] Drop the hardcoded `de` DB language constraint; ship `en` only, languages
      driven by the `enabledLanguages` setting.

## Milestone 4 — content / data
- [ ] `npm run db:seed` → a few generic demo articles (replace SkyCell
      `import-kb`/`seed-translations` scripts).
- [ ] Confirm no proprietary strings/domains remain (`grep -riE 'skycell|skymind'`).

## Milestone 5 — improvements (folded in per request)
- OSS hardening: tests, docs, config robustness, one-command setup.
- UX polish, new features, code quality/perf — scoped as separate PRs.