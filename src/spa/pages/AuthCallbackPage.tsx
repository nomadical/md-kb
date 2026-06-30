import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSearchParams } from "@/components/ui/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * OAuth / magic-link callback: exchange the PKCE code for a session client-side,
 * then navigate to `next`.
 */
export default function AuthCallbackPage() {
  const params = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const next = params.get("next") || "/admin";
    const code = params.get("code");
    const errDesc = params.get("error_description") || params.get("error");
    if (errDesc) {
      setError(errDesc);
      return;
    }
    const supabase = createClient();
    (async () => {
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setError(error.message);
          return;
        }
      }
      navigate(next, { replace: true });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-ink-line bg-ink-panel p-7 text-center text-sm text-ink-mut shadow-sm">
        {error ? (
          <span className="text-red-600">Sign-in failed: {error}</span>
        ) : (
          "Completing sign-in…"
        )}
      </div>
    </div>
  );
}