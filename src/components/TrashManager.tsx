import { useState, useTransition } from "react";
import { useTranslation } from "react-i18next";
import { FaTrashCan, FaArrowRotateLeft } from "react-icons/fa6";
import { restoreArticle, purgeArticle } from "@/spa/data/writes";

export type TrashRow = {
  id: string;
  title: string;
  folder: string;
  deleted_at: string;
  deletedByEmail: string | null;
};

export default function TrashManager({ rows: initial }: { rows: TrashRow[] }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(
    id: string,
    fn: (id: string) => Promise<{ ok: true } | { ok: false; error: string }>,
  ) {
    setError(null);
    startTransition(async () => {
      const res = await fn(id);
      if (res.ok) setRows((rs) => rs.filter((r) => r.id !== id));
      else setError(res.error);
    });
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-ink-line p-8 text-center text-ink-mut">
        {t("admin.trash.empty")}
      </p>
    );
  }

  return (
    <div>
      {error && <p className="mb-3 text-[13px] text-red-600">{error}</p>}
      <ul className="divide-y divide-ink-line overflow-hidden rounded-lg border border-ink-line">
        {rows.map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between gap-3 px-4 py-3"
          >
            <span className="min-w-0">
              <span className="block truncate text-[14px] font-medium">
                {r.title}
              </span>
              <span className="block truncate text-[12px] text-ink-mut">
                {r.folder || t("admin.trash.root")} ·{" "}
                {t("admin.trash.trashedOn", {
                  date: new Date(r.deleted_at).toLocaleDateString(),
                })}
                {r.deletedByEmail
                  ? t("admin.trash.byline", { email: r.deletedByEmail })
                  : ""}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => run(r.id, restoreArticle)}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-md border border-ink-line px-2.5 py-1 text-[13px] text-ink-mut hover:border-ink-accent hover:text-ink-accent disabled:opacity-60"
              >
                <FaArrowRotateLeft className="text-[11px]" /> {t("common.restore")}
              </button>
              <button
                onClick={() => {
                  if (confirm(t("admin.trash.confirmPurge", { title: r.title })))
                    run(r.id, purgeArticle);
                }}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-md border border-ink-line px-2.5 py-1 text-[13px] text-ink-mut hover:border-red-400 hover:text-red-600 disabled:opacity-60"
              >
                <FaTrashCan className="text-[11px]" /> {t("common.delete")}
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
