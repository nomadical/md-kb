// Canonical KB design tokens — the single source of truth for brand colour,
// radius, and type. The app's Tailwind theme (src/styles/globals.css) mirrors
// these values. Plain values, no framework imports.

/**
 * Brand palettes. The app defaults to `default` (blue); admins can override the
 * accent at runtime via Settings → Branding. `primary` is the light-mode accent,
 * `primaryDark` the dark-mode accent, `primaryHover` the hover/active accent.
 */
export const KB_BRANDS = {
  default: {
    primary: "#0369a1",
    primaryHover: "#075985",
    primaryDark: "#38bdf8",
  },
} as const;

export type KbBrand = keyof typeof KB_BRANDS;

/** Neutral surface/text ramp (light mode) shared with the app's ink-* tokens. */
export const KB_NEUTRALS = {
  bg: "#f4f6f9",
  panel: "#ffffff",
  line: "#d7dde5",
  muted: "#475569",
  fg: "#0f172a",
} as const;

/** Corner radii (px). */
export const KB_RADII = { sm: 4, md: 8, lg: 12 } as const;

/** App font stack. */
export const KB_FONT_STACK =
  '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
