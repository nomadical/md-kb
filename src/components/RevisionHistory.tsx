import { useState, useTransition } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "@/components/ui/navigation";
import { FaArrowRotateLeft } from "react-icons/fa6";
import { restoreRevision, restoreTranslationRevision } from "@/spa/data/writes";
import { SOURCE_LANGUAGE, isSourceLanguage } from "@/lib/types";
import MarkdownView from "@/components/MarkdownView";

export type RevisionRow = {
  id: string;
  revision: number;
  title: string;
  status: string;
  content: string;
  created_at: string;
  editedByEmail: string | null;
};

export default function RevisionHistory({
  articleId,
  revisions,
  canRestore,
  language = SOURCE_LANGUAGE,
}: {
  articleId: string;
  revisions: RevisionRow[];
  canRestore: boolean;
  /** Language whose history this is (source = the article's own revisions). */
  language?: string;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function restore(id: string) {
    setError(null);
    startTransition(async () => {
      const res = isSourceLanguage(language)
        ? await restoreRevision(articleId, id)
        : await restoreTranslationRevision(id);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  if (revisions.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-ink-line p-8 text-center text-ink-mut">
        {t("admin.revisions.empty")}
      </p>
    );
  }

  return (
    <div>
      {error && <p className="mb-3 text-[13px] text-red-600">{error}</p>}
      <ul className="divide-y divide-ink-line overflow-hidden rounded-lg border border-ink-line">
        {revisions.map((r, i) => {
          const open = openId === r.id;
          return (
            <li key={r.id}>
              <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                <button
                  onClick={() => setOpenId(open ? null : r.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block truncate text-[13px] font-medium">
                    #{r.revision} · {r.title}
                    {i === 0 && (
                      <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                        {t("admin.revisions.current")}
                      </span>
                    )}
                  </span>
                  <span className="block text-[12px] text-ink-mut">
                    {r.status} · {new Date(r.created_at).toLocaleString()}
                    {r.editedByEmail ? ` · ${r.editedByEmail}` : ""}
                  </span>
                </button>
                {canRestore && i !== 0 && (
                  <button
                    onClick={() => restore(r.id)}
                    disabled={pending}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-ink-line px-2.5 py-1 text-[13px] text-ink-mut hover:border-ink-accent hover:text-ink-accent disabled:opacity-60"
                  >
                    <FaArrowRotateLeft className="text-[11px]" /> {t("common.restore")}
                  </button>
                )}
              </div>
              {open && (
                <div
                  className="border-t border-ink-line bg-ink-bg px-6 py-4"
                 
                >
                  <MarkdownView source={r.content} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
