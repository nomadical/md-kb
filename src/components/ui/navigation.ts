import {
  useLocation,
  useNavigate,
  useSearchParams as useRouterSearchParams,
} from "react-router-dom";

/**
 * `next/navigation` compatibility shims backed by react-router, used during the
 * Vite migration so shared components switch with an import change only.
 */

/** next/navigation useRouter → react-router navigate. */
export function useRouter() {
  const navigate = useNavigate();
  return {
    push: (href: string) => navigate(href),
    replace: (href: string) => navigate(href, { replace: true }),
    back: () => navigate(-1),
    forward: () => navigate(1),
    // Components call refresh() to re-pull server data after a mutation. SPA
    // pages fetch in-component (not via loaders), so the reliable equivalent is
    // a soft reload — correct data + RLS. TODO(cutover): replace with a
    // per-page revalidate to avoid the full reload.
    refresh: () => window.location.reload(),
    prefetch: () => {},
  };
}

/** next/navigation usePathname → react-router location pathname. */
export function usePathname(): string {
  return useLocation().pathname;
}

/** next/navigation useSearchParams (read-only) → react-router's params object. */
export function useSearchParams(): URLSearchParams {
  return useRouterSearchParams()[0];
}
