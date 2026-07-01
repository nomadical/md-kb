import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import { BASE_PATH } from "@/lib/config";
import AppProviders from "@/spa/AppProviders";
import { ProtectedRoute } from "@/spa/auth/ProtectedRoute";
import NotFound from "@/spa/pages/NotFound";
import LoginPage from "@/spa/pages/LoginPage";
import AuthCallbackPage from "@/spa/pages/AuthCallbackPage";
import PublicLayout from "@/spa/pages/public/PublicLayout";
import HomePage from "@/spa/pages/public/HomePage";
import KbBrowsePage from "@/spa/pages/public/KbBrowsePage";
import ContextPage from "@/spa/pages/public/ContextPage";
import SavedPage from "@/spa/pages/public/SavedPage";

// Lazily loaded: the markdown-heavy article view and the whole admin
// subtree (incl. the editor) — keeps them out of the initial public bundle.
const ArticlePage = lazy(() => import("@/spa/pages/public/ArticlePage"));
const AdminLayout = lazy(() => import("@/spa/pages/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("@/spa/pages/admin/AdminDashboard"));
const EditorPage = lazy(() => import("@/spa/pages/admin/EditorPage"));
const HistoryPage = lazy(() => import("@/spa/pages/admin/HistoryPage"));
const ReviewQueuePage = lazy(() => import("@/spa/pages/admin/ReviewQueuePage"));
const TemplatesPage = lazy(() => import("@/spa/pages/admin/TemplatesPage"));
const TrashPage = lazy(() => import("@/spa/pages/admin/TrashPage"));
const UsersPage = lazy(() => import("@/spa/pages/admin/UsersPage"));
const AnalyticsPage = lazy(() => import("@/spa/pages/admin/AnalyticsPage"));
const AuditPage = lazy(() => import("@/spa/pages/admin/AuditPage"));
const SettingsPage = lazy(() => import("@/spa/pages/admin/SettingsPage"));

// The router basename must match how the SPA is served (Vite `base`,
// configurable via VITE_BASE_PATH; default "/"), or deep-links 404.
export const router = createBrowserRouter(
  [
    {
      element: <AppProviders />,
      children: [
        // ---- public (shared chrome: sidebar, footer, ⌘K, analytics) ----
        {
          element: <PublicLayout />,
          children: [
            { index: true, element: <HomePage /> },
            { path: "kb", element: <KbBrowsePage /> },
            { path: "kb/:slug", element: <ArticlePage /> },
            { path: "c/:slug", element: <ContextPage /> },
            { path: "saved", element: <SavedPage /> },
          ],
        },
        { path: "login", element: <LoginPage /> },
        { path: "auth/callback", element: <AuthCallbackPage /> },

        // ---- admin: any signed-in user (matches Next requireSession on the
        //      layout); individual pages add role guards below. ----
        {
          element: <ProtectedRoute />,
          children: [
            {
              element: <AdminLayout />,
              children: [
                { path: "admin", element: <AdminDashboard /> },
                { path: "admin/:id", element: <EditorPage /> },

                // staff (admin/editor/reviewer)
                {
                  element: (
                    <ProtectedRoute roles={["admin", "editor", "reviewer"]} />
                  ),
                  children: [
                    { path: "admin/:id/history", element: <HistoryPage /> },
                  ],
                },
                // admin/reviewer
                {
                  element: <ProtectedRoute roles={["admin", "reviewer"]} />,
                  children: [
                    { path: "admin/review", element: <ReviewQueuePage /> },
                  ],
                },
                // admin/editor
                {
                  element: <ProtectedRoute roles={["admin", "editor"]} />,
                  children: [
                    { path: "admin/templates", element: <TemplatesPage /> },
                    { path: "admin/analytics", element: <AnalyticsPage /> },
                  ],
                },
                // admin only
                {
                  element: <ProtectedRoute roles={["admin"]} />,
                  children: [
                    { path: "admin/trash", element: <TrashPage /> },
                    { path: "admin/users", element: <UsersPage /> },
                    { path: "admin/audit", element: <AuditPage /> },
                    { path: "admin/settings", element: <SettingsPage /> },
                  ],
                },
              ],
            },
          ],
        },

        { path: "*", element: <NotFound /> },
      ],
    },
  ],
  { basename: BASE_PATH || "/" },
);
