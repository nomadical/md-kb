# Security policy

## Reporting a vulnerability

Please report security issues **privately** — do not open a public issue.

Use GitHub's **Report a vulnerability** (Security → Advisories) on this repo, or
email the maintainer. We'll acknowledge within a few days and keep you posted on
a fix.

## Scope notes

- **Row-Level Security (Postgres RLS)** is the authorization boundary. The
  Express API adds audited writes but is not the security boundary — findings
  that bypass RLS are especially valuable.
- The Supabase **anon key is public** by design; the **service-role key** is
  server-only — never ship it to the browser.
- The **first account to sign up becomes an admin**; lock down sign-ups in your
  Supabase project for any public instance (see `docs/DEPLOY.md`).
