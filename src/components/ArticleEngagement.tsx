import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaRegThumbsUp, FaRegThumbsDown } from "react-icons/fa6";
import { createClient } from "@/lib/supabase/client";

/**
 * Logs one view per browser session and renders a "Was this helpful?" widget.
 * Inserts go through RLS policies that allow anyone to write but only staff to
 * read, so the analytics stay private.
 */
export default function ArticleEngagement({ articleId }: { articleId: string }) {
  const { t } = useTranslation();
  const [vote, setVote] = useState<null | boolean>(null);
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(false);

  // one view per session per article
  useEffect(() => {
    const key = `kb-viewed-${articleId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    createClient().from("article_views").insert({ article_id: articleId });
  }, [articleId]);

  async function submit(helpful: boolean) {
    setVote(helpful);
    // "No" opens a comment box first; "Yes" submits immediately.
    if (helpful) {
      await createClient()
        .from("article_feedback")
        .insert({ article_id: articleId, helpful });
      setDone(true);
    }
  }

  async function submitComment() {
    await createClient()
      .from("article_feedback")
      .insert({ article_id: articleId, helpful: false, comment: comment.trim() || null });
    setDone(true);
  }

  return (
    <div className="mt-10 rounded-xl border border-ink-line bg-ink-panel p-5">
      {done ? (
        <p className="text-[14px] text-ink-mut">{t("reader.feedback.thanks")}</p>
      ) : vote === false ? (
        <div>
          <p className="text-[14px] font-medium">
            {t("reader.feedback.sorry")}
          </p>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder={t("reader.feedback.placeholder")}
            className="mt-2 w-full rounded-lg border border-ink-line px-3 py-2 text-[14px] outline-none focus:border-ink-accent"
          />
          <button
            onClick={submitComment}
            className="mt-2 rounded-md bg-ink-accent px-3 py-1.5 text-[13px] font-medium text-white hover:bg-ink-accentHover"
          >
            {t("reader.feedback.send")}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <span className="text-[14px] font-medium">{t("reader.feedback.question")}</span>
          <button
            onClick={() => submit(true)}
            className="flex items-center gap-1.5 rounded-md border border-ink-line px-3 py-1.5 text-[13px] hover:border-emerald-400 hover:text-emerald-700"
          >
            <FaRegThumbsUp /> {t("reader.feedback.yes")}
          </button>
          <button
            onClick={() => submit(false)}
            className="flex items-center gap-1.5 rounded-md border border-ink-line px-3 py-1.5 text-[13px] hover:border-red-400 hover:text-red-600"
          >
            <FaRegThumbsDown /> {t("reader.feedback.no")}
          </button>
        </div>
      )}
    </div>
  );
}
