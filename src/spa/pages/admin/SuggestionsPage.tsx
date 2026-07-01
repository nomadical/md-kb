import { useMemo, useState } from "react";
import { FaPenClip, FaArrowUpRightFromSquare } from "react-icons/fa6";
import { useTranslation } from "react-i18next";
import { useAsync } from "@/spa/data/useAsync";
import {
  fetchSuggestions,
  updateSuggestionStatus,
  type SuggestionRow,
  type SuggestionStatus,
} from "@/spa/data/admin";
import Link from "@/components/ui/AppLink";
import Loading from "@/spa/pages/Loading";

const STATUS_STYLE: Record<SuggestionStatus, string> = {
  open: "bg-amber-100 text-amber-700",
  resolved: "bg-emerald-100 text-emerald-700",
  dismissed: "bg-slate-200 text-slate-600",
};

function fmt(ts: string): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Editor triage queue for reader-submitted corrections ("report a mistake"). */
export default function SuggestionsPage() {
  const { t } = useTranslation();
  const { data, loading, reload } = useAsync(fetchSuggestions, []);
  const [filter, setFilter] = useState<SuggestionStatus | "all">("open");
  // Optimistic local status overlay so a triaged row updates without a refetch.
  const [overrides, setOverrides] = useState<Record<string, SuggestionStatus>>(
    {},
  );

  const rows = useMemo(
    () =>
      (data ?? []).map((r) =>
        overrides[r.id] ? { ...r, status: overrides[r.id] } : r,
      ),
    [data, overrides],
  );
  const filtered = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.status === filter)),
    [rows, filter],
  );

  async function setStatus(row: SuggestionRow, status: SuggestionStatus) {
    setOverrides((o) => ({ ...o, [row.id]: status }));
    await updateSuggestionStatus(row.id, status);
  }

  if (loading || !data) return <Loading />;

  const counts = {
    all: rows.length,
    open: rows.filter((r) => r.status === "open").length,
    resolved: rows.filter((r) => r.status === "resolved").length,
    dismissed: rows.filter((r) => r.status === "dismissed").length,
  };
  const tabs: (SuggestionStatus | "all")[] = [
    "open",
    "resolved",
    "dismissed",
    "all",
  ];

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 sm:px-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <FaPenClip className="text-ink-accent" /> {t("nav.suggestions")}
        </h1>
        <button
          onClick={reload}
          className="rounded-lg border border-ink-line px-2.5 py-1.5 text-[12px] text-ink-mut hover:border-ink-accent hover:text-ink-accent"
        >
          {t("admin.suggestions.refresh")}
        </button>
      </div>
      <p className="mt-1 text-[13px] text-ink-mut">
        {t("admin.suggestions.subtitle")}
      </p>

      <div className="mt-5 flex flex-wrap gap-1.5">
        {tabs.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
              filter === s
                ? "bg-ink-accent text-white"
                : "border border-ink-line text-ink-mut hover:border-ink-accent hover:text-ink-accent"
            }`}
          >
            {t(`admin.suggestions.tabs.${s}`)} ({counts[s]})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-ink-line p-8 text-center text-ink-mut">
          {t("admin.suggestions.empty")}
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {filtered.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border border-ink-line bg-ink-panel p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span
                    className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[r.status]}`}
                  >
                    {t(`admin.suggestions.tabs.${r.status}`)}
                  </span>
                  <span className="ml-2 text-[12px] text-ink-mut">
                    {fmt(r.created_at)}
                  </span>
                </div>
                {r.article_slug ? (
                  <Link
                    href={`/kb/${r.article_slug}`}
                    className="inline-flex shrink-0 items-center gap-1 text-[12px] font-medium text-ink-accent hover:underline"
                  >
                    {r.article_title ?? r.article_slug}
                    <FaArrowUpRightFromSquare className="text-[10px]" />
                  </Link>
                ) : (
                  <span className="text-[12px] text-ink-mut">
                    {r.article_title ?? "—"}
                  </span>
                )}
              </div>

              {r.excerpt && (
                <blockquote className="mt-3 border-l-2 border-ink-line pl-3 text-[13px] italic text-ink-mut">
                  “{r.excerpt}”
                </blockquote>
              )}
              <p className="mt-2 whitespace-pre-wrap text-[14px]">
                {r.suggestion}
              </p>
              {r.email && (
                <a
                  href={`mailto:${r.email}`}
                  className="mt-1 inline-block text-[12px] text-ink-accent hover:underline"
                >
                  {r.email}
                </a>
              )}

              <div className="mt-3 flex gap-2 border-t border-ink-line pt-3">
                {r.status !== "resolved" && (
                  <button
                    onClick={() => setStatus(r, "resolved")}
                    className="rounded-md border border-ink-line px-2.5 py-1 text-[12px] hover:border-emerald-400 hover:text-emerald-700"
                  >
                    {t("admin.suggestions.markResolved")}
                  </button>
                )}
                {r.status !== "dismissed" && (
                  <button
                    onClick={() => setStatus(r, "dismissed")}
                    className="rounded-md border border-ink-line px-2.5 py-1 text-[12px] hover:border-slate-400 hover:text-slate-600"
                  >
                    {t("admin.suggestions.dismiss")}
                  </button>
                )}
                {r.status !== "open" && (
                  <button
                    onClick={() => setStatus(r, "open")}
                    className="rounded-md border border-ink-line px-2.5 py-1 text-[12px] hover:border-amber-400 hover:text-amber-700"
                  >
                    {t("admin.suggestions.reopen")}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
