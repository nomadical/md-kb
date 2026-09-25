// Demo content, adapted from supabase/seed.sql.

export type SeedArticle = {
  slug: string;
  title: string;
  folder: string;
  tags: string[];
  published: boolean;
  content: string;
};

export const SEED_ARTICLES: SeedArticle[] = [
  {
    slug: "welcome",
    title: "Welcome To stillwiki",
    folder: "",
    tags: ["getting-started"],
    published: true,
    content: `
# Welcome to stillwiki

A small, self-hostable **markdown knowledge base**. Anyone can read published
articles; signed-in editors write them in a split editor with live preview.

## Start here

- [[trying-the-demo|Trying the demo]] — what to click first
- [[markdown-cheatsheet|Markdown cheat sheet]] — everything you can write
- [[using-wikilinks|Linking pages]] — connect articles like in Obsidian
- [[writing-workflow|The writing workflow]] — drafts, review, publishing

## How content is organised

- **Folders** are a \`/\`-separated path (this page lives at the root).
- **Tags** make articles findable from search.
- **Drafts** are private to their author until a reviewer publishes them.
`,
  },
  {
    slug: "trying-the-demo",
    title: "Trying The Demo",
    folder: "",
    tags: ["getting-started", "demo"],
    published: true,
    content: `
# Trying the demo

This demo runs entirely in your browser. You are signed in as an **admin**, so
every screen is open to you. Nothing you change leaves this tab: close it and
the demo is back to this state.

## Things to try

1. Press \`⌘ K\` (or \`Ctrl K\`) and search for *wikilinks* — the search is
   typo-tolerant, so *wikilnks* works too.
2. Switch to **Editor** (top right) and open any article. Your changes go into
   a private draft that readers don't see.
3. Hit **Publish**, then switch back to **Website** to see it live. Every
   published version is kept under **History**.
4. Look at **Settings** in the editor sidebar — branding, publishing rules and
   feature flags are all configured in the app.

## What is switched off

The real app has a small Express API and Supabase behind it. In the demo there
is neither, so AI answers, media uploads and zip import/export are unavailable.
`,
  },
  {
    slug: "markdown-cheatsheet",
    title: "Markdown Cheat Sheet",
    folder: "guides",
    tags: ["markdown", "reference"],
    published: true,
    content: `
# Markdown Cheat Sheet

GitHub-Flavored Markdown (GFM) is fully supported.

## Text

**bold**, _italic_, ~~strikethrough~~, \`inline code\`, and [links](https://example.com).

## Lists

- Bullet
  - Nested bullet
1. Numbered
2. Numbered

Task list:

- [x] Write the article
- [ ] Publish it

## Quote

> Knowledge shared is knowledge multiplied.

## Table

| Feature      | Supported |
| ------------ | :-------: |
| Tables       | ✅        |
| Code blocks  | ✅        |
| Wikilinks    | ✅        |

## Code

\`\`\`ts
export function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
\`\`\`

---

That's the lot. See [[using-wikilinks]] for internal links.
`,
  },
  {
    slug: "using-wikilinks",
    title: "Linking Pages With Wikilinks",
    folder: "guides",
    tags: ["wikilinks", "reference"],
    published: true,
    content: `
# Linking Pages With Wikilinks

Connect articles the way you would in Obsidian — with double brackets.

## Syntax

| You write              | You get                          |
| ---------------------- | -------------------------------- |
| \`[[welcome]]\`          | a link to the **welcome** page   |
| \`[[welcome\\|Home]]\`    | the same link, labelled *Home*   |

The target is matched by **slug** (the URL-safe id of a page). The slug for
*Markdown Cheat Sheet* is \`markdown-cheatsheet\`, so [[markdown-cheatsheet]]
points straight at it.

## Why use them

- Build a web of related notes instead of dead-end pages.
- Links survive renames as long as the slug is stable.

Next: [[writing-workflow]].
`,
  },
  {
    slug: "writing-workflow",
    title: "The Writing Workflow",
    folder: "guides",
    tags: ["getting-started"],
    published: true,
    content: `
# The Writing Workflow

1. **Edit** any article, or create one with **+ New article**. Your changes
   land in a private draft that only you can see.
2. Fill in **Title**; the **Slug** auto-fills (you can override it).
3. Optionally set a **Folder** (e.g. \`guides/setup\`) and **Tags**.
4. Write in the left pane — the right pane previews live. Drafts autosave.
5. **Submit for review** when it is ready.
6. A reviewer **publishes** it or **requests changes** with a note.

Every published version is kept, so a bad edit is one click from being rolled
back. Unpublished articles are visible only to editors — see
[[internal-roadmap]] for an example.
`,
  },
  {
    slug: "internal-roadmap",
    title: "Internal Roadmap",
    folder: "internal",
    tags: ["planning"],
    published: false,
    content: `
# Internal Roadmap (draft)

This page is **unpublished**, so readers never see it — only signed-in editors.

- [ ] Backlinks panel
- [ ] Embeddable help widget
- [ ] GitHub-style callouts
`,
  },
];
