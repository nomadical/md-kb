import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useSettings } from "@/spa/data/settings";

export type Theme = "light" | "dark" | "system";
export type Resolved = "light" | "dark";

type ThemeCtx = {
  theme: Theme;
  resolved: Resolved;
  setTheme: (t: Theme) => void;
  /** Flip between light/dark from whatever is currently shown (the switcher
   *  button and ⇧⌘L). Until the user toggles, the app has no stored preference
   *  and follows the OS ("system"); the first toggle commits an explicit
   *  light/dark choice. */
  toggle: () => void;
};

const Ctx = createContext<ThemeCtx | null>(null);
export const THEME_KEY = "kb-theme";

/** Inline, runs before paint — keeps the no-flash script and provider in sync. */
export const NO_FLASH_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_KEY}')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=d?'dark':'light';var e=document.documentElement;e.dataset.theme=r;e.dataset.colorMode=r;}catch(e){}})();`;

function systemResolved(): Resolved {
  return typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function apply(resolved: Resolved) {
  const el = document.documentElement;
  el.dataset.theme = resolved;
  el.dataset.colorMode = resolved; // @uiw md-editor/preview read this
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { defaultTheme } = useSettings();
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolved, setResolved] = useState<Resolved>("light");

  // Hydrate the preference from storage on mount.
  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY) as Theme | null;
    if (stored === "light" || stored === "dark" || stored === "system") {
      setThemeState(stored);
    }
  }, []);

  // With no stored choice, follow the admin's default theme (not persisted, so
  // the first explicit toggle still wins).
  useEffect(() => {
    if (!localStorage.getItem(THEME_KEY)) setThemeState(defaultTheme);
  }, [defaultTheme]);

  // Resolve + apply whenever the preference (or, in system mode, the OS) changes.
  useEffect(() => {
    const compute = () => {
      const r = theme === "system" ? systemResolved() : theme;
      setResolved(r);
      apply(r);
    };
    compute();
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", compute);
    return () => mq.removeEventListener("change", compute);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    localStorage.setItem(THEME_KEY, t);
    setThemeState(t);
  }, []);

  const toggle = useCallback(() => {
    setTheme(resolved === "dark" ? "light" : "dark");
  }, [resolved, setTheme]);

  return (
    <Ctx.Provider value={{ theme, resolved, setTheme, toggle }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTheme(): ThemeCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useTheme must be used within <ThemeProvider>.");
  return c;
}
