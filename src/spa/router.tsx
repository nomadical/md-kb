import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import AppProviders from "@/spa/AppProviders";
import { ProtectedRoute } from "@/spa/auth/ProtectedRoute";
import NotFound from "@/spa/pages/NotFound";
import LoginPage from "@/spa/pages/LoginPage";
import AuthCallbackPage from "@/spa/pages/AuthCallbackPage";
import PublicLayout from "@/spa/pages/public/PublicLayout";
import HomePage from "@/spa/pages/public/HomePage";
import KbBrowsePage from "@/spa/pages/public/KbBrowsePage";
import ContextPage from "@/spa/pages/public/ContextPage";

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

// Base path matches Next's BASE_PATH (/knowledge-base) so links/deep-links keep
// working behind Traefik. Route tree mirrors src/app/** (public + admin).
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
  { basename: "/knowledge-base" },
);
