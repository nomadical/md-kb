import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { LANGUAGE_CODES, SOURCE_LANGUAGE } from "@/lib/types";
import en from "./locales/en.json";
import de from "./locales/de.json";

// App-wide UI translations. Resources are committed JSON, kept in sync with
// POEditor via `npm run i18n:pull` (see scripts/i18n-pull.mjs). The chosen
// language is persisted to localStorage and also drives which article
// translation the reader is shown (ArticlePage reads i18n.language).
export const I18N_STORAGE_KEY = "kb-language";

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      de: { translation: de },
    },
    fallbackLng: SOURCE_LANGUAGE,
    supportedLngs: LANGUAGE_CODES,
    // Only match the base language (treat "de-CH" / "de-DE" as "de").
    load: "languageOnly",
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false }, // React already escapes
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: I18N_STORAGE_KEY,
      caches: ["localStorage"],
    },
  });

export default i18n;
