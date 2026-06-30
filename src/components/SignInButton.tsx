import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaMicrosoft, FaXmark } from "react-icons/fa6";
import { createClient } from "@/lib/supabase/client";
import { BASE_PATH as BP, SITE_URL } from "@/lib/config";

/** "Sign in" trigger that opens an on-page login modal (instead of routing to
 *  /login). The OAuth providers still redirect to complete auth, returning to
 *  the page the user was on. */
export default function SignInButton({ className }: { className?: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "redirecting">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  async function signInWith(provider: "keycloak" | "azure") {
    setStatus("redirecting");
    setError("");
    const site = SITE_URL || window.location.origin + BP;
    // Return to the page the user is on (path relative to the base path).
    const next = window.location.pathname.replace(BP, "") || "/";
    const { error } = await createClient().auth.signInWithOAuth({
      provider,
      options: {
        scopes: "openid profile email",
        redirectTo: `${site}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setStatus("idle");
      setError(error.message);
    }
  }

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
            <p className="mt-1 text-[13px] text-ink-mut">
              {t("auth.signInSubtitle")}
            </p>

            <button
              type="button"
              onClick={() => signInWith("keycloak")}
              disabled={status === "redirecting"}
              className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-md bg-ink-accent px-3 py-2.5 text-sm font-medium text-white hover:bg-ink-accentHover disabled:opacity-60"
            >
              {status === "redirecting"
                ? t("auth.redirecting")
                : t("auth.withKeycloak")}
            </button>
            <button
              type="button"
              onClick={() => signInWith("azure")}
              disabled={status === "redirecting"}
              className="mt-2.5 flex w-full items-center justify-center gap-2.5 rounded-md border border-ink-line bg-white px-3 py-2.5 text-sm font-medium text-ink-fg hover:bg-ink-bg disabled:opacity-60"
            >
              <FaMicrosoft className="text-[#00a4ef]" /> {t("auth.withMicrosoft")}
            </button>

            {error && <p className="mt-3 text-[13px] text-red-600">{error}</p>}
          </div>
        </div>
      )}
    </>
  );
}
