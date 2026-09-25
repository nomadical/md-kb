// Answers the SPA's calls to the Express API in the static demo. The editorial
// actions mirror server/routes/admin.ts over the in-memory tables; anything
// that needs a real server (AI, uploads, zip import/export) says so instead.

import { applyTemplate } from "@/lib/templates";
import { forkDraft } from "./client";
import { DEMO_EMAIL, DEMO_USER_ID, now, save, table, uuid, type Row } from "./db";

type Body = Record<string, unknown>;
type Outcome =
  { ok: true; [k: string]: unknown } | { ok: false; error: string };

const UNAVAILABLE = "Not available in the demo — there is no server behind it.";

const byId = (name: string, id: unknown) =>
  table(name).find((r) => r.id === id);

function audit(action: string, target: Row | undefined, summary?: string) {
  table("audit_log").push({
    id: uuid(),
    actor_id: DEMO_USER_ID,
    actor_email: DEMO_EMAIL,
    action,
    target_type: "article",
    target_id: target?.id ?? null,
    summary: summary ?? (target?.title as string) ?? null,
    metadata: {},
    created_at: now(),
  });
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

function draftOf(b: Body): Row | undefined {
  return byId("article_drafts", b.draftId);
}

/** Copy a draft onto its article as a new published revision (publish_draft). */
function publish(draft: Row): Outcome {
  const a = byId("articles", draft.article_id);
  if (!a) return { ok: false, error: "Article not found." };
  const taken = table("articles").some(
    (x) => x.id !== a.id && x.slug === draft.slug && x.deleted_at == null,
  );
  if (taken)
    return {
      ok: false,
      error: `The slug "${draft.slug}" is already used by another article.`,
    };
  Object.assign(a, {
    title: draft.title,
    slug: draft.slug,
    folder: draft.folder,
    content: draft.content,
    tags: draft.tags,
    access_roles: draft.access_roles,
    context_keys: draft.context_keys,
    status: "published",
    published: true,
    reviewed_by: DEMO_USER_ID,
    reviewed_at: now(),
    review_note: null,
    updated_at: now(),
  });
  const revs = table("article_revisions");
  revs.push({
    id: uuid(),
    article_id: a.id,
    revision: revs.filter((r) => r.article_id === a.id).length + 1,
    title: a.title,
    slug: a.slug,
    folder: a.folder,
    tags: a.tags,
    access_roles: a.access_roles,
    status: "published",
    content: a.content,
    created_at: now(),
    edited_by: DEMO_USER_ID,
  });
  const drafts = table("article_drafts");
  drafts.splice(drafts.indexOf(draft), 1);
  audit("article.approve", a);
  return { ok: true };
}

function createArticle(): { id: string } {
  const id = uuid();
  const slug = `untitled-${id.slice(0, 8)}`;
  table("articles").push({
    id,
    slug,
    title: "Untitled",
    folder: "",
    content: "",
    tags: [],
    access_roles: [],
    context_keys: [],
    status: "draft",
    published: false,
    submitted_by: null,
    submitted_at: null,
    reviewed_by: null,
    reviewed_at: null,
    review_note: null,
    deleted_at: null,
    deleted_by: null,
    created_at: now(),
    updated_at: now(),
  });
  forkDraft(id);
  audit("article.create", byId("articles", id));
  return { id };
}

const ACTIONS: Record<string, (b: Body) => unknown> = {
  saveArticle(b) {
    const draft = forkDraft(b.id as string);
    if (!draft) return { ok: false, error: "Article not found." };
    Object.assign(draft, {
      title: String(b.title ?? "").trim() || "Untitled",
      slug: slugify(String(b.slug || b.title || "")) || draft.slug,
      folder: String(b.folder ?? "").replace(/^\/+|\/+$/g, ""),
      content: b.content,
      tags: (b.tags as string[]).map((t) => t.trim()).filter(Boolean),
      access_roles: (b.access_roles as string[])
        .map((x) => x.trim().toUpperCase())
        .filter(Boolean),
      context_keys: (b.context_keys as string[])
        .map((k) => k.trim())
        .filter(Boolean),
      updated_at: now(),
    });
    return { ok: true };
  },
  getDraft(b) {
    const draft = forkDraft(b.id as string);
    return draft
      ? { ok: true, draft }
      : { ok: false, error: "Article not found." };
  },
  submitForReview(b) {
    const d = draftOf(b);
    if (!d) return { ok: false, error: "Draft not found." };
    Object.assign(d, {
      status: "in_review",
      submitted_at: now(),
      updated_at: now(),
    });
    audit("article.submit", byId("articles", d.article_id), d.title as string);
    return { ok: true };
  },
  withdrawReview(b) {
    const d = draftOf(b);
    if (!d) return { ok: false, error: "Draft not found." };
    Object.assign(d, { status: "draft", updated_at: now() });
    audit(
      "article.withdraw",
      byId("articles", d.article_id),
      d.title as string,
    );
    return { ok: true };
  },
  approveArticle(b) {
    const d = draftOf(b);
    if (d) return publish(d);
    const a = byId("articles", b.id);
    if (!a) return { ok: false, error: "Article not found." };
    Object.assign(a, {
      status: "published",
      published: true,
      review_note: null,
      updated_at: now(),
    });
    audit("article.approve", a);
    return { ok: true };
  },
  requestChanges(b) {
    const d = draftOf(b);
    const note = String(b.note ?? "").trim() || null;
    if (d) {
      Object.assign(d, {
        status: "draft",
        review_note: note,
        updated_at: now(),
      });
      audit(
        "article.request_changes",
        byId("articles", d.article_id),
        d.title as string,
      );
      return { ok: true };
    }
    const a = byId("articles", b.id);
    if (!a) return { ok: false, error: "Article not found." };
    Object.assign(a, {
      status: "draft",
      published: false,
      review_note: note,
      updated_at: now(),
    });
    audit("article.request_changes", a);
    return { ok: true };
  },
  unpublishArticle(b) {
    const a = byId("articles", b.id);
    if (!a) return { ok: false, error: "Article not found." };
    Object.assign(a, { status: "draft", published: false, updated_at: now() });
    audit("article.unpublish", a);
    return { ok: true };
  },
  createArticle,
  createArticleFromTemplate(b) {
    const tpl = byId("article_templates", b.templateId);
    if (!tpl) throw new Error("Template not found.");
    const { id } = createArticle();
    Object.assign(forkDraft(id)!, {
      content: applyTemplate(tpl.content as string, {
        title: "Untitled",
        author: DEMO_EMAIL,
      }),
      folder: tpl.folder,
      tags: tpl.tags,
    });
    return { id };
  },
  deleteArticle(b) {
    const a = byId("articles", b.id);
    if (!a) return { ok: false, error: "Article not found." };
    Object.assign(a, {
      deleted_at: now(),
      deleted_by: DEMO_USER_ID,
      status: "draft",
      published: false,
    });
    audit("article.delete", a);
    return { ok: true };
  },
  restoreArticle(b) {
    const a = byId("articles", b.id);
    if (!a) return { ok: false, error: "Article not found." };
    Object.assign(a, { deleted_at: null, deleted_by: null });
    audit("article.restore", a);
    return { ok: true };
  },
  purgeArticle(b) {
    const rows = table("articles");
    const a = byId("articles", b.id);
    if (!a) return { ok: false, error: "Article not found." };
    if (!a.deleted_at)
      return {
        ok: false,
        error: "Only trashed articles can be permanently deleted.",
      };
    rows.splice(rows.indexOf(a), 1);
    audit("article.purge", a);
    return { ok: true };
  },
  restoreRevision(b) {
    const rev = byId("article_revisions", b.revisionId);
    if (!rev || rev.article_id !== b.articleId)
      return { ok: false, error: "Revision not found." };
    const d = forkDraft(b.articleId as string);
    if (!d) return { ok: false, error: "Article not found." };
    Object.assign(d, {
      title: rev.title,
      content: rev.content,
      updated_at: now(),
    });
    return { ok: true };
  },
  saveTemplate(b) {
    const rows = table("article_templates");
    const fields = {
      name: String(b.name ?? "").trim(),
      description: b.description,
      content: b.content,
      folder: b.folder,
      tags: b.tags,
      updated_at: now(),
    };
    if (!fields.name) return { ok: false, error: "A template needs a name." };
    const existing = b.id ? byId("article_templates", b.id) : undefined;
    if (existing) Object.assign(existing, fields);
    else
      rows.push({
        id: uuid(),
        created_by: DEMO_USER_ID,
        created_at: now(),
        ...fields,
      });
    return { ok: true };
  },
  deleteTemplate(b) {
    const rows = table("article_templates");
    const t = byId("article_templates", b.id);
    if (t) rows.splice(rows.indexOf(t), 1);
    return { ok: true };
  },
  updateSettings(b) {
    const row = table("app_settings")[0];
    row.value = b.settings;
    return { ok: true };
  },
  setUserRole(b) {
    if (b.userId === DEMO_USER_ID)
      return { ok: false, error: "You can't change your own role." };
    return { ok: false, error: UNAVAILABLE };
  },
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

/** Route a request for `${BASE_PATH}/api/...`; null means "not an API call". */
async function handle(
  path: string,
  init?: RequestInit,
): Promise<Response | null> {
  const m = path.match(/\/api\/(.+)$/);
  if (!m) return null;
  const [scope, name] = m[1].split("/");

  // Analytics beacons and page tracking: accept and drop.
  if (scope === "track" || scope === "search")
    return new Response(null, { status: 204 });
  if (scope !== "admin" || !name) return json(501, { error: UNAVAILABLE });

  const action = ACTIONS[name];
  if (!action) return json(501, { error: UNAVAILABLE });
  const body =
    typeof init?.body === "string" ? (JSON.parse(init.body) as Body) : {};
  try {
    const result = action(body);
    save();
    return json(200, result);
  } catch (e) {
    return json(400, { error: e instanceof Error ? e.message : String(e) });
  }
}

/** Route the SPA's API traffic to the in-memory handlers. */
export function installDemoApi(): void {
  const realFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const path = new URL(url, window.location.href).pathname;
    return (await handle(path, init)) ?? realFetch(input, init);
  };
  navigator.sendBeacon = () => true;
}
