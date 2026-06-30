import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth, type EditorialRole } from "./AuthProvider";

/**
 * Route guard replacing Next's proxy.ts /admin gate + lib/auth.ts requireRole.
 * Unauthenticated users are bounced to /login (preserving where they wanted to
 * go); signed-in users lacking an allowed role get sent home.
 */
export function ProtectedRoute({ roles }: { roles?: EditorialRole[] }) {
  const { session, role, loading } = useAuth();
  const location = useLocation();

  if (loading) return null; // brief: session is being resolved

  if (!session)
    return (
      <Navigate
        to="/login"
        replace
        state={{ next: location.pathname + location.search }}
      />
    );

  if (roles && (!role || !roles.includes(role)))
    return <Navigate to="/" replace />;

  return <Outlet />;
}
