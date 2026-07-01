import { useTranslation } from "react-i18next";
import { FaSun, FaMoon } from "react-icons/fa6";
import { useTheme } from "./ThemeProvider";

// Segmented Light | Dark switch: both options are shown, the active one is
// filled, and clicking the other commits that theme (⇧⌘L still toggles).
const WRAP =
  "inline-flex h-8 items-center rounded-lg border border-ink-line bg-ink-bg p-0.5";
const SEG =
  "inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium transition-colors";
const ON = "bg-ink-accent text-white";
const OFF = "text-ink-mut hover:text-ink-accent";

/** Explicit light/dark switch, reflecting whatever is currently shown (before
 *  the first choice, that's the OS preference). */
export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const { resolved, setTheme } = useTheme();

  return (
    <div className={WRAP} role="group" aria-label={t("nav.theme")}>
      <button
        onClick={() => setTheme("light")}
        aria-pressed={resolved === "light"}
        title={t("theme.switchToLight")}
        className={`${SEG} ${resolved === "light" ? ON : OFF}`}
      >
        <FaSun className="text-[13px]" />
        {!compact && <span>{t("theme.light")}</span>}
      </button>
      <button
        onClick={() => setTheme("dark")}
        aria-pressed={resolved === "dark"}
        title={t("theme.switchToDark")}
        className={`${SEG} ${resolved === "dark" ? ON : OFF}`}
      >
        <FaMoon className="text-[13px]" />
        {!compact && <span>{t("theme.dark")}</span>}
      </button>
    </div>
  );
}
