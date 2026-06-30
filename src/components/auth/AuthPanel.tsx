import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { createClient } from "@/lib/supabase/client";
import { ALLOW_SIGNUP, BASE_PATH as BP, OAUTH_PROVIDERS, SITE_URL } from "@/lib/config";

const PROVIDER_LABEL: Record<string, string> = {
  github: "GitHub",
  google: "Google",
  azure: "Microsoft",
  gitlab: "GitLab",
  bitbucket: "Bitbucket",
};

function redirectTo(next: string): string {
  const site = SITE_URL || window.location.origin + BP;
  return `${site}/auth/callback?next=${encodeURIComponent(next)}`;
}

/** Self-contained auth UI: email + password (sign in / sign up), a magic-link
 *  fallback, and any OAuth providers configured via VITE_OAUTH_PROVIDERS.
 *  Hosted by both the /login page and the on-page sign-in modal. */
export default function AuthPanel({ next = "/admin" }: { next?: string }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function onPassword(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const supabase = createClient();
    const res =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: redirectTo(next) },
          });
    setBusy(false);
    if (res.error) {
      setError(res.error.message);
    } else if (mode === "signup" && !res.data.session) {
      setNotice(t("auth.confirmEmail"));
    } else {
      window.location.href = `${SITE_URL || window.location.origin + BP}${next}`;
    }
  }

  async function magicLink() {
    if (!email) {
      setError(t("auth.enterEmail"));
      return;
    }
    setBusy(true);
    setError("");
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo(next) },
    });
    setBusy(false);
    if (error) setError(error.message);
    else setNotice(t("auth.magicLinkSent", { email }));
  }

  async function oauth(provider: string) {
    setError("");
    const { error } = await createClient().auth.signInWithOAuth({
      // Supabase provider ids are lowercase strings; cast for the SDK union.
      provider: provider as never,
      options: { redirectTo: redirectTo(next) },
    });
    if (error) setError(error.message);
  }

  if (notice) {
    return <p className="rounded-lg bg-emerald-50 p-4 text-[13px] text-emerald-800">{notice}</p>;
  }

  const field =
    "w-full rounded-md border border-ink-line bg-white px-3 py-2 text-sm outline-none focus:border-ink-accent";

  return (
    <div>
      <form onSubmit={onPassword} className="space-y-2.5">
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("auth.emailPlaceholder")}
          className={field}
        />
        <input
          type="password"
          required
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t("auth.passwordPlaceholder")}
          className={field}
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-ink-accent px-3 py-2.5 text-sm font-medium text-white hover:bg-ink-accentHover disabled:opacity-60"
        >
          {mode === "signin" ? t("auth.signIn") : t("auth.signUp")}
        </button>
      </form>

      <div className="mt-3 flex items-center justify-between text-[12px] text-ink-mut">
        {ALLOW_SIGNUP ? (
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="hover:text-ink-accent"
          >
            {mode === "signin" ? t("auth.needAccount") : t("auth.haveAccount")}
          </button>
        ) : (
          <span />
        )}
        <button type="button" onClick={magicLink} disabled={busy} className="hover:text-ink-accent">
          {t("auth.emailMagicLink")}
        </button>
      </div>

      {OAUTH_PROVIDERS.length > 0 && (
        <>
          <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-wide text-ink-mut">
            <span className="h-px flex-1 bg-ink-line" />
            {t("auth.or")}
            <span className="h-px flex-1 bg-ink-line" />
          </div>
          <div className="space-y-2">
            {OAUTH_PROVIDERS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => oauth(p)}
                className="flex w-full items-center justify-center gap-2.5 rounded-md border border-ink-line bg-white px-3 py-2.5 text-sm font-medium text-ink-fg hover:bg-ink-bg"
              >
                {t("auth.continueWith", { provider: PROVIDER_LABEL[p] ?? p })}
              </button>
            ))}
          </div>
        </>
      )}

      {error && <p className="mt-3 text-[13px] text-red-600">{error}</p>}
    </div>
  );
}