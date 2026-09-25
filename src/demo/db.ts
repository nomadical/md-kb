// In-memory tables for the static demo build (VITE_DEMO=true). There is no
// backend behind the demo: a visitor's changes live here and in sessionStorage,
// so they survive the app's own reloads (router.refresh) and reset when the
// tab closes.

import { SEED_ARTICLES } from "./seed";

export type Row = Record<string, unknown>;

export const DEMO_USER_ID = "00000000-0000-4000-8000-000000000001";
export const DEMO_EMAIL = "demo@stillwiki.dev";

const now = () => new Date().toISOString();
const daysAgo = (n: number) =>
  new Date(Date.now() - n * 86_400_000).toISOString();

export const uuid = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;

const STORAGE_KEY = "stillwiki-demo";

function article(a: (typeof SEED_ARTICLES)[number], i: number): Row {
  const at = daysAgo(i + 1);
  return {
    // Fixed ids, so a link to /admin/<id> works in any fresh demo session.
    id: `00000000-0000-4000-a000-${String(i + 1).padStart(12, "0")}`,
    slug: a.slug,
    title: a.title,
    folder: a.folder,
    content: a.content.trim() + "\n",
    tags: a.tags,
    access_roles: [],
    context_keys: [],
    status: a.published ? "published" : "draft",
    published: a.published,
    submitted_by: null,
    submitted_at: null,
    reviewed_by: a.published ? DEMO_USER_ID : null,
    reviewed_at: a.published ? at : null,
    review_note: null,
    deleted_at: null,
    deleted_by: null,
    created_at: at,
    updated_at: at,
  };
}

function seed(): Record<string, Row[]> {
  const articles = SEED_ARTICLES.map(article);
  return {
    articles,
    article_drafts: [],
    article_revisions: articles
      .filter((a) => a.published)
      .map((a) => ({
        id: uuid(),
        article_id: a.id,
        revision: 1,
        title: a.title,
        status: "published",
        content: a.content,
        created_at: a.updated_at,
        edited_by: DEMO_USER_ID,
      })),
    article_translations: [],
    article_translation_revisions: [],
    article_templates: [
      {
        id: uuid(),
        name: "How-to",
        description: "A task with numbered steps.",
        folder: "guides",
        tags: ["how-to"],
        content:
          "# {{title}}\n\n## Before you start\n\n- \n\n## Steps\n\n1. \n2. \n\n## Result\n\n",
        created_by: DEMO_USER_ID,
        created_at: daysAgo(10),
        updated_at: daysAgo(10),
      },
    ],
    article_feedback: [],
    article_suggestions: [],
    article_views: [],
    page_views: [],
    search_queries: [],
    search_result_clicks: [],
    audit_log: [
      {
        id: uuid(),
        actor_id: DEMO_USER_ID,
        actor_email: DEMO_EMAIL,
        action: "article.publish",
        target_type: "article",
        target_id: articles[0].id,
        summary: `Published "${articles[0].title}"`,
        metadata: {},
        created_at: daysAgo(1),
      },
    ],
    profiles: [
      {
        id: DEMO_USER_ID,
        email: DEMO_EMAIL,
        role: "admin",
        role_source: "manual",
        access_roles: [],
        manual_access_roles: [],
        created_at: daysAgo(30),
      },
    ],
    app_settings: [
      {
        id: 1,
        value: {
          siteName: "stillwiki",
          tagline:
            "A markdown knowledge base. This demo runs in your browser and resets when you close the tab.",
          askAiEnabled: false,
        },
      },
    ],
  };
}

function load(): Record<string, Row[]> {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved) as Record<string, Row[]>;
  } catch {
    /* storage blocked or corrupt: start from the seed */
  }
  return seed();
}

export const tables = load();

/** Persist the tables for this tab. Called after every write. */
export function save(): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(tables));
  } catch {
    /* storage blocked: the demo still works until the next reload */
  }
}

export function table(name: string): Row[] {
  return (tables[name] ??= []);
}

export { now };
