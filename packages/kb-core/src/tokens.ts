// Canonical SkyCell KB design tokens — the single source of truth for brand
// colour, radius, and type, shared by the Next app (its Tailwind `@theme` in
// src/app/globals.css mirrors these values) and by @md-kb/react's
// createKbTheme(). Plain values, no framework imports.

/**
 * Brand palettes. The KB app and standalone embeds default to SkyCell blue;
 * embeds hosted inside Validaide keep its teal. `primary` is the light-mode
 * accent, `primaryDark` the dark-mode accent, `primaryHover` the hover/active.
 */
export const KB_BRANDS = {
  skycell: {
    primary: "#0369a1",
    primaryHover: "#075985",
    primaryDark: "#38bdf8",
  },
  validaide: {
    primary: "#00a69c",
    primaryHover: "#00857d",
    primaryDark: "#33c2b9",
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
