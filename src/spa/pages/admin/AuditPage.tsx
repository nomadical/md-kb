import { useMemo, useState } from "react";
import { FaScroll, FaMagnifyingGlass } from "react-icons/fa6";
import { useTranslation } from "react-i18next";
import { useAsync } from "@/spa/data/useAsync";
import { fetchAuditLog } from "@/spa/data/admin";
import Loading from "@/spa/pages/Loading";

// Translation key + colour per action (port of src/app/admin/audit/page.tsx).
// Labels are resolved via t("admin.audit.actions.*") at render time.
const ACTIONS: Record<string, { labelKey: string; cls: string }> = {
  "article.create": { labelKey: "create", cls: "bg-sky-100 text-sky-700" },
  "article.update": { labelKey: "update", cls: "bg-slate-200 text-slate-700" },
  "article.submit": { labelKey: "submit", cls: "bg-amber-100 text-amber-700" },
  "article.approve": { labelKey: "approve", cls: "bg-emerald-100 text-emerald-700" },
  "article.request_changes": {
    labelKey: "requestChanges",
    cls: "bg-amber-100 text-amber-700",
  },
  "article.unpublish": { labelKey: "unpublish", cls: "bg-slate-200 text-slate-700" },
  "article.withdraw": { labelKey: "withdraw", cls: "bg-slate-200 text-slate-700" },
  "article.trash": { labelKey: "trash", cls: "bg-red-100 text-red-700" },
  "article.restore": { labelKey: "restore", cls: "bg-emerald-100 text-emerald-700" },
  "article.purge": { labelKey: "purge", cls: "bg-red-100 text-red-700" },
  "article.restore_version": { labelKey: "restoreVersion", cls: "bg-violet-100 text-violet-700" },
  "user.role_change": { labelKey: "roleChange", cls: "bg-violet-100 text-violet-700" },
};

function actionLabel(t: (k: string) => string, action: string): string {
  const a = ACTIONS[action];
  return a ? t(`admin.audit.actions.${a.labelKey}`) : action;
}

function fmt(ts: string): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** SPA port of src/app/admin/audit/page.tsx, with client-side filtering. */
export default function AuditPage() {
  const { t } = useTranslation();
  const { data: entries, loading } = useAsync(fetchAuditLog, []);
  const [q, setQ] = useState("");
  const [action, setAction] = useState("all");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (entries ?? []).filter((e) => {
      if (action !== "all" && e.action !== action) return false;
      if (!needle) return true;
      return (
        !!e.summary?.toLowerCase().includes(needle) ||
        !!e.actor_email?.toLowerCase().includes(needle)
      );
    });
  }, [entries, q, action]);

  // Action types actually present, ordered by the known list above (then any
  // unknown ones), so the dropdown only offers actions that exist in the data.
  const presentActions = useMemo(() => {
    const present = new Set((entries ?? []).map((e) => e.action));
    const known = Object.keys(ACTIONS).filter((a) => present.has(a));
    const unknown = [...present].filter((a) => !(a in ACTIONS));
    return [...known, ...unknown];
  }, [entries]);

  if (loading || !entries) return <Loading />;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 sm:px-8">
      <h1 className="flex items-center gap-2 text-xl font-semibold">
        <FaScroll className="text-ink-accent" /> {t("nav.auditLog")}
      </h1>
      <p className="mt-1 text-[13px] text-ink-mut">{t("admin.audit.subtitle")}</p>

      {entries.length > 0 && (
        // Sticky so the filters stay reachable while scrolling a long log.
        <div className="sticky top-0 z-10 -mx-6 mt-5 border-b border-ink-line bg-ink-bg px-6 py-3 sm:-mx-8 sm:px-8">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <FaMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-ink-mut" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("admin.audit.filter.searchPlaceholder")}
                className="w-full rounded-lg border border-ink-line bg-ink-panel py-2 pl-9 pr-3 text-[13px] outline-none focus:border-ink-accent"
              />
            </div>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              aria-label={t("admin.audit.filter.allActions")}
              className="rounded-lg border border-ink-line bg-ink-panel px-2.5 py-2 text-[13px] text-ink-fg outline-none focus:border-ink-accent"
            >
              <option value="all">{t("admin.audit.filter.allActions")}</option>
              {presentActions.map((a) => (
                <option key={a} value={a}>
                  {actionLabel(t, a)}
                </option>
              ))}
            </select>
          </div>
          <p className="mt-2 text-[12px] text-ink-mut">
            {t("admin.audit.filter.showing", {
              count: filtered.length,
              total: entries.length,
            })}
          </p>
        </div>
      )}

      {entries.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-ink-line p-8 text-center text-ink-mut">
          {t("admin.audit.empty")}
        </p>
      ) : filtered.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-ink-line p-8 text-center text-ink-mut">
          {t("admin.audit.filter.noMatches")}
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-ink-line overflow-hidden rounded-lg border border-ink-line">
          {filtered.map((e) => {
            const a = ACTIONS[e.action];
            const cls = a?.cls ?? "bg-slate-200 text-slate-700";
            return (
              <li key={e.id} className="flex items-start gap-3 px-4 py-2.5">
                <span
                  className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold ${cls}`}
                >
                  {actionLabel(t, e.action)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px]">
                    {e.summary ?? "—"}
                  </span>
                  <span className="block text-[12px] text-ink-mut">
                    {e.actor_email ?? t("admin.audit.system")} · {fmt(e.created_at)}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
