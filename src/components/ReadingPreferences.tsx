import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Reader-facing "Appearance" preferences (Wikipedia-style): text size, reading
 * column width, font family and line spacing. Persisted per-browser in
 * localStorage and applied as `data-reading-*` attributes on <html>, which
 * globals.css keys off (scoped to `.article-reading` so the editor preview is
 * untouched). No backend — a personal reading preference, like the theme.
 */
export type TextSize = "sm" | "base" | "lg" | "xl";
export type ReadingWidth = "standard" | "wide";
export type ReadingFont = "sans" | "serif" | "dyslexic";
export type LineSpacing = "normal" | "relaxed";

export type ReadingPrefs = {
  size: TextSize;
  width: ReadingWidth;
  font: ReadingFont;
  spacing: LineSpacing;
};

export const DEFAULT_READING_PREFS: ReadingPrefs = {
  size: "base",
  width: "standard",
  font: "sans",
  spacing: "normal",
};

const KEY = "kb:reading-prefs";

// The valid values per key, so a hand-edited / stale localStorage blob can't
// push a bogus attribute onto <html>.
const ALLOWED: { [K in keyof ReadingPrefs]: readonly ReadingPrefs[K][] } = {
  size: ["sm", "base", "lg", "xl"],
  width: ["standard", "wide"],
  font: ["sans", "serif", "dyslexic"],
  spacing: ["normal", "relaxed"],
};

function read(): ReadingPrefs {
  if (typeof localStorage === "undefined") return DEFAULT_READING_PREFS;
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<ReadingPrefs>) : {};
    const out = { ...DEFAULT_READING_PREFS };
    for (const k of Object.keys(ALLOWED) as (keyof ReadingPrefs)[]) {
      const v = parsed[k];
      if (v && (ALLOWED[k] as readonly string[]).includes(v)) {
        // @ts-expect-error index is narrowed by the loop key
        out[k] = v;
      }
    }
    return out;
  } catch {
    return DEFAULT_READING_PREFS;
  }
}

function apply(prefs: ReadingPrefs) {
  const el = document.documentElement;
  el.dataset.readingSize = prefs.size;
  el.dataset.readingWidth = prefs.width;
  el.dataset.readingFont = prefs.font;
  el.dataset.readingSpacing = prefs.spacing;
}

type Ctx = {
  prefs: ReadingPrefs;
  set: <K extends keyof ReadingPrefs>(key: K, value: ReadingPrefs[K]) => void;
  reset: () => void;
};

const ReadingCtx = createContext<Ctx | null>(null);

export function ReadingPreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<ReadingPrefs>(DEFAULT_READING_PREFS);

  // Hydrate from storage on mount, then keep <html> attributes in sync.
  useEffect(() => {
    setPrefs(read());
  }, []);
  useEffect(() => {
    apply(prefs);
  }, [prefs]);

  const set = useCallback(
    <K extends keyof ReadingPrefs>(key: K, value: ReadingPrefs[K]) => {
      setPrefs((prev) => {
        const next = { ...prev, [key]: value };
        try {
          localStorage.setItem(KEY, JSON.stringify(next));
        } catch {
          // ignore quota/availability errors
        }
        return next;
      });
    },
    [],
  );

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // ignore
    }
    setPrefs(DEFAULT_READING_PREFS);
  }, []);

  const value = useMemo(() => ({ prefs, set, reset }), [prefs, set, reset]);

  return (
    <ReadingCtx.Provider value={value}>{children}</ReadingCtx.Provider>
  );
}

export function useReadingPrefs(): Ctx {
  const c = useContext(ReadingCtx);
  if (!c)
    throw new Error(
      "useReadingPrefs must be used within <ReadingPreferencesProvider>.",
    );
  return c;
}
