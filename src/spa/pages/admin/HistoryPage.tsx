import { useParams, useSearchParams } from "react-router-dom";
import { FaArrowLeftLong } from "react-icons/fa6";
import { useTranslation } from "react-i18next";
import Link from "@/components/ui/AppLink";
import { can, isSourceLanguage, languageLabel, normalizeLanguage } from "@/lib/types";
import { useAuth } from "@/spa/auth/AuthProvider";
import { useAsync } from "@/spa/data/useAsync";
import { fetchRevisions, fetchTranslationRevisions } from "@/spa/data/admin";
import RevisionHistory from "@/components/RevisionHistory";
import Loading from "@/spa/pages/Loading";
import NotFound from "@/spa/pages/NotFound";

/** SPA port of src/app/admin/[id]/history/page.tsx. `?lang=` selects a
 *  translation's history; absent / source = the article's own revisions. */
export default function HistoryPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const language = normalizeLanguage(params.get("lang"));
  const source = isSourceLanguage(language);
  const { role } = useAuth();
  const { data, loading } = useAsync(
    () => (source ? fetchRevisions(id!) : fetchTranslationRevisions(id!, language)),
    [id, language],
  );

  if (loading || !data) return <Loading />;
  if (data.title === null)
    return <NotFound message={t("admin.revisions.articleNotFound")} />;

  return (
    <div className="mx-auto max-w-3xl overflow-y-auto px-6 py-8 sm:px-8">
      <Link
        href={`/admin/${id}`}
        className="inline-flex items-center gap-1.5 text-[13px] text-ink-accent hover:underline"
      >
        <FaArrowLeftLong className="text-[11px]" /> {t("admin.revisions.back")}
      </Link>
      <h1 className="mt-3 text-xl font-semibold">
        {t("admin.revisions.title", { title: data.title })}
        {!source && (
          <span className="ml-2 rounded bg-ink-accent/10 px-2 py-0.5 text-[12px] font-medium text-ink-accent">
            {languageLabel(language)}
          </span>
        )}
      </h1>
      <p className="mt-1 text-[13px] text-ink-mut">
        {t("admin.revisions.subtitle")}
      </p>
      <div className="mt-6">
        <RevisionHistory
          articleId={id!}
          revisions={data.rows}
          canRestore={can.edit(role)}
          language={language}
        />
      </div>
    </div>
  );
}
