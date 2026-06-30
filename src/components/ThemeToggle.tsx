import { useTranslation } from "react-i18next";
import { FaSun, FaMoon } from "react-icons/fa6";
import { useTheme } from "./ThemeProvider";

/** Toggles between light and dark, reflecting whatever is currently shown
 *  (which, before the first toggle, is the OS preference). (⇧⌘L also toggles.) */
export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const { resolved, toggle } = useTheme();
  const Icon = resolved === "dark" ? FaMoon : FaSun;
  const label = t(`theme.${resolved}`);
  const next = t(resolved === "dark" ? "theme.switchToLight" : "theme.switchToDark");

  return (
    <button
      onClick={toggle}
      title={`${t("nav.theme")}: ${label} — ${next} (⇧⌘L)`}
      aria-label={`${t("nav.theme")}: ${label}. ${next}`}
      className="inline-flex h-8 items-center gap-2 rounded-lg border border-ink-line px-2.5 text-[12px] text-ink-mut transition-colors hover:border-ink-accent hover:text-ink-accent"
    >
      <Icon className="text-[13px]" />
      {!compact && <span>{label}</span>}
    </button>
  );
}
