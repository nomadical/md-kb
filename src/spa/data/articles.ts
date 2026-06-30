import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ARTICLE_LIST_COLUMNS,
  SOURCE_LANGUAGE,
  isSourceLanguage,
  type Article,
  type ArticleMeta,
} from "@/lib/types";

// Browser-side data layer (replaces the server-only src/lib/articles.ts during
// the Vite migration). RLS does the same filtering it did server-side: anon /
// entitled users see published rows; staff see drafts too.

/** List article metadata (published only by default; staff pass includeDrafts).
 *  When `language` is a non-source language, each article's `title` is overlaid
 *  with its PUBLISHED translation's title (falling back to the source title),
 *  so sidebars/lists/search show localized names — matching the reader. */
export async function fetchArticles(
  includeDrafts = false,
  language: string = SOURCE_LANGUAGE,
): Promise<ArticleMeta[]> {
  const supabase = createClient();
  let query = supabase
    .from("articles")
    .select(ARTICLE_LIST_COLUMNS)
    .is("deleted_at", null)
    .order("folder", { ascending: true })
    .order("title", { ascending: true });
  if (!includeDrafts) query = query.eq("published", true);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const list = (data ?? []) as ArticleMeta[];
  if (isSourceLanguage(language) || list.length === 0) return list;

  // Overlay published translation titles for the chosen language.
  const { data: trs } = await supabase
    .from("article_translations")
    .select("article_id,title")
    .eq("language", language)
    .eq("published", true);
  if (!trs || trs.length === 0) return list;
  const titleById = new Map(
    (trs as { article_id: string; title: string }[]).map((t) => [t.article_id, t.title]),
  );
  return list.map((a) => (titleById.has(a.id) ? { ...a, title: titleById.get(a.id)! } : a));
}

/** Fetch a single article by slug (RLS decides whether drafts are visible). */
export async function fetchArticle(slug: string): Promise<Article | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Article) ?? null;
}

export type LocalizedArticle = {
  article: Article | null;
  /** The language actually shown — may differ from `requestedLanguage` when a
   *  published translation doesn't exist and we fell back to the source. */
  displayedLanguage: string;
  requestedLanguage: string;
};

/** Fetch an article in `language`, overlaying a PUBLISHED translation onto the
 *  source content. Falls back to the source language when no published
 *  translation exists (so a page is never blank in an unsupported language). */
export async function fetchArticleLocalized(
  slug: string,
  language: string,
): Promise<LocalizedArticle> {
  const article = await fetchArticle(slug);
  if (!article || isSourceLanguage(language))
    return { article, displayedLanguage: SOURCE_LANGUAGE, requestedLanguage: language };

  const { data } = await createClient()
    .from("article_translations")
    .select("title,content")
    .eq("article_id", article.id)
    .eq("language", language)
    .eq("published", true)
    .maybeSingle();

  if (!data)
    return { article, displayedLanguage: SOURCE_LANGUAGE, requestedLanguage: language };

  return {
    article: { ...article, title: data.title as string, content: data.content as string },
    displayedLanguage: language,
    requestedLanguage: language,
  };
}

/** Hook: the article list (localized to `language`), loading state, and error. */
export function useArticles(
  includeDrafts = false,
  language: string = SOURCE_LANGUAGE,
) {
  const [articles, setArticles] = useState<ArticleMeta[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setArticles(null);
    setError(null);
    fetchArticles(includeDrafts, language)
      .then((a) => active && setArticles(a))
      .catch((e: unknown) => active && setError(String(e)));
    return () => {
      active = false;
    };
  }, [includeDrafts, language]);
  return { articles, loading: articles === null && !error, error };
}

/** Hook: a single article in `language` (default = source). `article === null`
 *  means not found / not permitted. `displayedLanguage` reports the language the
 *  content is actually in (falls back to source when no published translation). */
export function useArticle(
  slug: string | undefined,
  language: string = SOURCE_LANGUAGE,
) {
  // undefined = still loading; null = resolved-but-missing.
  const [article, setArticle] = useState<Article | null | undefined>(undefined);
  const [displayedLanguage, setDisplayedLanguage] = useState(SOURCE_LANGUAGE);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!slug) {
      setArticle(null);
      return;
    }
    let active = true;
    setArticle(undefined);
    setError(null);
    fetchArticleLocalized(slug, language)
      .then((r) => {
        if (!active) return;
        setArticle(r.article);
        setDisplayedLanguage(r.displayedLanguage);
      })
      .catch((e: unknown) => active && setError(String(e)));
    return () => {
      active = false;
    };
  }, [slug, language]);
  return {
    article,
    displayedLanguage,
    requestedLanguage: language,
    loading: article === undefined && !error,
    error,
  };
}
