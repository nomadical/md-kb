import { Navigate, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useArticles } from "@/spa/data/articles";
import { useAuth } from "@/spa/auth/AuthProvider";
import { useSettings } from "@/spa/data/settings";
import { normalizeLanguage, type ArticleMeta } from "@/lib/types";
import AppShell from "@/components/AppShell";
import PublicSidebar from "@/components/PublicSidebar";
import BackToTop from "@/components/BackToTop";
import CommandPalette from "@/components/CommandPalette";
import PageAnalytics from "@/components/PageAnalytics";
import Footer from "@/components/Footer";

/** Shared with the public pages via the router Outlet so the article list is
 *  fetched once here (for the sidebar + the page) instead of every page
 *  refetching it — which also caused the sidebar/content to fill in separately. */
export type PublicOutletContext = { articles: ArticleMeta[]; loading: boolean };

/** SPA port of src/app/(public)/layout.tsx (client-fetched sidebar + chrome). */
export default function PublicLayout() {
  const { i18n } = useTranslation();
  const { articles, loading } = useArticles(
    false,
    normalizeLanguage(i18n.resolvedLanguage ?? i18n.language),
  );
  const { role, session, loading: authLoading } = useAuth();
  const { requireLoginToRead } = useSettings();
  const list = articles ?? [];

  // Gate public reading behind login when the admin requires it.
  if (requireLoginToRead && !authLoading && !session) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppShell
      mode="public"
      sidebar={<PublicSidebar articles={list} loading={loading} />}
    >
      <main className="relative min-w-0 flex-1 overflow-y-auto" id="main-scroll">
        <div className="flex min-h-full flex-col">
          <div className="mx-auto w-full max-w-[1760px] flex-1 px-5 py-8 sm:px-8 sm:py-10">
            <Outlet
              context={{ articles: list, loading } satisfies PublicOutletContext}
            />
          </div>
          <Footer />
        </div>
        <BackToTop scrollTargetId="main-scroll" />
      </main>
      <CommandPalette role={role} />
      <PageAnalytics />
    </AppShell>
  );
}