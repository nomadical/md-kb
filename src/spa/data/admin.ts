import { createClient } from "@/lib/supabase/client";
import { SOURCE_LANGUAGE } from "@/lib/types";
import { TEMPLATE_COLUMNS, type Template } from "@/lib/templates";
import type {
  Article,
  ArticleDraft,
  ArticleTranslation,
  AuditEntry,
  Profile,
  TranslationSummary,
} from "@/lib/types";
import type { RevisionRow } from "@/components/RevisionHistory";
import type { TrashRow } from "@/components/TrashManager";

// SPA read layer for the admin surface (replaces the Next server components'
// queries). Uses the browser Supabase client; RLS grants staff read access to
// drafts/profiles/audit just as it did server-side.

/** Resolve {id -> email} for a set of profile ids, in one round-trip. */
async function emailsByIdOf(ids: (string | null)[]): Promise<Map<string, string>> {
  const supabase = createClient();
  const unique = [...new Set(ids.filter(Boolean))] as string[];
  const out = new Map<string, string>();
  if (!unique.length) return out;
  const { data } = await supabase
    .from("profiles")
    .select("id,email")
    .in("id", unique);
  for (const p of (data ?? []) as { id: string; email: string | null }[])
    if (p.email) out.set(p.id, p.email);
  return out;
}

/** Templates for menus/editor (id + name). */
export async function fetchTemplatesLite(): Promise<{ id: string; name: string }[]> {
  const { data } = await createClient()
    .from("article_templates")
    .select("id,name")
    .order("name", { ascending: true });
  return data ?? [];
}

/** Full templates for the Templates manager. */
export async function fetchTemplates(): Promise<Template[]> {
  const { data } = await createClient()
    .from("article_templates")
    .select(TEMPLATE_COLUMNS)
    .order("name", { ascending: true });
  return (data ?? []) as Template[];
}

/** A single article by id (editor). RLS may hide it → null. */
export async function fetchArticleById(id: string): Promise<Article | null> {
  const { data } = await createClient()
    .from("articles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  // The array columns are nullable in the DB and come back as `null` when
  // empty, but the Article type (and every consumer) expects `string[]`.
  // Normalize here so callers can safely `.join`/`.length`/`.map`.
  const row = data as Article;
  return {
    ...row,
    tags: row.tags ?? [],
    access_roles: row.access_roles ?? [],
    context_keys: row.context_keys ?? [],
  };
}

/** All translation versions of an article (source excluded), for the editor's
 *  language switcher — just the per-language status + freshness. */
export async function fetchTranslations(
  articleId: string,
): Promise<TranslationSummary[]> {
  const { data } = await createClient()
    .from("article_translations")
    .select("language,status,updated_at")
    .eq("article_id", articleId);
  return (data ?? []) as TranslationSummary[];
}

/** A single language version (null = not created yet). RLS may also hide it. */
export async function fetchTranslation(
  articleId: string,
  language: string,
): Promise<ArticleTranslation | null> {
  const { data } = await createClient()
    .from("article_translations")
    .select("*")
    .eq("article_id", articleId)
    .eq("language", language)
    .maybeSingle();
  return (data as ArticleTranslation) ?? null;
}

/** Version history for one language version (mirrors fetchRevisions). */
export async function fetchTranslationRevisions(
  articleId: string,
  language: string,
): Promise<{ title: string | null; rows: RevisionRow[] }> {
  const supabase = createClient();
  const { data: tr } = await supabase
    .from("article_translations")
    .select("title")
    .eq("article_id", articleId)
    .eq("language", language)
    .maybeSingle();
  const { data } = await supabase
    .from("article_translation_revisions")
    .select("id,revision,title,status,content,created_at,edited_by")
    .eq("article_id", articleId)
    .eq("language", language)
    .order("revision", { ascending: false });
  const revs = (data ?? []) as {
    id: string;
    revision: number;
    title: string;
    status: string;
    content: string;
    created_at: string;
    edited_by: string | null;
  }[];
  const emails = await emailsByIdOf(revs.map((r) => r.edited_by));
  return {
    title: (tr?.title as string) ?? null,
    rows: revs.map((r) => ({
      id: r.id,
      revision: r.revision,
      title: r.title,
      status: r.status,
      content: r.content,
      created_at: r.created_at,
      editedByEmail: r.edited_by ? emails.get(r.edited_by) ?? null : null,
    })),
  };
}

export async function fetchUsers(): Promise<Profile[]> {
  const { data } = await createClient()
    .from("profiles")
    .select("id,email,role,role_source,access_roles,manual_access_roles,created_at")
    .order("created_at", { ascending: true });
  return (data ?? []) as Profile[];
}

export type ReviewRow = {
  /** The submitted DRAFT id (lifecycle actions act on it). */
  id: string;
  /** The article the draft belongs to (the editor route loads this). */
  articleId: string;
  slug: string;
  title: string;
  folder: string;
  submitted_at: string | null;
  submittedByEmail: string | null;
};

// In-review per-user drafts awaiting review (source language).
export async function fetchReviewQueue(): Promise<ReviewRow[]> {
  const { data } = await createClient()
    .from("article_drafts")
    .select("id,article_id,slug,title,folder,submitted_at,author_id")
    .eq("status", "in_review")
    .order("submitted_at", { ascending: true });
  const rows = (data ?? []) as {
    id: string;
    article_id: string;
    slug: string;
    title: string;
    folder: string;
    submitted_at: string | null;
    author_id: string | null;
  }[];
  const emails = await emailsByIdOf(rows.map((r) => r.author_id));
  return rows.map((r) => ({
    id: r.id,
    articleId: r.article_id,
    slug: r.slug,
    title: r.title,
    folder: r.folder,
    submitted_at: r.submitted_at,
    submittedByEmail: r.author_id ? emails.get(r.author_id) ?? null : null,
  }));
}

/** The caller's own source-language drafts (article_id + draft title/status),
 *  to overlay the real title onto the admin tree for never-published drafts. */
export async function fetchMyDrafts(): Promise<
  { articleId: string; title: string; status: "draft" | "in_review" }[]
> {
  const supabase = createClient();
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) return [];
  const { data } = await supabase
    .from("article_drafts")
    .select("article_id,title,status")
    .eq("author_id", uid)
    .eq("language", SOURCE_LANGUAGE);
  return (data ?? []).map((d) => ({
    articleId: d.article_id as string,
    title: d.title as string,
    status: d.status as "draft" | "in_review",
  }));
}

/** A specific draft by id — used when a reviewer opens a submitted draft. */
export async function fetchDraftById(draftId: string): Promise<ArticleDraft | null> {
  const { data } = await createClient()
    .from("article_drafts")
    .select("*")
    .eq("id", draftId)
    .maybeSingle();
  if (!data) return null;
  const d = data as ArticleDraft;
  return {
    ...d,
    tags: d.tags ?? [],
    access_roles: d.access_roles ?? [],
    context_keys: d.context_keys ?? [],
  };
}

export async function fetchTrash(): Promise<TrashRow[]> {
  const { data } = await createClient()
    .from("articles")
    .select("id,title,folder,deleted_at,deleted_by")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  const rows = (data ?? []) as {
    id: string;
    title: string;
    folder: string;
    deleted_at: string;
    deleted_by: string | null;
  }[];
  const emails = await emailsByIdOf(rows.map((r) => r.deleted_by));
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    folder: r.folder,
    deleted_at: r.deleted_at,
    deletedByEmail: r.deleted_by ? emails.get(r.deleted_by) ?? null : null,
  }));
}

export async function fetchRevisions(
  articleId: string,
): Promise<{ title: string | null; rows: RevisionRow[] }> {
  const supabase = createClient();
  const { data: article } = await supabase
    .from("articles")
    .select("title")
    .eq("id", articleId)
    .maybeSingle();
  const { data } = await supabase
    .from("article_revisions")
    .select("id,revision,title,status,content,created_at,edited_by")
    .eq("article_id", articleId)
    .order("revision", { ascending: false });
  const revs = (data ?? []) as {
    id: string;
    revision: number;
    title: string;
    status: string;
    content: string;
    created_at: string;
    edited_by: string | null;
  }[];
  const emails = await emailsByIdOf(revs.map((r) => r.edited_by));
  return {
    title: (article?.title as string) ?? null,
    rows: revs.map((r) => ({
      id: r.id,
      revision: r.revision,
      title: r.title,
      status: r.status,
      content: r.content,
      created_at: r.created_at,
      editedByEmail: r.edited_by ? emails.get(r.edited_by) ?? null : null,
    })),
  };
}

/** Content of the last published revision, for the reviewer diff (null = none). */
export async function fetchReviewDiffBase(
  articleId: string,
): Promise<string | null> {
  const { data } = await createClient()
    .from("article_revisions")
    .select("content")
    .eq("article_id", articleId)
    .eq("status", "published")
    .order("revision", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.content as string) ?? null;
}

export async function fetchAuditLog(): Promise<AuditEntry[]> {
  const { data } = await createClient()
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);
  return (data ?? []) as AuditEntry[];
}

export type AnalyticsRaw = {
  views: { article_id: string }[];
  feedback: {
    article_id: string;
    helpful: boolean;
    comment: string | null;
    created_at: string;
  }[];
  searches: { query: string; result_count: number; created_at: string }[];
  articles: { id: string; title: string }[];
  pageViews: { visitor_id: string | null; dwell_ms: number | null; created_at: string }[];
  searchClicks: { article_id: string | null }[];
};

export async function fetchAnalytics(): Promise<AnalyticsRaw> {
  const supabase = createClient();
  const [views, feedback, searches, articles, pageViews, searchClicks] =
    await Promise.all([
      supabase.from("article_views").select("article_id").limit(10000),
      supabase
        .from("article_feedback")
        .select("article_id,helpful,comment,created_at")
        .order("created_at", { ascending: false })
        .limit(5000),
      supabase
        .from("search_queries")
        .select("query,result_count,created_at")
        .order("created_at", { ascending: false })
        .limit(5000),
      supabase.from("articles").select("id,title"),
      supabase
        .from("page_views")
        .select("visitor_id,dwell_ms,created_at")
        .order("created_at", { ascending: false })
        .limit(50000),
      supabase
        .from("search_result_clicks")
        .select("article_id")
        .order("created_at", { ascending: false })
        .limit(10000),
    ]);
  return {
    views: (views.data ?? []) as AnalyticsRaw["views"],
    feedback: (feedback.data ?? []) as AnalyticsRaw["feedback"],
    searches: (searches.data ?? []) as AnalyticsRaw["searches"],
    articles: (articles.data ?? []) as AnalyticsRaw["articles"],
    pageViews: (pageViews.data ?? []) as AnalyticsRaw["pageViews"],
    searchClicks: (searchClicks.data ?? []) as AnalyticsRaw["searchClicks"],
  };
}
