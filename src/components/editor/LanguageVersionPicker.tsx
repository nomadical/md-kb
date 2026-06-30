import { useTranslation } from "react-i18next";
import { FaGlobe } from "react-icons/fa6";
import { LANGUAGES, type ArticleStatus } from "@/lib/types";

export type LanguageVersion = {
  language: string;
  /** null = this language version hasn't been created yet. */
  status: ArticleStatus | null;
};

/** Per-language version selector for the editor. Switches which language the
 *  author is editing; shows each version's lifecycle status (or "new" when a
 *  language hasn't been started). Distinct from the app-wide LanguageSwitcher,
 *  which changes the UI language. */
export default function LanguageVersionPicker({
  language,
  versions,
  onSelect,
  disabled = false,
}: {
  language: string;
  versions: LanguageVersion[];
  onSelect: (language: string) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const statusOf = (code: string) =>
    versions.find((v) => v.language === code)?.status ?? null;

  const statusLabel = (status: ArticleStatus) =>
    status === "published"
      ? t("review.statusPublished")
      : status === "in_review"
        ? t("review.statusInReview")
        : t("review.statusDraft");

  return (
    <label
      className="inline-flex items-center gap-1.5 text-[12px] text-ink-mut"
      title={t("language.label")}
    >
      <FaGlobe aria-hidden className="text-[11px]" />
      <span className="sr-only">{t("language.label")}</span>
      <select
        value={language}
        disabled={disabled}
        onChange={(e) => onSelect(e.target.value)}
        className="cursor-pointer rounded border border-ink-line bg-transparent px-1.5 py-0.5 text-[12px] outline-none focus:border-ink-accent disabled:opacity-60"
      >
        {LANGUAGES.map((l) => {
          const status = statusOf(l.code);
          return (
            <option key={l.code} value={l.code}>
              {l.nativeLabel} — {status ? statusLabel(status) : "new"}
            </option>
          );
        })}
      </select>
    </label>
  );
}
