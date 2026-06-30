import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  LANGUAGES,
  SOURCE_LANGUAGE,
  can,
  canWriteArticle,
  isSourceLanguage,
  type Article,
  type ArticleDraft,
} from "@/lib/types";
import { useAuth } from "@/spa/auth/AuthProvider";
import { useSearchParams } from "@/components/ui/navigation";
import { useAsync } from "@/spa/data/useAsync";
import { fetchArticles } from "@/spa/data/articles";
import {
  fetchArticleById,
  fetchDraftById,
  fetchTemplates,
  fetchTranslation,
  fetchTranslations,
} from "@/spa/data/admin";
import { getDraft } from "@/spa/data/writes";
import Editor from "@/components/Editor";
import type { LanguageVersion } from "@/components/editor/LanguageVersionPicker";
import Loading from "@/spa/pages/Loading";
import NotFound from "@/spa/pages/NotFound";

/** SPA port of src/app/admin/[id]/page.tsx, with per-user private drafts
 *  (source language) + per-language translation editing. */
export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  // Set when a reviewer opens a specific submitted draft from the queue.
  const reviewDraftId = params.get("draft");
  const { role, accessRoles } = useAuth();
  const [language, setLanguage] = useState<string>(SOURCE_LANGUAGE);

  const { data, loading } = useAsync(async () => {
    // Source-language working copy: a reviewer loads the submitted draft, an
    // editor/admin forks (or reopens) their own private draft.
    let draft: ArticleDraft | null = null;
    let reviewing = false;
    if (reviewDraftId && can.review(role)) {
      draft = await fetchDraftById(reviewDraftId);
      reviewing = true;
      if (!draft) return { article: null as null };
    } else if (can.edit(role)) {
      draft = await getDraft(id!);
    }
    const articleId = draft?.article_id ?? id!;
    const article = await fetchArticleById(articleId);
    if (!article) return { article: null as null };

    const [all, templatesFull, translations] = await Promise.all([
      fetchArticles(true),
      can.edit(role) ? fetchTemplates() : Promise.resolve([]),
      fetchTranslations(articleId),
    ]);
    const folders = [...new Set(all.map((a) => a.folder).filter(Boolean))].sort();
    const templates = templatesFull.map((t) => ({
      id: t.id,
      name: t.name,
      content: t.content,
    }));
    // The published content is the diff base for a reviewer comparing a draft.
    const reviewDiffBase = article.published ? article.content : null;
    return { article, draft, reviewing, folders, templates, reviewDiffBase, translations };
  }, [id, role, reviewDraftId]);

  const docState = useAsync(
    async () =>
      isSourceLanguage(language)
        ? { tr: null }
        : { tr: await fetchTranslation(id!, language) },
    [id, language],
  );

  if (loading || !data) return <Loading />;
  if (!data.article) return <NotFound message="Article not found" />;
  if (docState.loading || !docState.data) return <Loading />;

  const { article, draft, reviewing, folders, templates, reviewDiffBase, translations } =
    data;
  const isTranslation = !isSourceLanguage(language);

  const languageVersions: LanguageVersion[] = LANGUAGES.map((l) =>
    isSourceLanguage(l.code)
      ? { language: l.code, status: article.status }
      : {
          language: l.code,
          status:
            translations.find((t) => t.language === l.code)?.status ?? null,
        },
  );

  // The document the editor edits: the caller's private draft (source) or the
  // translation's title/content overlaid on the article's read-only metadata.
  const tr = docState.data.tr;
  const doc: Article = isTranslation
    ? {
        ...article,
        title: tr?.title ?? "",
        content: tr?.content ?? "",
        status: tr?.status ?? "draft",
        published: tr?.published ?? false,
        review_note: tr?.review_note ?? null,
        submitted_by: tr?.submitted_by ?? null,
        submitted_at: tr?.submitted_at ?? null,
        reviewed_by: tr?.reviewed_by ?? null,
        reviewed_at: tr?.reviewed_at ?? null,
      }
    : draft
      ? {
          ...article,
          title: draft.title,
          slug: draft.slug,
          folder: draft.folder,
          content: draft.content,
          tags: draft.tags,
          access_roles: draft.access_roles,
          context_keys: draft.context_keys,
          status: draft.status,
          published: article.published,
          review_note: draft.review_note,
        }
      : article;

  // Author may edit their own draft; a reviewer opening a submission is read-only.
  const canEdit =
    !isTranslation && draft != null && !reviewing
      ? can.edit(role) && canWriteArticle(article.access_roles, accessRoles, role)
      : isTranslation
        ? can.edit(role) && canWriteArticle(article.access_roles, accessRoles, role)
        : false;

  return (
    <Editor
      key={`${language}:${reviewDraftId ?? "own"}`}
      article={doc}
      canEdit={canEdit}
      canDelete={can.delete(role)}
      canReview={can.review(role)}
      reviewDiffBase={isTranslation ? null : reviewDiffBase}
      folders={folders}
      templates={templates}
      isAdmin={role === "admin"}
      userAccessRoles={accessRoles}
      language={language}
      isTranslation={isTranslation}
      languageVersions={languageVersions}
      onLanguageChange={setLanguage}
      articleDraftId={!isTranslation && draft ? draft.id : undefined}
      draftStatus={draft?.status}
      reviewing={reviewing}
    />
  );
}
