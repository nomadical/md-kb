import { useTranslation } from "react-i18next";
import { useSettings } from "@/spa/data/settings";
import { useSearchParams } from "@/components/ui/navigation";
import AuthPanel from "@/components/auth/AuthPanel";

/** Standalone login page (email/password + magic-link + optional OAuth). */
export default function LoginPage() {
  const { t } = useTranslation();
  const { siteName } = useSettings();
  const params = useSearchParams();
  const next = params.get("next") ?? "/admin";

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-ink-line bg-ink-panel p-7 shadow-sm">
        <h1 className="text-lg font-semibold">{siteName}</h1>
        <p className="mb-5 mt-1 text-[13px] text-ink-mut">{t("auth.signInSubtitle")}</p>
        <AuthPanel next={next} />
      </div>
    </div>
  );
}