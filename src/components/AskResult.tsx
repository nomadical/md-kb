import { useTranslation } from "react-i18next";
import Link from "@/components/ui/AppLink";

export type Source = { slug: string; title: string };
export type AskResult = {
  answer: string | null;
  sources: Source[];
  grounded: boolean;
  error?: string;
};

/** Renders an AI answer (or its loading / empty / error states). Presentational
 *  only — the request lives with whatever owns the question input. */
export default function AskResult({
  result,
  loading,
}: {
  result: AskResult | null;
  loading: boolean;
}) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="mt-6 animate-pulse space-y-2">
        <div className="h-4 w-full rounded bg-black/[0.06]" />
        <div className="h-4 w-5/6 rounded bg-black/[0.06]" />
        <div className="h-4 w-4/6 rounded bg-black/[0.06]" />
      </div>
    );
  }

  if (!result) return null;

  if (result.error) {
    return (
      <p className="mt-6 rounded-lg bg-red-50 p-4 text-[14px] text-red-700">
        {result.error}
      </p>
    );
  }

  return (
    <div className="mt-6">
      {result.answer ? (
        <div className="prose max-w-none whitespace-pre-wrap rounded-xl border border-ink-line bg-ink-panel p-5 text-[15px]">
          {result.answer}
        </div>
      ) : result.sources.length > 0 ? (
        <p className="text-[14px] text-ink-mut">{t("ask.noDirectAnswer")}</p>
      ) : (
        <p className="text-[14px] text-ink-mut">{t("ask.nothingFound")}</p>
      )}

      {result.sources.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-mut">
            {t("ask.sources")}
          </p>
          <ul className="space-y-2">
            {result.sources.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/kb/${s.slug}`}
                  className="block rounded-lg border border-ink-line bg-ink-panel px-4 py-2.5 text-[14px] font-medium transition-all hover:-translate-y-0.5 hover:border-ink-accent hover:text-ink-accent"
                >
                  {s.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.answer && result.grounded && (
        <p className="mt-3 text-[12px] text-ink-mut">{t("ask.groundedNote")}</p>
      )}
    </div>
  );
}
