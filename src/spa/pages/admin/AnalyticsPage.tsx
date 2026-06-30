import {
  FaEye,
  FaUsers,
  FaArrowRotateLeft,
  FaClock,
  FaChartLine,
  FaThumbsUp,
  FaThumbsDown,
} from "react-icons/fa6";
import { useTranslation } from "react-i18next";
import { useAsync } from "@/spa/data/useAsync";
import { fetchAnalytics } from "@/spa/data/admin";
import TrendChart from "@/components/TrendChart";
import Loading from "@/spa/pages/Loading";

function fmtDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

/** SPA port of src/app/admin/analytics/page.tsx (aggregation unchanged). */
export default function AnalyticsPage() {
  const { t } = useTranslation();
  const { data, loading } = useAsync(fetchAnalytics, []);
  if (loading || !data) return <Loading />;

  const { views, feedback, searches, articles, pageViews, searchClicks } = data;

  const titleOf = new Map<string, string>(articles.map((a) => [a.id, a.title]));

  // ---- app-wide stats (page_views) ----
  const visits = pageViews.length;
  const visitorDays = new Map<string, Set<string>>();
  for (const p of pageViews) {
    if (!p.visitor_id) continue;
    const set = visitorDays.get(p.visitor_id) ?? new Set<string>();
    set.add(p.created_at.slice(0, 10));
    visitorDays.set(p.visitor_id, set);
  }
  const uniqueVisitors = visitorDays.size;
  const recurringVisitors = [...visitorDays.values()].filter((d) => d.size > 1)
    .length;
  const recurringPct = uniqueVisitors
    ? Math.round((recurringVisitors / uniqueVisitors) * 100)
    : 0;
  const dwells = pageViews
    .map((p) => p.dwell_ms ?? 0)
    .filter((d) => d >= 1000 && d <= 30 * 60 * 1000);
  const avgStay = dwells.length
    ? fmtDuration(dwells.reduce((a, b) => a + b, 0) / dwells.length)
    : "—";

  // ---- visits over the last 14 days ----
  const days: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    days.push({ key: d.toISOString().slice(0, 10), label: String(d.getDate()) });
  }
  const byDay = new Map<string, number>();
  for (const p of pageViews) {
    const k = p.created_at.slice(0, 10);
    byDay.set(k, (byDay.get(k) ?? 0) + 1);
  }
  const series = days.map((d) => ({ ...d, count: byDay.get(d.key) ?? 0 }));

  // ---- article-level ----
  const viewCounts = new Map<string, number>();
  for (const v of views)
    viewCounts.set(v.article_id, (viewCounts.get(v.article_id) ?? 0) + 1);
  const topViewed = [...viewCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const help = new Map<string, { up: number; down: number }>();
  for (const f of feedback) {
    const h = help.get(f.article_id) ?? { up: 0, down: 0 };
    if (f.helpful) h.up++;
    else h.down++;
    help.set(f.article_id, h);
  }
  const helpfulness = [...help.entries()]
    .map(([id, h]) => ({ id, ...h, total: h.up + h.down }))
    .sort((a, b) => a.up / a.total - b.up / b.total);

  const zeroCounts = new Map<string, number>();
  const termCounts = new Map<string, number>();
  for (const s of searches) {
    const q = s.query.trim().toLowerCase();
    if (!q) continue;
    termCounts.set(q, (termCounts.get(q) ?? 0) + 1);
    if (s.result_count === 0) zeroCounts.set(q, (zeroCounts.get(q) ?? 0) + 1);
  }
  const zeroSearches = [...zeroCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  const topTerms = [...termCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const clickCounts = new Map<string, number>();
  for (const c of searchClicks)
    if (c.article_id)
      clickCounts.set(c.article_id, (clickCounts.get(c.article_id) ?? 0) + 1);
  const topClicked = [...clickCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const comments = feedback.filter((f) => f.comment).slice(0, 10);

  return (
    <div className="mx-auto max-w-6xl overflow-y-auto px-6 py-8 sm:px-8">
      <h1 className="text-xl font-semibold">{t("nav.analytics")}</h1>
      <p className="mt-1 text-[13px] text-ink-mut">
        {t("admin.analytics.subtitle")}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={<FaEye />}
          label={t("admin.analytics.pageVisits")}
          value={visits.toLocaleString()}
        />
        <Stat
          icon={<FaUsers />}
          label={t("admin.analytics.uniqueVisitors")}
          value={uniqueVisitors.toLocaleString()}
        />
        <Stat
          icon={<FaArrowRotateLeft />}
          label={t("admin.analytics.recurring")}
          value={`${recurringPct}%`}
          sub={t("admin.analytics.recurringSub", {
            count: recurringVisitors,
            total: uniqueVisitors,
          })}
        />
        <Stat
          icon={<FaClock />}
          label={t("admin.analytics.avgTimeOnPage")}
          value={avgStay}
        />
      </div>

      <section className="mt-6 rounded-xl border border-ink-line bg-ink-panel p-5">
        <h2 className="mb-4 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-ink-mut">
          <FaChartLine /> {t("admin.analytics.visitsLast14Days")}
        </h2>
        {visits === 0 ? <Empty /> : <TrendChart data={series} />}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title={t("admin.analytics.mostViewed")}>
          {topViewed.length === 0 ? (
            <Empty />
          ) : (
            <ol className="space-y-1.5">
              {topViewed.map(([id, n]) => (
                <li key={id} className="flex justify-between gap-3 text-[13px]">
                  <span className="truncate">{titleOf.get(id) ?? id}</span>
                  <span className="shrink-0 font-medium text-ink-mut">{n}</span>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <Panel title={t("admin.analytics.needsAttention")}>
          {helpfulness.length === 0 ? (
            <Empty />
          ) : (
            <ol className="space-y-1.5">
              {helpfulness.slice(0, 10).map((h) => (
                <li key={h.id} className="flex justify-between gap-3 text-[13px]">
                  <span className="truncate">{titleOf.get(h.id) ?? h.id}</span>
                  <span className="shrink-0 font-medium">
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                      {h.up} <FaThumbsUp />
                    </span>{" "}
                    <span className="inline-flex items-center gap-1 text-red-600">
                      {h.down} <FaThumbsDown />
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <Panel title={t("admin.analytics.mostSearched")}>
          {topTerms.length === 0 ? (
            <Empty />
          ) : (
            <ol className="space-y-1.5">
              {topTerms.map(([q, n]) => (
                <li key={q} className="flex justify-between gap-3 text-[13px]">
                  <span className="truncate">“{q}”</span>
                  <span className="shrink-0 font-medium text-ink-mut">
                    {t("admin.analytics.timesShort", { count: n })}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <Panel title={t("admin.analytics.mostOpenedFromSearch")}>
          {topClicked.length === 0 ? (
            <Empty />
          ) : (
            <ol className="space-y-1.5">
              {topClicked.map(([id, n]) => (
                <li key={id} className="flex justify-between gap-3 text-[13px]">
                  <span className="truncate">{titleOf.get(id) ?? id}</span>
                  <span className="shrink-0 font-medium text-ink-mut">{n}</span>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <Panel title={t("admin.analytics.searchesNoResults")}>
          {zeroSearches.length === 0 ? (
            <Empty />
          ) : (
            <ol className="space-y-1.5">
              {zeroSearches.map(([q, n]) => (
                <li key={q} className="flex justify-between gap-3 text-[13px]">
                  <span className="truncate">“{q}”</span>
                  <span className="shrink-0 font-medium text-ink-mut">
                    {t("admin.analytics.timesShort", { count: n })}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <Panel title={t("admin.analytics.recentComments")}>
          {comments.length === 0 ? (
            <Empty />
          ) : (
            <ul className="space-y-2">
              {comments.map((c, i) => (
                <li key={i} className="text-[13px]">
                  <span className="text-ink-mut">
                    {titleOf.get(c.article_id) ?? "—"}:
                  </span>{" "}
                  {c.comment}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-ink-line bg-ink-panel p-5">
      <div className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-wide text-ink-mut">
        <span className="text-ink-accent">{icon}</span>
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
      {sub && <div className="mt-0.5 text-[12px] text-ink-mut">{sub}</div>}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-ink-line bg-ink-panel p-5">
      <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-ink-mut">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Empty() {
  const { t } = useTranslation();
  return <p className="text-[13px] text-ink-mut">{t("admin.analytics.noData")}</p>;
}
