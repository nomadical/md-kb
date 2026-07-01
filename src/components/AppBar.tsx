import { useTranslation } from "react-i18next";
import {
  FaPenToSquare,
  FaEye,
  FaBars,
  FaAnglesRight,
  FaArrowRightLong,
} from "react-icons/fa6";
import Link from "@/components/ui/AppLink";
import { useAuth } from "@/spa/auth/AuthProvider";
import { useSettings } from "@/spa/data/settings";
import ThemeToggle from "@/components/ThemeToggle";
import AppearanceMenu from "@/components/AppearanceMenu";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import SignInButton from "@/components/SignInButton";
import AccountMenu from "@/components/AccountMenu";

// Bordered control, 32px tall — the shared shape for the right-side buttons so
// they line up cleanly instead of reading as a row of mismatched pills.
const CTRL =
  "inline-flex h-8 items-center gap-1.5 rounded-lg border border-ink-line px-2.5 text-[12px] font-medium text-ink-mut transition-colors hover:border-ink-accent hover:text-ink-accent";
// The editor↔viewer switch. A neutral, outlined action button (like the other
// controls) with an accent leading icon and a trailing arrow, so it reads as
// "go somewhere" rather than a highlighted "you are here" status pill.
const SWITCH =
  "group inline-flex h-8 items-center gap-1.5 rounded-lg border border-ink-line px-2.5 text-[12px] font-medium text-ink-fg transition-colors hover:border-ink-accent hover:text-ink-accent";
// Borderless icon button for the explorer toggle on the left.
const ICON_BTN =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-mut transition-colors hover:bg-black/[0.05] hover:text-ink-fg";

function Divider() {
  return <span aria-hidden className="mx-0.5 h-5 w-px bg-ink-line" />;
}

/**
 * Top bar over the content column (the brand + collapse live in the sidebar
 * header). Carries the editor↔viewer switch, the language + theme switchers and
 * the sign-in/out control, grouped (page-switch · preferences · account) and
 * separated by thin dividers. When the explorer is collapsed (or on mobile) it
 * also surfaces the brand + a control to bring the explorer back.
 */
export default function AppBar({
  mode,
  collapsed,
  onExpand,
  onOpenDrawer,
}: {
  /** "admin" exposes the "view the website" switch; "public" the "open editor". */
  mode: "public" | "admin";
  /** Desktop explorer collapsed — surfaces the expand control + brand here. */
  collapsed: boolean;
  /** Re-open the desktop explorer (lg+). */
  onExpand: () => void;
  /** Open the mobile explorer drawer (< lg). */
  onOpenDrawer: () => void;
}) {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { siteName } = useSettings();
  const signedIn = !!session;

  const switcher =
    mode === "admin" ? (
      <Link href="/" className={SWITCH} title={t("nav.viewSite")}>
        <FaEye className="text-[13px] text-ink-accent" />
        <span className="hidden sm:inline">{t("nav.viewSite")}</span>
        <FaArrowRightLong className="text-[11px] opacity-60 transition-transform group-hover:translate-x-0.5" />
      </Link>
    ) : signedIn ? (
      <Link href="/admin" className={SWITCH} title={t("nav.openEditor")}>
        <FaPenToSquare className="text-[13px] text-ink-accent" />
        <span className="hidden sm:inline">{t("nav.openEditor")}</span>
        <FaArrowRightLong className="text-[11px] opacity-60 transition-transform group-hover:translate-x-0.5" />
      </Link>
    ) : null;

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-ink-line bg-ink-panel px-3">
      {/* mobile: open the explorer drawer */}
      <button
        onClick={onOpenDrawer}
        aria-label={t("nav.openSidebar")}
        className={`${ICON_BTN} lg:hidden`}
      >
        <FaBars className="text-[16px]" />
      </button>
      {/* desktop, collapsed: bring the explorer back */}
      {collapsed && (
        <button
          onClick={onExpand}
          aria-label={t("nav.expandSidebar")}
          title={t("nav.expandSidebar")}
          className={`group hidden lg:inline-flex ${ICON_BTN}`}
        >
          <FaAnglesRight className="text-[15px] transition-transform duration-200 group-hover:translate-x-0.5" />
        </button>
      )}
      {/* brand: always on mobile; on desktop only when the rail is hidden */}
      <Link
        href="/"
        className={`flex items-center gap-1.5 text-[15px] font-semibold tracking-tight ${
          collapsed ? "" : "lg:hidden"
        }`}
      >
        <FaPenToSquare className="text-ink-accent" /> {siteName}
      </Link>

      <div className="ml-auto flex items-center gap-2">
        {switcher && (
          <>
            {switcher}
            <Divider />
          </>
        )}

        <LanguageSwitcher className="h-8" />
        <AppearanceMenu />
        <ThemeToggle compact />

        <Divider />

        {signedIn ? <AccountMenu /> : <SignInButton className={CTRL} />}
      </div>
    </header>
  );
}
