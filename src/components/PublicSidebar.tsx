import { useTranslation } from "react-i18next";
import Link from "@/components/ui/AppLink";
import { FaLayerGroup } from "react-icons/fa6";
import ArticleTree from "@/components/ArticleTree";
import type { ArticleMeta } from "@/lib/types";

/** Public KB explorer contents: "browse all" link + the article tree. The
 *  surrounding chrome (rail/drawer, brand, switchers) is provided by AppShell
 *  + AppBar. */
export default function PublicSidebar({
  articles,
  loading = false,
}: {
  articles: ArticleMeta[];
  /** Article list still loading — show a skeleton instead of an empty tree. */
  loading?: boolean;
}) {
  const { t } = useTranslation();

  // While the list loads, a skeleton (not an empty tree) so the sidebar never
  // flashes "no articles".
  const tree = loading ? (
    <div className="animate-pulse space-y-2.5 px-4 py-4">
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          className="h-3 rounded bg-black/[0.06]"
          style={{ width: `${78 - (i % 4) * 14}%` }}
        />
      ))}
    </div>
  ) : (
    <ArticleTree items={articles} basePath="/kb" linkKey="slug" />
  );

  return (
    <>
      <Link
        href="/kb"
        className="flex items-center gap-2 border-b border-ink-line px-4 py-2.5 text-[13px] font-medium text-ink-mut hover:text-ink-accent"
      >
        <FaLayerGroup /> {t("nav.browseAllArticles")}
      </Link>
      <div className="min-h-0 flex-1 overflow-y-auto">{tree}</div>
    </>
  );
}