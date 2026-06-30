import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import i18n, { I18N_STORAGE_KEY } from "@/i18n";
import { DEFAULT_SETTINGS, type AppSettings } from "@/lib/types";

/** Read the app settings, merged over defaults so missing keys fall back. */
export async function fetchSettings(): Promise<AppSettings> {
  const { data } = await createClient()
    .from("app_settings")
    .select("value")
    .eq("id", 1)
    .maybeSingle();
  const value = (data?.value ?? {}) as Partial<AppSettings>;
  return { ...DEFAULT_SETTINGS, ...value };
}

const SettingsContext = createContext<AppSettings>(DEFAULT_SETTINGS);

/** Loads settings once and exposes them app-wide (branding/feature flags). */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  useEffect(() => {
    fetchSettings()
      .then(setSettings)
      .catch(() => {});
  }, []);

  // Apply the admin accent color to the theme tokens.
  useEffect(() => {
    if (settings.accentColor) {
      const root = document.documentElement;
      root.style.setProperty("--ink-accent", settings.accentColor);
      root.style.setProperty("--ink-accentHover", settings.accentColor);
    }
  }, [settings.accentColor]);

  // Default UI language when the visitor hasn't chosen one yet.
  useEffect(() => {
    if (
      settings.defaultLanguage &&
      !localStorage.getItem(I18N_STORAGE_KEY) &&
      i18n.resolvedLanguage !== settings.defaultLanguage
    ) {
      void i18n.changeLanguage(settings.defaultLanguage);
    }
  }, [settings.defaultLanguage]);

  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): AppSettings {
  return useContext(SettingsContext);
}
