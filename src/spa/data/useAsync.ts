/* eslint-disable react-hooks/exhaustive-deps --
   This is a generic data hook: it forwards a caller-supplied `deps` array to
   useEffect, so the exhaustive-deps rule (which requires a static array literal)
   can't apply — the calling site owns dependency correctness. */
import { useEffect, useState } from "react";

/**
 * Minimal data hook for SPA pages that fetch on mount (replaces Next server
 * components' top-level await). `data === null && !error` means loading.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Bumped by reload() to re-run the effect on demand (e.g. after a mutation).
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    let active = true;
    setData(null);
    setError(null);
    fn()
      .then((d) => active && setData(d))
      .catch((e: unknown) => active && setError(String(e)));
    return () => {
      active = false;
    };
  }, [...deps, nonce]);
  return {
    data,
    loading: data === null && !error,
    error,
    reload: () => setNonce((n) => n + 1),
  };
}
