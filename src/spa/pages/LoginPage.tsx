import { useEffect, useRef, useState } from "react";
import { FaMicrosoft } from "react-icons/fa6";
import { useSearchParams } from "@/components/ui/navigation";
import { createClient } from "@/lib/supabase/client";

// Dev-only email/magic-link fallback. On in dev; force with VITE_ENABLE_EMAIL_LOGIN.
const EMAIL_FALLBACK =
  import.meta.env.VITE_ENABLE_EMAIL_LOGIN === "true" ||
  (import.meta.env.VITE_ENABLE_EMAIL_LOGIN !== "false" && import.meta.env.DEV);

// Seamless SSO when bounced here from a gated page (?next=…). Disable with
// VITE_KEYCLOAK_AUTO_SSO="false".
const AUTO_SSO = import.meta.env.VITE_KEYCLOAK_AUTO_SSO !== "false";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function redirectTo(next: string): string {
  const site =
    (import.meta.env.VITE_SITE_URL as string | undefined) ??
    window.location.origin + BASE;
  return `${site}/auth/callback?next=${encodeURIComponent(next)}`;
}

/** SPA port of src/app/login/page.tsx. */
export default function LoginPage() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/admin";
  const urlError = params.get("error");

  const gated = params.get("next") !== null;
  const autoSso = AUTO_SSO && !EMAIL_FALLBACK && !urlError && gated;

  const [oauthStatus, setOauthStatus] = useState<"idle" | "redirecting">(
    autoSso ? "redirecting" : "idle",
  );
  const [error, setError] = useState("");

  async function signInWith(provider: "keycloak" | "azure") {
    setOauthStatus("redirecting");
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { scopes: "openid profile email", redirectTo: redirectTo(next) },
    });
    if (error) {
      setOauthStatus("idle");
      setError(error.message);
    }
  }

  const autoSsoFired = useRef(false);
  useEffect(() => {
    if (autoSso && !autoSsoFired.current) {
      autoSsoFired.current = true; // StrictMode runs effects twice in dev
      void signInWith("keycloak");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "sent">(
    "idle",
  );

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setEmailStatus("sending");
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo(next) },
    });
    if (error) {
      setEmailStatus("idle");
      setError(error.message);
    } else {
      setEmailStatus("sent");
    }
  }

  if (autoSso && oauthStatus === "redirecting") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-xl border border-ink-line bg-ink-panel p-7 text-center text-sm text-ink-mut shadow-sm">
          Signing you in with SkyCell…
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-ink-line bg-ink-panel p-7 shadow-sm">
        <h1 className="text-lg font-semibold">md-kb editor</h1>
        <p className="mt-1 text-[13px] text-ink-mut">
          Sign in to manage articles.
        </p>

        <button
          onClick={() => signInWith("keycloak")}
          disabled={oauthStatus === "redirecting"}
          className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-md bg-ink-accent px-3 py-2.5 text-sm font-medium text-white hover:bg-ink-accentHover disabled:opacity-60"
        >
          {oauthStatus === "redirecting"
            ? "Redirecting…"
            : "Sign in with SkyMind (Keycloak)"}
        </button>

        <button
          onClick={() => signInWith("azure")}
          disabled={oauthStatus === "redirecting"}
          className="mt-2.5 flex w-full items-center justify-center gap-2.5 rounded-md border border-ink-line bg-white px-3 py-2.5 text-sm font-medium text-ink-fg hover:bg-ink-bg disabled:opacity-60"
        >
          <FaMicrosoft className="text-[#00a4ef]" />
          Sign in with Microsoft
        </button>

        {EMAIL_FALLBACK && (
          <>
            <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wide text-ink-mut">
              <span className="h-px flex-1 bg-ink-line" />
              dev only
              <span className="h-px flex-1 bg-ink-line" />
            </div>

            {emailStatus === "sent" ? (
              <div className="rounded-lg bg-emerald-50 p-4 text-[13px] text-emerald-800">
                Magic link sent to <strong>{email}</strong>. Locally, open it
                from Mailpit at{" "}
                <a
                  href="http://127.0.0.1:54324"
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  127.0.0.1:54324
                </a>
                .
              </div>
            ) : (
              <form onSubmit={sendMagicLink} className="space-y-2.5">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-md border border-ink-line px-3 py-2 text-sm outline-none focus:border-ink-accent"
                />
                <button
                  type="submit"
                  disabled={emailStatus === "sending"}
                  className="w-full rounded-md bg-ink-accent px-3 py-2 text-sm font-medium text-white hover:bg-ink-accentHover disabled:opacity-60"
                >
                  {emailStatus === "sending" ? "Sending…" : "Email me a magic link"}
                </button>
              </form>
            )}
          </>
        )}

        {(error || urlError) && (
          <p className="mt-3 text-[13px] text-red-600">
            {error ||
              "Sign-in failed. Check that the selected provider is configured."}
          </p>
        )}
      </div>
    </div>
  );
}
