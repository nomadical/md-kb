import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaPenClip, FaXmark, FaCircleCheck } from "react-icons/fa6";
import { createClient } from "@/lib/supabase/client";

const CONTAINER_ID = "article-content";
const MAX_EXCERPT = 600;

type FloatBtn = { x: number; y: number };

/**
 * Reader "suggest an edit / report a mistake" affordance, magazine-style:
 * select any text in the article and a small "Suggest an edit" button appears
 * by the selection (Ctrl/⌘+Enter opens it straight from the keyboard). It opens
 * a dialog quoting the selected passage where the reader can describe the fix
 * and optionally leave an email. Submissions land in `article_suggestions`
 * (anonymous insert, staff-only read) for editors to review under /admin.
 */
export default function SuggestEdit({
  articleId,
  title,
}: {
  articleId: string;
  title: string;
}) {
  const { t } = useTranslation();
  const [floatBtn, setFloatBtn] = useState<FloatBtn | null>(null);
  const [open, setOpen] = useState(false);
  const [excerpt, setExcerpt] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Grab the current selection if it sits inside the article body; returns the
  // trimmed (capped) text, or "" when there's no usable selection.
  function selectionInArticle(): string {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return "";
    const container = document.getElementById(CONTAINER_ID);
    if (!container || !container.contains(sel.anchorNode)) return "";
    return sel.toString().trim().slice(0, MAX_EXCERPT);
  }

  // Show/hide the floating button as the selection changes.
  useEffect(() => {
    if (open) return; // don't fight the dialog for the selection
    function update() {
      const sel = window.getSelection();
      const text = selectionInArticle();
      if (!text || !sel) {
        setFloatBtn(null);
        return;
      }
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      setFloatBtn({ x: rect.left + rect.width / 2, y: rect.top });
    }
    document.addEventListener("selectionchange", update);
    return () => document.removeEventListener("selectionchange", update);
  }, [open]);

  // Ctrl/⌘+Enter opens the dialog from the current selection.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !open) {
        const text = selectionInArticle();
        if (text) {
          e.preventDefault();
          openWith(text);
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Focus the textarea when the dialog opens.
  useEffect(() => {
    if (open) textareaRef.current?.focus();
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function openWith(text: string) {
    setExcerpt(text);
    setSuggestion("");
    setEmail("");
    setDone(false);
    setFloatBtn(null);
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setSending(false);
  }

  async function submit() {
    if (!suggestion.trim()) return;
    setSending(true);
    await createClient()
      .from("article_suggestions")
      .insert({
        article_id: articleId,
        excerpt: excerpt || null,
        suggestion: suggestion.trim(),
        email: email.trim() || null,
        url: window.location.pathname,
      });
    setSending(false);
    setDone(true);
  }

  return (
    <>
      {/* Floating "suggest an edit" button anchored to the selection. */}
      {floatBtn && !open && (
        <button
          onMouseDown={(e) => {
            // Keep the selection alive: openWith reads it before React paints.
            e.preventDefault();
            openWith(selectionInArticle());
          }}
          style={{
            position: "fixed",
            left: floatBtn.x,
            top: Math.max(floatBtn.y - 44, 8),
            transform: "translateX(-50%)",
          }}
          className="z-50 inline-flex items-center gap-1.5 rounded-full bg-ink-accent px-3 py-1.5 text-[12px] font-medium text-white shadow-lg ring-1 ring-black/10 transition-transform hover:-translate-y-0.5"
        >
          <FaPenClip className="text-[11px]" /> {t("suggest.button")}
        </button>
      )}

      {/* Small nudge under the article so the feature is discoverable. */}
      <p className="mt-6 flex items-center gap-1.5 text-[12px] text-ink-mut">
        <FaPenClip className="text-[11px]" />
        {t("suggest.hint")}
      </p>

      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t("suggest.title")}
        >
          <div
            className="absolute inset-0 bg-black/40"
            onClick={close}
            aria-hidden
          />
          <div className="relative w-full max-w-md rounded-xl border border-ink-line bg-ink-panel p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-semibold">
                  {t("suggest.title")}
                </h2>
                <p className="mt-0.5 truncate text-[12px] text-ink-mut">
                  {title}
                </p>
              </div>
              <button
                onClick={close}
                aria-label={t("common.close")}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-mut transition-colors hover:bg-black/[0.05] hover:text-ink-fg"
              >
                <FaXmark className="text-[16px]" />
              </button>
            </div>

            {done ? (
              <div className="mt-6 flex flex-col items-center gap-2 py-4 text-center">
                <FaCircleCheck className="text-2xl text-emerald-500" />
                <p className="text-[14px] font-medium">{t("suggest.thanks")}</p>
                <button
                  onClick={close}
                  className="mt-2 rounded-md border border-ink-line px-3 py-1.5 text-[13px] hover:border-ink-accent hover:text-ink-accent"
                >
                  {t("common.close")}
                </button>
              </div>
            ) : (
              <>
                {excerpt && (
                  <blockquote className="mt-4 max-h-28 overflow-y-auto border-l-2 border-ink-accent bg-ink-bg px-3 py-2 text-[13px] italic text-ink-mut">
                    “{excerpt}”
                  </blockquote>
                )}

                <label className="mt-4 block text-[12px] font-medium text-ink-mut">
                  {t("suggest.suggestionLabel")}
                </label>
                <textarea
                  ref={textareaRef}
                  value={suggestion}
                  onChange={(e) => setSuggestion(e.target.value)}
                  rows={4}
                  placeholder={t("suggest.suggestionPlaceholder")}
                  className="mt-1 w-full rounded-lg border border-ink-line bg-ink-panel px-3 py-2 text-[14px] outline-none focus:border-ink-accent"
                />

                <label className="mt-3 block text-[12px] font-medium text-ink-mut">
                  {t("suggest.emailLabel")}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("suggest.emailPlaceholder")}
                  className="mt-1 w-full rounded-lg border border-ink-line bg-ink-panel px-3 py-2 text-[14px] outline-none focus:border-ink-accent"
                />

                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={close}
                    className="rounded-md border border-ink-line px-3 py-1.5 text-[13px] hover:border-ink-accent hover:text-ink-accent"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    onClick={submit}
                    disabled={!suggestion.trim() || sending}
                    className="rounded-md bg-ink-accent px-3 py-1.5 text-[13px] font-medium text-white hover:bg-ink-accentHover disabled:opacity-50"
                  >
                    {sending ? t("common.saving") : t("suggest.send")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
