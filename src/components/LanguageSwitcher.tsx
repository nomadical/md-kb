import { useTranslation } from "react-i18next";
import { LANGUAGES, normalizeLanguage } from "@/lib/types";
import { useSettings } from "@/spa/data/settings";

/** App-wide language picker — a compact segmented control. Changes the UI
 *  language (react-i18next, persisted to localStorage), which also drives which
 *  article translation the public reader is shown. Distinct from the editor's
 *  per-article LanguageVersionPicker. */
export default function LanguageSwitcher({
  className = "",
}: {
  className?: string;
}) {
  const { i18n, t } = useTranslation();
  const { enabledLanguages } = useSettings();
  const current = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language);
  // Offer the enabled languages (always keep the current one reachable).
  const langs = LANGUAGES.filter(
    (l) => enabledLanguages.includes(l.code) || l.code === current,
  );
  if (langs.length < 2) return null;

  return (
    <div
      className={`inline-flex items-center rounded-lg border border-ink-line bg-ink-bg p-0.5 ${className}`}
      role="group"
      aria-label={t("language.label")}
    >
      {langs.map((l) => {
        const active = l.code === current;
        return (
          <button
            key={l.code}
            type="button"
            onClick={() => void i18n.changeLanguage(l.code)}
            aria-pressed={active}
            title={l.nativeLabel}
            className={`rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide transition-colors ${
              active
                ? "bg-ink-accent text-white shadow-sm"
                : "text-ink-mut hover:text-ink-accent"
            }`}
          >
            {l.code}
          </button>
        );
      })}
    </div>
  );
}
