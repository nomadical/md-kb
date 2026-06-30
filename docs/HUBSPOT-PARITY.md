# Roadmap: making md-kb as good as the HubSpot Knowledge Base

A pragmatic plan to close the gap between **md-kb** today and what HubSpot's
Knowledge Base offers — without losing the "simple, stupid, useful" ethos or the
role-gated, self-hostable model we already have.

## Where we are today

| Capability | md-kb now |
| --- | --- |
| Markdown authoring | ✅ Split editor + live preview (`@uiw/react-md-editor`) |
| Storage | ✅ Supabase Postgres, RLS-enforced |
| Auth | ✅ Keycloak SSO (+ Microsoft, + dev email) |
| Editorial roles | ✅ admin / editor / viewer |
| **Entitlement roles** | ✅ Keycloak roles → per-article visibility (ANY-of), hybrid public |
| Folders / categories | ✅ folder tree + search filter |
| Wikilinks, GFM, images | ✅ |
| Content imported | ✅ 54 SkyMind articles + 264 images |

What HubSpot has that we don't *yet*: real search, article feedback &
analytics, related articles, multi-language, SEO/branding, a polished reader
theme, and authoring workflow (drafts→review→publish, versioning).

## What "HubSpot-grade" means — feature gap

HubSpot KB's notable capabilities, mapped to our gap:

1. **Search** — instant, typo-tolerant, ranked full-text + filters.
2. **Categories & subcategories** — curated IA with landing pages, not just a folder tree.
3. **Article feedback** — "Was this helpful? 👍/👎" + free-text, aggregated.
4. **Related articles & internal linking** — automatic + manual.
5. **Analytics** — views, search terms (incl. **no-result searches**), helpfulness, trends.
6. **SEO & branding** — meta tags, sitemap, canonical URLs, custom domain, themable templates.
7. **Authoring workflow** — draft → review → publish, scheduled publish, **version history**, audit.
8. **Multi-language** — per-article translations with language switcher (our source is already `docs/en/...`).
9. **Restricted/private KB** — login-gated audiences. ✅ we already do this per-role (a differentiator).
10. **Support deflection** — surface articles in a help widget / before ticket submission.

## Phased plan

### Phase 1 — Reader experience & findability (highest ROI)
- **Full-text search** with Postgres: add a `tsvector` column (title^A, body^B) +
  GIN index + `websearch_to_tsquery`; a `/search` page and a ⌘K palette.
  RLS still applies, so results are automatically role-filtered. *(no new infra)*
- **Category landing pages** (`/c/<category>`): description + article list +
  subcategory cards. Promote `folder` to a first-class `categories` table
  (name, slug, icon, order, parent_id) for ordering and descriptions.
- **Reader theme polish**: sticky table-of-contents from headings, breadcrumb,
  prev/next, reading-time, "Updated <date>", anchored headings, print styles.
- **Related articles**: reuse the existing `related` frontmatter we imported;
  later auto-suggest via tag/role/embedding similarity.

### Phase 2 — Feedback & analytics (the HubSpot "moat")
- **"Was this helpful?"** widget → `article_feedback(article_id, helpful bool,
  comment, role, created_at)`. Anonymous-friendly, one vote/session.
- **Event capture**: `article_views`, `search_queries` (store the query + result
  count → expose **zero-result searches**, the single most useful KB signal).
- **Admin analytics dashboard**: top articles, worst helpfulness, trending,
  failed searches, coverage gaps by role.

### Phase 3 — Authoring workflow & trust
- **Draft → In review → Published** status + scheduled publish (`publish_at`).
- **Version history**: `article_revisions` snapshot on save; diff & restore.
- **Review/approval**: editor submits, admin approves (reuse the role model).
- **Bulk import/sync**: turn `scripts/import-kb.mjs` into a repeatable sync
  (idempotent upserts by `stoplight-id`), so the markdown repo can stay a source.

### Phase 4 — Reach: SEO, branding, multi-language
- **SEO**: per-article `<title>`/meta/OG, JSON-LD `Article`, `sitemap.xml`,
  canonical URLs; ISR/static rendering for public articles.
- **Branding/theming**: logo, colors, custom domain, configurable homepage.
- **Multi-language**: `articles.lang` + `translation_group_id`; language switcher;
  our source tree (`docs/en/…`) already implies the structure.

### Phase 5 — Deflection & integrations
- **AI answers** — ✅ **implemented**. `pgvector` chunks + RLS-mirrored
  visibility + `match_article_chunks` RPC → `/ask` and `/api/ask`. Retrieval
  runs through the user's session, so the LLM only ever sees entitled content.
  Provider-agnostic (OpenAI-compatible: Ollama / vLLM / internal gateway), so
  it stays on-network. **private-gpt** was the reference pattern; we implemented
  leaner on the Postgres we already run rather than running its full stack
  (which has no concept of our role-gating). See `src/lib/inference.ts`,
  `scripts/embed-kb.mjs`.
- **Embeddable help widget** (search + top articles) for the SkyMind app. *(todo)*
- **Ticket deflection**: suggest articles before a support request is filed. *(todo)*
- **Richer authoring** *(optional)*: if a WYSIWYG is wanted over the markdown
  split-editor, use **Lexical/TipTap/Milkdown** (modern successors to the now-
  stale Draft.js) that still round-trip markdown, so storage is unchanged.

## Suggested sequencing

```
Phase 1  ██████████  ~1–2 wks  search + categories + reader polish   (biggest UX win)
Phase 2  ███████     ~1 wk     feedback + analytics                  (the data moat)
Phase 3  ███████     ~1 wk     workflow + versioning + repeatable sync
Phase 4  ██████      ~1 wk     SEO + branding + i18n
Phase 5  ████████    ~2 wks    widget + AI answers + deflection
```

## Principles to keep

- **RLS stays the security boundary.** Every new surface (search, AI, analytics)
  queries through the user's session, so role-gating is automatic and can't be
  bypassed in app code.
- **Postgres-first.** Search (`tsvector`), similarity (`pgvector`), analytics —
  all in Supabase before adding external services.
- **Markdown stays the source of truth.** Keep the import/sync path so content
  can live in git and round-trip.
- **Don't out-bloat HubSpot.** Ship Phase 1–2 well; they cover ~80% of the
  perceived quality gap.
