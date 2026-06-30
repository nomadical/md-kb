import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaXmark } from "react-icons/fa6";
import AuthPanel from "@/components/auth/AuthPanel";
import { BASE_PATH as BP } from "@/lib/config";

/** "Sign in" trigger that opens an on-page login modal (email/password +
 *  magic-link + optional OAuth). Returns to the page the user was on. */
export default function SignInButton({ className }: { className?: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const next = (window.location.pathname.replace(BP, "") || "/") + window.location.search;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {t("nav.signIn")}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 animate-[fade-up_0.15s_ease-out]"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-sm rounded-xl border border-ink-line bg-ink-panel p-6 shadow-xl"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t("common.close")}
              className="absolute right-3 top-3 text-ink-mut hover:text-ink-fg"
            >
              <FaXmark />
            </button>
            <h2 className="text-lg font-semibold">{t("nav.signIn")}</h2>
            <p className="mb-4 mt-1 text-[13px] text-ink-mut">
              {t("auth.signInSubtitle")}
            </p>
            <AuthPanel next={next} />
          </div>
        </div>
      )}
    </>
  );
}