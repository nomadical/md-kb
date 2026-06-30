# Plan: Beautifying md-kb (and closing the HubSpot look-and-feel gap)

Companion to [HUBSPOT-PARITY.md](./HUBSPOT-PARITY.md) (feature gap). This doc is
about **how it looks and feels**: readability, layout, motion, scroll.

## Side-by-side: HubSpot KB vs md-kb today

| Surface | HubSpot KB | md-kb today | Gap |
| --- | --- | --- | --- |
| Home | Hero with a **big centered search bar**, category cards w/ icons + descriptions | Heading + recent-article cards | Hero search, category grid |
| Navigation | Breadcrumbs everywhere, category landing pages | Folder tree sidebar only | Breadcrumbs, category pages |
| Article page | Comfortable measure (~70ch), **"On this page" TOC rail** w/ scrollspy, related articles, feedback widget, prev/next | Single column, no TOC, no footer nav | TOC rail, related, prev/next, feedback |
| Media | Images zoom on click (lightbox), captions | Inline images only | Lightbox, captions |
| Motion | Subtle hover lifts, smooth accordion, skeletons while loading | Mostly instant/none | Micro-interactions, loading states |
| Branding | Customer logo, brand colors, custom font | Generic indigo + system font | SkyCell brand pass |
| Mobile | Collapsible drawer nav, sticky search | Fixed 288px sidebar (breaks on mobile) | Responsive drawer |

## Workstream 1 — Readability (the highest impact, ~1 day)

- **Typography**: self-host **Inter** (or Geist) via `next/font`; type scale
  `15px/1.7` body, tighter heading leading; cap article measure at `~72ch`.
- **Prose polish**: spacing rhythm between blocks; heading anchor links (¶ on
  hover); `scroll-margin-top` so anchors don't hide under sticky bars; styled
  `figure/figcaption`; image captions from alt text; copy buttons on code blocks.
- **Color**: keep the slate palette; add semantic tokens (`--surface`,
  `--surface-raised`, `--border`, `--accent`) as CSS vars to enable theming and
  an optional dark mode later.

## Workstream 2 — Layout & navigation (~2 days)

- **Article page**: 3-zone layout — tree sidebar | article (72ch) | **"On this
  page" TOC rail** (sticky, scrollspy highlight, from h2/h3).
- **Breadcrumbs**: `Knowledge Base → <Category> → <Article>` on every article.
- **Home hero**: centered search input ("How can we help?") over a subtle
  gradient; category cards (icon, name, description, article count) below;
  recent/popular sections after.
- **Category landing pages** (`/c/<category>`): description + ordered article
  list (needs the small `categories` table from HUBSPOT-PARITY Phase 1).
- **Prev/next** article footer within a category; **related articles** block
  (start from the imported `related` frontmatter).
- **Mobile**: sidebar becomes a slide-over drawer (<1024px); sticky top bar with
  search + breadcrumb.

## Workstream 3 — Motion, scroll & feel (~1 day)

- **View Transitions** for page navigation (Next supports the View Transitions
  API) — soft cross-fade between articles, no jarring repaint.
- **Micro-interactions**: card hover lift + border-accent (150ms ease), sidebar
  folder expand/collapse with height animation, button press states.
- **Scroll**: `scroll-behavior: smooth` for anchors; scrollspy TOC; "back to
  top" pill after 2 screens; preserved scroll position in the tree sidebar.
- **Loading**: skeleton rows for the tree + article shimmer (`loading.tsx` per
  route segment — App Router gives this for free); optimistic save state in the
  editor ("Saving… → Saved ✓" with a fade).
- **Lightbox**: click-to-zoom images (tiny dependency-free dialog, or
  `<dialog>` element).

## Workstream 4 — Branding & identity (~0.5 day)

- SkyCell logo in the sidebar, favicon set, social/meta cards.
- Brand accent (SkyCell blue) replacing generic indigo; consistent lozenge
  colors for entitlement badges.
- Proper `<title>`/description per page (`generateMetadata` from the article).

## Workstream 5 — Search UX (pairs with Phase 1 backend)

- **⌘K command palette** (also the hero search): instant results grouped by
  category, keyboard navigation, recent searches. Backend: the Postgres
  `tsvector` search from HUBSPOT-PARITY Phase 1 — RLS keeps results role-safe.

## What HubSpot has that we explicitly *won't* copy

- Marketing-cookie banners, chat widget bloat, HubSpot branding footer.
- Their WYSIWYG-only authoring — we keep markdown + git as a source of truth.

## Suggested order & effort

```
1. Readability pass (W1)            ~1 day    biggest perceived-quality jump
2. Article layout + TOC + crumbs    ~1.5 day  the "real docs site" feel
3. Home hero + category pages       ~1 day    first-impression parity
4. Motion/scroll/loading (W3)       ~1 day    the "nice transitions" ask
5. Branding (W4)                    ~0.5 day
6. ⌘K search UX (W5)                ~1 day    after Phase-1 search backend
```

Total: roughly **a week of focused work** to be visually competitive with a
HubSpot KB, while keeping the role-gated, self-hosted architecture they can't
offer.
