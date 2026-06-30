# md-kb — a self-hostable markdown knowledge base

An open-source, plug-and-play knowledge base built on **Supabase + Vite/React +
a thin Express API**. Public visitors read published articles; signed-in staff
write them in an Obsidian-style split editor with live preview.

- **Per-user private drafts** — your edits are private until reviewed & published.
- **Review-gated publishing** — submit → review → publish (configurable).
- **Published-only version history**, trash/restore, audit log.
- **Roles** — admin / editor / reviewer / viewer, plus optional per-article
  access-role tags for gated content.
- **Admin Settings** — branding, languages, publishing policy, feature flags —
  all configurable in-app, no redeploy.
- **Optional AI ("Ask the KB")** — pgvector RAG against any OpenAI-compatible
  endpoint (off by default).

> This is the community edition. It ships with **no proprietary data, branding,
> or identity provider** — bring your own Supabase project and configure the
> rest from the admin Settings page.

## Quickstart

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env.local        # fill in your Supabase URL + keys

# 3. Database (local Supabase, or point DATABASE_URL at your project)
supabase start                    # or use a hosted Supabase project
npm run db:migrate                # applies supabase/migrations.sql
npm run db:seed                   # optional: a few demo articles

# 4. Run
npm run dev                       # Vite SPA
npm run server:dev                # Express API (separate terminal)
```

Open the app and **sign up** — the first account becomes the **admin**. From
**Admin → Settings** you can set the site name, theme, enabled languages, and
publishing policy.

## Auth

Email + password and magic-link work out of the box (configure SMTP in Supabase
for magic-link delivery). To add OAuth, enable the provider in your Supabase
dashboard and list it in `VITE_OAUTH_PROVIDERS` (e.g. `github,google`).

## Tech

Vite + React + TypeScript SPA · Express API · Supabase (Postgres + Auth + RLS +
Storage) · Tailwind. Row-Level Security is the real authorization boundary; the
API adds server-side audit logging.

## License

MIT — see [LICENSE](./LICENSE).