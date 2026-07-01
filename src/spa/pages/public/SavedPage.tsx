import { useOutletContext } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FaBookmark } from "react-icons/fa6";
import Link from "@/components/ui/AppLink";
import AccessBadges from "@/components/AccessBadges";
import { useSavedSlugs } from "@/lib/savedArticles";
import type { PublicOutletContext } from "@/spa/pages/public/PublicLayout";
import Loading from "@/spa/pages/Loading";

/** The reader's bookmarked articles (client-only, from localStorage). */
export default function SavedPage() {
  const { t } = useTranslation();
  const { articles, loading } = useOutletContext<PublicOutletContext>();
  const savedSlugs = useSavedSlugs();

  if (loading) return <Loading />;

  // Preserve saved order (most-recently-saved first); drop slugs that no longer
  // resolve (unpublished/removed, or not visible to this reader).
  const bySlug = new Map(articles.map((a) => [a.slug, a]));
  const saved = savedSlugs.map((s) => bySlug.get(s)).filter((a) => a != null);

  return (
    <div className="fade-up mx-auto max-w-3xl">
      <nav className="mb-4 flex items-center gap-1.5 text-[13px] text-ink-mut">
        <Link href="/" className="hover:text-ink-accent">
          Knowledge Base
        </Link>
        <span>/</span>
        <span className="text-ink-fg">{t("saved.title")}</span>
      </nav>

      <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <FaBookmark className="text-ink-accent" /> {t("saved.title")}
      </h1>
      <p className="mt-1 text-[14px] text-ink-mut">
        {t("saved.count", { count: saved.length })}
      </p>

      {saved.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-ink-line p-10 text-center text-ink-mut">
          {t("saved.empty")}
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {saved.map((a) => (
            <li key={a.id}>
              <Link
                href={`/kb/${a.slug}`}
                className="group block rounded-xl border border-ink-line bg-ink-panel p-4 transition-all hover:-translate-y-0.5 hover:border-ink-accent hover:shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate font-medium group-hover:text-ink-accent">
                      {a.title}
                    </span>
                    {a.folder && (
                      <span className="block text-[12px] text-ink-mut">
                        {a.folder}
                      </span>
                    )}
                  </span>
                  <AccessBadges roles={a.access_roles} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
