import { FaClipboardCheck } from "react-icons/fa6";
import { useTranslation } from "react-i18next";
import Link from "@/components/ui/AppLink";
import { useAsync } from "@/spa/data/useAsync";
import { fetchReviewQueue } from "@/spa/data/admin";
import Loading from "@/spa/pages/Loading";

/** SPA port of src/app/admin/review/page.tsx. */
export default function ReviewQueuePage() {
  const { t } = useTranslation();
  const { data: rows, loading } = useAsync(fetchReviewQueue, []);
  if (loading || !rows) return <Loading />;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 sm:px-8">
      <h1 className="flex items-center gap-2 text-xl font-semibold">
        <FaClipboardCheck className="text-ink-accent" /> {t("nav.reviewQueue")}
      </h1>
      <p className="mt-1 text-[13px] text-ink-mut">
        {t("admin.review.subtitle")}
      </p>

      {rows.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-ink-line p-8 text-center text-ink-mut">
          {t("admin.review.empty")}
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-ink-line overflow-hidden rounded-lg border border-ink-line">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                href={`/admin/${r.articleId}?draft=${r.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-ink-accent/5"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-medium">
                    {r.title}
                  </span>
                  <span className="block truncate text-[12px] text-ink-mut">
                    {r.folder || t("admin.review.root")}
                    {r.submittedByEmail
                      ? t("admin.review.byline", { email: r.submittedByEmail })
                      : ""}
                  </span>
                </span>
                <span className="shrink-0 text-[12px] text-ink-mut">
                  {r.submitted_at
                    ? new Date(r.submitted_at).toLocaleDateString()
                    : "—"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
