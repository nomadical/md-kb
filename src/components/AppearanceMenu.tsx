import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaFont, FaArrowRotateLeft } from "react-icons/fa6";
import {
  useReadingPrefs,
  DEFAULT_READING_PREFS,
} from "@/components/ReadingPreferences";

/** One row of mutually-exclusive choices (a segmented control). */
function Segment<V extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: V;
  options: { value: V; label: string; hint?: string }[];
  onChange: (v: V) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-mut">
        {label}
      </div>
      <div
        role="radiogroup"
        aria-label={label}
        className="flex gap-1 rounded-lg border border-ink-line bg-ink-bg p-1"
      >
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={String(o.value)}
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.value)}
              className={`flex-1 rounded-md px-2 py-1.5 text-[13px] transition-colors ${
                active
                  ? "bg-ink-accent font-medium text-white"
                  : "text-ink-fg hover:bg-black/[0.05]"
              }`}
              title={o.hint}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * The reader "Appearance" control: a popover in the app bar exposing text size,
 * reading width, font family and line spacing. Mirrors Wikipedia's appearance
 * panel; state lives in {@link useReadingPrefs}.
 */
export default function AppearanceMenu() {
  const { t } = useTranslation();
  const { prefs, set, reset } = useReadingPrefs();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node))
        setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isDefault =
    prefs.size === DEFAULT_READING_PREFS.size &&
    prefs.width === DEFAULT_READING_PREFS.width &&
    prefs.font === DEFAULT_READING_PREFS.font &&
    prefs.spacing === DEFAULT_READING_PREFS.spacing;

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={t("appearance.title")}
        aria-label={t("appearance.title")}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-ink-line px-2.5 text-[12px] text-ink-mut transition-colors hover:border-ink-accent hover:text-ink-accent"
      >
        <FaFont className="text-[13px]" />
        <span className="hidden sm:inline">{t("appearance.short")}</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={t("appearance.title")}
          className="absolute right-0 z-50 mt-2 w-72 origin-top-right rounded-xl border border-ink-line bg-ink-panel p-4 shadow-lg animate-[fade-up_0.12s_ease-out]"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[13px] font-semibold">
              {t("appearance.title")}
            </span>
            {!isDefault && (
              <button
                onClick={reset}
                className="inline-flex items-center gap-1 text-[12px] text-ink-mut hover:text-ink-accent"
              >
                <FaArrowRotateLeft className="text-[10px]" />
                {t("appearance.reset")}
              </button>
            )}
          </div>

          <div className="space-y-3.5">
            <Segment
              label={t("appearance.size.label")}
              value={prefs.size}
              onChange={(v) => set("size", v)}
              options={[
                { value: "sm", label: "S", hint: t("appearance.size.sm") },
                { value: "base", label: "M", hint: t("appearance.size.base") },
                { value: "lg", label: "L", hint: t("appearance.size.lg") },
                { value: "xl", label: "XL", hint: t("appearance.size.xl") },
              ]}
            />
            <Segment
              label={t("appearance.width.label")}
              value={prefs.width}
              onChange={(v) => set("width", v)}
              options={[
                { value: "standard", label: t("appearance.width.standard") },
                { value: "wide", label: t("appearance.width.wide") },
              ]}
            />
            <Segment
              label={t("appearance.font.label")}
              value={prefs.font}
              onChange={(v) => set("font", v)}
              options={[
                { value: "sans", label: t("appearance.font.sans") },
                { value: "serif", label: t("appearance.font.serif") },
                { value: "dyslexic", label: t("appearance.font.dyslexic") },
              ]}
            />
            <Segment
              label={t("appearance.spacing.label")}
              value={prefs.spacing}
              onChange={(v) => set("spacing", v)}
              options={[
                { value: "normal", label: t("appearance.spacing.normal") },
                { value: "relaxed", label: t("appearance.spacing.relaxed") },
              ]}
            />
          </div>
        </div>
      )}
    </div>
  );
}
