import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { FaPenToSquare, FaAnglesLeft, FaXmark } from "react-icons/fa6";
import Link from "@/components/ui/AppLink";
import { usePathname } from "@/components/ui/navigation";
import { useSettings } from "@/spa/data/settings";
import AppBar from "@/components/AppBar";

const STORAGE_KEY = "kb:sidebar-collapsed";

const ICON_BTN =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-mut transition-colors hover:bg-black/[0.05] hover:text-ink-fg";

/** Desktop explorer collapsed state, persisted across sessions. */
function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  });
  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);
  return [collapsed, setCollapsed] as const;
}

/** The brand wordmark, shown in the sidebar/drawer header. */
function Brand() {
  const { siteName } = useSettings();
  return (
    <Link
      href="/"
      className="flex items-center gap-1.5 text-[15px] font-semibold tracking-tight"
    >
      <FaPenToSquare className="text-ink-accent" /> {siteName}
    </Link>
  );
}

/**
 * Shared app frame: a full-height explorer rail on the left whose own header
 * carries the brand, with the {@link AppBar} sitting only over the content
 * column to its right (so the explorer reclaims the full window height). The
 * rail collapses on desktop (persisted) and opens as a slide-over drawer on
 * mobile. `sidebar` is rendered in both; `children` is the page's own <main>.
 */
export default function AppShell({
  mode,
  sidebar,
  children,
}: {
  mode: "public" | "admin";
  sidebar: ReactNode;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useSidebarCollapsed();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  // Close the mobile drawer on navigation.
  useEffect(() => setDrawerOpen(false), [pathname]);

  return (
    <div className="flex h-screen">
      {/* full-height desktop explorer rail. Width animates 0↔18rem; the inner
          column keeps its full width and is clipped by the rail's overflow, so
          it slides rather than reflowing. `inert` drops it from tab/AT order
          while collapsed. */}
      <aside
        className={`hidden shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out lg:flex ${
          collapsed ? "lg:w-0" : "lg:w-72"
        }`}
      >
        <div
          inert={collapsed}
          className="flex h-full w-72 min-h-0 flex-col border-r border-ink-line bg-ink-panel"
        >
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-ink-line px-3">
            <Brand />
            <button
              onClick={() => setCollapsed(true)}
              aria-label={t("nav.collapseSidebar")}
              title={t("nav.collapseSidebar")}
              className={`group ${ICON_BTN}`}
            >
              <FaAnglesLeft className="text-[15px] transition-transform duration-200 group-hover:-translate-x-0.5" />
            </button>
          </div>
          {sidebar}
        </div>
      </aside>

      {/* content column: app bar over the page */}
      <div className="flex min-w-0 flex-1 flex-col">
        <AppBar
          mode={mode}
          collapsed={collapsed}
          onExpand={() => setCollapsed(false)}
          onOpenDrawer={() => setDrawerOpen(true)}
        />
        {children}
      </div>

      {/* mobile explorer drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 animate-[fade-up_0.15s_ease-out]"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col border-r border-ink-line bg-ink-panel shadow-xl">
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-ink-line px-3">
              <Brand />
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label={t("common.close")}
                className={ICON_BTN}
              >
                <FaXmark className="text-[16px]" />
              </button>
            </div>
            {sidebar}
          </aside>
        </div>
      )}
    </div>
  );
}
