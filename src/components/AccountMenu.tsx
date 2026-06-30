import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaRightFromBracket } from "react-icons/fa6";
import { useAuth } from "@/spa/auth/AuthProvider";
import { signOut } from "@/spa/auth/signOut";
import RoleBadge from "@/components/RoleBadge";

/** Signed-in account control: a compact avatar that opens a popover with the
 *  user's email, role and sign-out — replacing the loose role badge + button. */
export default function AccountMenu() {
  const { t } = useTranslation();
  const { session, role } = useAuth();
  const [open, setOpen] = useState(false);

  const email = session?.user.email ?? "";
  const initial = (email.trim()[0] ?? "?").toUpperCase();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("nav.account")}
        title={email}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-ink-accent/10 text-[12px] font-semibold text-ink-accent ring-1 ring-inset ring-ink-accent/20 transition-colors hover:bg-ink-accent/15"
      >
        {initial}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-ink-line bg-ink-panel shadow-lg animate-[fade-up_0.12s_ease-out]"
          >
            <div className="border-b border-ink-line px-4 py-3">
              <div className="truncate text-[13px] font-medium text-ink-fg">
                {email}
              </div>
              {role && (
                <div className="mt-1.5">
                  <RoleBadge role={role} />
                </div>
              )}
            </div>
            <button
              role="menuitem"
              onClick={() => {
                setOpen(false);
                void signOut();
              }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px] text-ink-fg transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <FaRightFromBracket className="text-[13px]" /> {t("nav.signOut")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
