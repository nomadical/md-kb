import { useEffect } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa6";
import Link from "@/components/ui/AppLink";
import { languageLabel, normalizeLanguage } from "@/lib/types";
import { slugify, stripLeadingH1 } from "@/lib/markdown";
import MarkdownView from "@/components/MarkdownView";
import AccessBadges from "@/components/AccessBadges";
import ArticleToc from "@/components/ArticleToc";
import ArticleEngagement from "@/components/ArticleEngagement";
import { useArticle } from "@/spa/data/articles";
import { useSettings } from "@/spa/data/settings";
import type { PublicOutletContext } from "@/spa/pages/public/PublicLayout";
import Loading from "@/spa/pages/Loading";
import NotFound from "@/spa/pages/NotFound";

/** SPA port of src/app/(public)/kb/[slug]/page.tsx. */
export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const { t, i18n } = useTranslation();
  const language = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language);
  const { article, displayedLanguage, requestedLanguage, loading } = useArticle(
    slug,
    language,
  );
  const { articles } = useOutletContext<PublicOutletContext>();
  const { tagsEnabled, feedbackWidget, fallbackToSource, siteName } = useSettings();

  useEffect(() => {
    if (article) document.title = `${article.title} · ${siteName}`;
  }, [article, siteName]);

  if (loading) return <Loading />;
  if (!article) return <NotFound message="Article not found" />;

  // Requested a translation we don't have published → we fell back to English.
  const usedFallback = displayedLanguage !== requestedLanguage;
  // Admin disabled fallback → don't show the source; tell the reader instead.
  const unavailable = usedFallback && !fallbackToSource;

  // prev/next within the same category (alphabetical, matching the sidebar).
  const siblings = (articles ?? [])
    .filter((a) => a.folder === article.folder)
    .sort((a, b) => a.title.localeCompare(b.title));
  const idx = siblings.findIndex((a) => a.slug === article.slug);
  const prev = idx > 0 ? siblings[idx - 1] : null;
  const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;

  const body = stripLeadingH1(article.content);
  const hasToc = (body.match(/^#{2,4}\s+\S/gm) ?? []).length >= 2;

  return (
    <div
      className={
        hasToc
          ? "fade-up lg:grid lg:grid-cols-[minmax(0,1fr)_240px] lg:gap-12 2xl:grid-cols-[minmax(0,1fr)_280px]"
          : "fade-up"
      }
    >
      <article className="min-w-0">
        <nav className="mb-4 flex items-center gap-1.5 text-[13px] text-ink-mut">
          <Link href="/" className="hover:text-ink-accent">
            Knowledge Base
          </Link>
          {article.folder && (
            <>
              <span>/</span>
              <Link
                href={`/c/${slugify(article.folder)}`}
                className="hover:text-ink-accent"
              >
                {article.folder}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="truncate text-ink-fg">{article.title}</span>
        </nav>

        <header className="mb-6 border-b border-ink-line pb-4">
          <h1 className="text-3xl font-semibold tracking-tight">
            {article.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-ink-mut">
            <span>
              Updated {new Date(article.updated_at).toLocaleDateString()}
            </span>
            {!article.published && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-700">
                draft
              </span>
            )}
            {tagsEnabled &&
              article.tags.map((t) => (
                <span key={t} className="rounded bg-black/5 px-1.5 py-0.5">
                  #{t}
                </span>
              ))}
            <AccessBadges roles={article.access_roles} />
          </div>
          {usedFallback && (
            <p className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-700">
              {unavailable
                ? t("reader.notAvailable", {
                    language: languageLabel(requestedLanguage),
                  })
                : t("reader.notTranslated", {
                    language: languageLabel(requestedLanguage),
                  })}
            </p>
          )}
        </header>

        {!unavailable && (
          <>
            <div id="article-content">
              <MarkdownView source={body} />
            </div>

            {feedbackWidget && <ArticleEngagement articleId={article.id} />}
          </>
        )}

        {(prev || next) && (
          <nav className="mt-12 grid gap-3 border-t border-ink-line pt-6 sm:grid-cols-2">
            {prev ? (
              <Link
                href={`/kb/${prev.slug}`}
                className="group rounded-lg border border-ink-line bg-ink-panel p-4 transition-all hover:-translate-y-0.5 hover:border-ink-accent hover:shadow-sm"
              >
                <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-ink-mut">
                  <FaArrowLeft /> {t("reader.previous")}
                </div>
                <div className="mt-1 font-medium group-hover:text-ink-accent">
                  {prev.title}
                </div>
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link
                href={`/kb/${next.slug}`}
                className="group rounded-lg border border-ink-line bg-ink-panel p-4 text-right transition-all hover:-translate-y-0.5 hover:border-ink-accent hover:shadow-sm"
              >
                <div className="flex items-center justify-end gap-1.5 text-[11px] uppercase tracking-wide text-ink-mut">
                  {t("reader.next")} <FaArrowRight />
                </div>
                <div className="mt-1 font-medium group-hover:text-ink-accent">
                  {next.title}
                </div>
              </Link>
            )}
          </nav>
        )}
      </article>

      {hasToc && (
        <aside className="hidden lg:block">
          <div className="sticky top-10">
            <ArticleToc containerId="article-content" />
          </div>
        </aside>
      )}
    </div>
  );
}
