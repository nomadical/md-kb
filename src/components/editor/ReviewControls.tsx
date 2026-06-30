import { useCallback, useEffect, useState, useTransition } from "react";
import { useTranslation } from "react-i18next";
import { FaArrowUpRightFromSquare } from "react-icons/fa6";
import Link from "@/components/ui/AppLink";
import { useRouter } from "@/components/ui/navigation";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { SOURCE_LANGUAGE, type ArticleStatus } from "@/lib/types";
import {
  approveArticle,
  deleteArticle,
  requestChanges,
  submitForReview,
  unpublishArticle,
  withdrawReview,
} from "@/spa/data/writes";

export function DeleteButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();
  return (
    <>
      <button
        onClick={() => setConfirming(true)}
        disabled={pending}
        className="rounded-md border border-ink-line px-2 py-1 text-[13px] text-ink-mut transition-colors hover:border-red-400 hover:text-red-600 disabled:opacity-60"
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      {confirming && (
        <ConfirmDialog
          title="Delete article"
          message="Delete this article? This cannot be undone."
          confirmLabel="Delete"
          danger
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false);
            startTransition(async () => {
              const res = await deleteArticle(id);
              if (res.ok) router.push("/admin");
            });
          }}
        />
      )}
    </>
  );
}

const STATUS_BADGE: Record<ArticleStatus, { key: string; cls: string }> = {
  draft: { key: "review.statusDraft", cls: "bg-slate-200 text-slate-700" },
  in_review: { key: "review.statusInReview", cls: "bg-amber-100 text-amber-700" },
  published: { key: "review.statusPublished", cls: "bg-emerald-100 text-emerald-700" },
};

/** Status badge + lifecycle actions. Editors submit/withdraw; reviewers (and
 *  admins) approve, request changes, or unpublish. Shared by the edit toolbar
 *  and the reviewer's read-only header. */
export default function ReviewControls({
  articleId,
  slug,
  initialStatus,
  initialNote,
  canEdit,
  canReview,
  language = SOURCE_LANGUAGE,
}: {
  articleId: string;
  slug: string;
  initialStatus: ArticleStatus;
  initialNote: string | null;
  canEdit: boolean;
  canReview: boolean;
  /** Language whose lifecycle these controls drive (source = the article). */
  language?: string;
}) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<ArticleStatus>(initialStatus);
  const [note, setNote] = useState<string | null>(initialNote);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  // Resync when navigating between articles / languages in the same instance.
  useEffect(() => {
    setStatus(initialStatus);
    setNote(initialNote);
    setErr(null);
  }, [articleId, language, initialStatus, initialNote]);

  const run = useCallback(
    (
      action: () => Promise<{ ok: true } | { ok: false; error: string }>,
      next: ArticleStatus,
      nextNote: string | null = null,
    ) => {
      setErr(null);
      startTransition(async () => {
        const res = await action();
        if (res.ok) {
          setStatus(next);
          setNote(nextNote);
        } else {
          setErr(res.error);
        }
      });
    },
    [],
  );

  const badge = STATUS_BADGE[status];
  const btn =
    "rounded-md px-2.5 py-1 text-[13px] font-medium disabled:opacity-60";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`mr-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide shadow-sm ring-1 ring-inset ring-black/[0.04] ${badge.cls}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
        {t(badge.key)}
      </span>

      {/* changes-requested note, shown to the editor on the returned draft */}
      {status === "draft" && note && (
        <span
          className="max-w-[16rem] truncate rounded bg-amber-50 px-2 py-0.5 text-[12px] text-amber-700"
          title={note}
        >
          {t("review.changesRequested", { note })}
        </span>
      )}

      {canEdit && !canReview && status === "draft" && (
        <button
          onClick={() => run(() => submitForReview(articleId, language), "in_review")}
          disabled={pending}
          className={`${btn} bg-ink-accent text-white hover:bg-ink-accentHover`}
        >
          {t("review.submitForReview")}
        </button>
      )}

      {/* Reviewers/admins bypass the queue and can publish a draft directly. */}
      {canReview && status === "draft" && (
        <button
          onClick={() => run(() => approveArticle(articleId, language), "published")}
          disabled={pending}
          className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700`}
        >
          {t("review.publish")}
        </button>
      )}

      {canEdit && status === "in_review" && (
        <button
          onClick={() => run(() => withdrawReview(articleId, language), "draft")}
          disabled={pending}
          className={`${btn} border border-ink-line text-ink-mut hover:border-ink-accent hover:text-ink-accent`}
        >
          {t("review.withdraw")}
        </button>
      )}

      {canReview && status === "in_review" && (
        <>
          <button
            onClick={() => run(() => approveArticle(articleId, language), "published")}
            disabled={pending}
            className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700`}
          >
            {t("review.approveAndPublish")}
          </button>
          <button
            onClick={() => {
              const reason = window.prompt("What needs to change?")?.trim();
              if (reason)
                run(
                  () => requestChanges(articleId, reason, language),
                  "draft",
                  reason,
                );
            }}
            disabled={pending}
            className={`${btn} border border-ink-line text-ink-mut hover:border-red-400 hover:text-red-600`}
          >
            {t("review.requestChanges")}
          </button>
        </>
      )}

      {canReview && status === "published" && (
        <button
          onClick={() => run(() => unpublishArticle(articleId, language), "draft")}
          disabled={pending}
          className={`${btn} border border-ink-line text-ink-mut hover:border-red-400 hover:text-red-600`}
        >
          {t("review.unpublish")}
        </button>
      )}

      {status === "published" && (
        <Link
          href={`/kb/${slug}`}
          target="_blank"
          className="text-[13px] text-ink-accent hover:underline"
        >
          {t("review.view")}{" "}
          <FaArrowUpRightFromSquare className="ml-0.5 inline text-[11px]" />
        </Link>
      )}

      {err && <span className="text-[12px] text-red-600">{err}</span>}
    </div>
  );
}
