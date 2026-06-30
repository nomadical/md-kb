import { useState, useTransition } from "react";
import { useTranslation } from "react-i18next";
import { FaArrowUpRightFromSquare } from "react-icons/fa6";
import Link from "@/components/ui/AppLink";
import { useRouter } from "@/components/ui/navigation";
import { useSettings } from "@/spa/data/settings";
import {
  submitDraft,
  withdrawDraft,
  publishDraft,
  requestDraftChanges,
} from "@/spa/data/writes";

const PILL =
  "rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide";

/** Lifecycle controls for a source-language PRIVATE draft. The author submits /
 *  withdraws their own draft; reviewers/admins publish it (or, when reviewing a
 *  submission opened from the queue, request changes). Distinct from
 *  ReviewControls, which still drives the per-language translation lifecycle. */
export default function DraftControls({
  draftId,
  status,
  published,
  slug,
  reviewNote,
  canEdit,
  canReview,
  reviewing,
}: {
  draftId: string;
  status: "draft" | "in_review";
  published: boolean;
  slug: string;
  reviewNote: string | null;
  /** Caller owns + may edit this draft (author). */
  canEdit: boolean;
  /** Caller may publish / request changes (reviewer or admin). */
  canReview: boolean;
  /** Opened from the review queue (someone else's submitted draft). */
  reviewing: boolean;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const { requireReview, allowAdminSelfReview } = useSettings();
  const [pending, start] = useTransition();
  const [st, setSt] = useState(status);
  const [err, setErr] = useState<string | null>(null);

  // Whether the caller may publish their OWN draft directly: reviewers/admins
  // iff self-review is allowed; editors iff review isn't required.
  const ownPublish = canReview ? allowAdminSelfReview : !requireReview;

  const run = (
    fn: () => Promise<{ ok: true } | { ok: false; error: string }>,
    after?: () => void,
  ) => {
    setErr(null);
    start(async () => {
      const res = await fn();
      if (res.ok) after?.();
      else setErr(res.error);
    });
  };

  const btn = "rounded-md px-2.5 py-1 text-[13px] font-medium disabled:opacity-60";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`${PILL} ${
          st === "in_review"
            ? "bg-amber-100 text-amber-700"
            : "bg-slate-200 text-slate-700"
        }`}
      >
        {t(st === "in_review" ? "review.statusInReview" : "review.statusDraft")}
      </span>
      {published && (
        <span className={`${PILL} bg-emerald-100 text-emerald-700`}>
          {t("review.statusPublished")}
        </span>
      )}

      {st === "draft" && reviewNote && (
        <span
          className="max-w-[16rem] truncate rounded bg-amber-50 px-2 py-0.5 text-[12px] text-amber-700"
          title={reviewNote}
        >
          {t("review.changesRequested", { note: reviewNote })}
        </span>
      )}

      {/* Reviewing someone else's submission (from the queue). */}
      {reviewing && canReview && (
        <>
          <button
            onClick={() =>
              run(() => publishDraft(draftId), () => router.push("/admin/review"))
            }
            disabled={pending}
            className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700`}
          >
            {t("review.approveAndPublish")}
          </button>
          {st === "in_review" && (
            <button
              onClick={() => {
                const reason = window.prompt("What needs to change?")?.trim();
                if (reason)
                  run(() => requestDraftChanges(draftId, reason), () =>
                    router.push("/admin/review"),
                  );
              }}
              disabled={pending}
              className={`${btn} border border-ink-line text-ink-mut hover:border-red-400 hover:text-red-600`}
            >
              {t("review.requestChanges")}
            </button>
          )}
        </>
      )}

      {/* Acting on your own draft. */}
      {!reviewing && canEdit && (
        <>
          {ownPublish ? (
            <button
              onClick={() =>
                run(() => publishDraft(draftId), () => router.refresh())
              }
              disabled={pending}
              className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700`}
            >
              {t("review.publish")}
            </button>
          ) : (
            st === "draft" && (
              <button
                onClick={() =>
                  run(() => submitDraft(draftId), () => setSt("in_review"))
                }
                disabled={pending}
                className={`${btn} bg-ink-accent text-white hover:bg-ink-accentHover`}
              >
                {t("review.submitForReview")}
              </button>
            )
          )}
          {st === "in_review" && (
            <button
              onClick={() => run(() => withdrawDraft(draftId), () => setSt("draft"))}
              disabled={pending}
              className={`${btn} border border-ink-line text-ink-mut hover:border-ink-accent hover:text-ink-accent`}
            >
              {t("review.withdraw")}
            </button>
          )}
        </>
      )}

      {published && (
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
