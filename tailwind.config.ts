import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Slate-based palette, driven by CSS variables (see globals.css) so the
        // `data-theme="dark"` attribute on <html> swaps light/dark globally.
        ink: {
          bg: "var(--ink-bg)", // app background
          panel: "var(--ink-panel)", // cards / sidebars
          line: "var(--ink-line)", // borders
          mut: "var(--ink-mut)", // secondary text
          fg: "var(--ink-fg)", // primary text
          accent: "var(--ink-accent)", // brand accent (admin-configurable)
          accentHover: "var(--ink-accentHover)", // accent hover
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
