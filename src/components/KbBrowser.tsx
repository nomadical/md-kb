import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Link from "@/components/ui/AppLink";
import {
  FaMagnifyingGlass,
  FaTableCellsLarge,
  FaListUl,
  FaFolderOpen,
  FaRegFileLines,
} from "react-icons/fa6";
import type { ArticleMeta } from "@/lib/types";
import AccessBadges from "@/components/AccessBadges";

type View = "grid" | "list";

/** Browse-all page: client-side filtered search over the RLS-scoped article
 *  list, with a grid/list toggle (persisted) and a category filter. */
export default function KbBrowser({ articles }: { articles: ArticleMeta[] }) {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const [folder, setFolder] = useState("");
  const [view, setView] = useState<View>("grid");

  useEffect(() => {
    const saved = localStorage.getItem("kb-view");
    if (saved === "grid" || saved === "list") setView(saved);
  }, []);
  const pickView = (v: View) => {
    setView(v);
    localStorage.setItem("kb-view", v);
  };

  const categories = useMemo(
    () =>
      [
        ...new Set(articles.map((a) => a.folder.split("/")[0] || "General")),
      ].sort(),
    [articles],
  );

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return articles
      .filter(
        (a) => !folder || (a.folder.split("/")[0] || "General") === folder,
      )
      .filter((a) => {
        if (!needle) return true;
        return (
          a.title.toLowerCase().includes(needle) ||
          a.folder.toLowerCase().includes(needle) ||
          a.tags.some((t) => t.toLowerCase().includes(needle))
        );
      })
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [articles, q, folder]);

  return (
    <div className="fade-up">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("browse.title")}
        </h1>
        <p className="mt-1 text-[14px] text-ink-mut">
          {t("browse.available", { count: articles.length })}
        </p>
      </header>

      {/* controls */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <FaMagnifyingGlass className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-mut" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("browse.filterPlaceholder")}
            className="w-full rounded-xl border border-ink-line bg-white py-2.5 pl-10 pr-4 text-[14px] shadow-sm outline-none focus:border-ink-accent"
          />
        </div>
        <select
          value={folder}
          onChange={(e) => setFolder(e.target.value)}
          className="rounded-xl border border-ink-line bg-white px-3 py-2.5 text-[14px] outline-none focus:border-ink-accent"
        >
          <option value="">{t("browse.allCategories")}</option>
          {categories.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <div className="flex overflow-hidden rounded-xl border border-ink-line">
          <button
            onClick={() => pickView("grid")}
            aria-label={t("browse.gridView")}
            aria-pressed={view === "grid"}
            className={`px-3 py-2.5 ${
              view === "grid"
                ? "bg-ink-accent text-white"
                : "bg-white text-ink-mut hover:text-ink-accent"
            }`}
          >
            <FaTableCellsLarge />
          </button>
          <button
            onClick={() => pickView("list")}
            aria-label={t("browse.listView")}
            aria-pressed={view === "list"}
            className={`border-l border-ink-line px-3 py-2.5 ${
              view === "list"
                ? "bg-ink-accent text-white"
                : "bg-white text-ink-mut hover:text-ink-accent"
            }`}
          >
            <FaListUl />
          </button>
        </div>
      </div>

      <p className="mb-3 text-[12px] text-ink-mut">
        {t("browse.resultCount", { count: results.length })}
      </p>

      {results.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-line p-10 text-center text-ink-mut">
          {t("browse.noMatch")}
        </div>
      ) : view === "grid" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {results.map((a) => (
            <Link
              key={a.id}
              href={`/kb/${a.slug}`}
              className="group flex flex-col rounded-xl border border-ink-line bg-ink-panel p-4 transition-all hover:-translate-y-0.5 hover:border-ink-accent hover:shadow-sm"
            >
              <div className="flex items-center gap-1.5 text-[12px] text-ink-mut">
                <FaFolderOpen /> {a.folder || "General"}
              </div>
              <div className="mt-2 font-medium group-hover:text-ink-accent">
                {a.title}
              </div>
              <div className="mt-auto pt-3">
                <AccessBadges roles={a.access_roles} />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <ul className="divide-y divide-ink-line overflow-hidden rounded-xl border border-ink-line bg-ink-panel">
          {results.map((a) => (
            <li key={a.id}>
              <Link
                href={`/kb/${a.slug}`}
                className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-ink-bg"
              >
                <FaRegFileLines className="shrink-0 text-ink-mut" />
                <span className="min-w-0 flex-1 truncate font-medium group-hover:text-ink-accent">
                  {a.title}
                </span>
                <span className="hidden shrink-0 text-[12px] text-ink-mut sm:block">
                  {a.folder || "General"}
                </span>
                <AccessBadges roles={a.access_roles} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
