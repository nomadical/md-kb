import { FaFolderOpen, FaArrowRight } from "react-icons/fa6";
import { useTranslation } from "react-i18next";
import Link from "@/components/ui/AppLink";
import { slugify } from "@/lib/markdown";
import { useOutletContext } from "react-router-dom";
import HomeSearch from "@/components/HomeSearch";
import type { PublicOutletContext } from "@/spa/pages/public/PublicLayout";
import Loading from "@/spa/pages/Loading";

/** SPA port of src/app/(public)/page.tsx. */
export default function HomePage() {
  const { t } = useTranslation();
  const { articles, loading } = useOutletContext<PublicOutletContext>();
  if (loading) return <Loading />;

  const byCategory = new Map<string, number>();
  for (const a of articles) {
    const top = a.folder.split("/")[0] || "General";
    byCategory.set(top, (byCategory.get(top) ?? 0) + 1);
  }
  const categories = [...byCategory.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  );

  const recent = [...articles]
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 6);

  return (
    <div className="fade-up mx-auto max-w-4xl">
      <HomeSearch articles={articles} recent={recent} />

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-mut">
            {t("home.browseByCategory")}
          </h2>
          <Link
            href="/kb"
            className="flex items-center gap-1.5 text-[13px] font-medium text-ink-accent hover:underline"
          >
            {t("common.browseAll")} <FaArrowRight className="text-[11px]" />
          </Link>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map(([name, count]) => (
            <Link
              key={name}
              href={`/c/${slugify(name)}`}
              className="group rounded-xl border border-ink-line bg-ink-panel p-5 transition-all hover:-translate-y-0.5 hover:border-ink-accent hover:shadow-sm"
            >
              <FaFolderOpen className="text-2xl text-ink-accent" />
              <div className="mt-2 font-medium group-hover:text-ink-accent">
                {name}
              </div>
              <div className="text-[12px] text-ink-mut">
                {t("common.articleCount", { count })}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
