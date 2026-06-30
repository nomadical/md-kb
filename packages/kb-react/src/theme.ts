import { createTheme, type Theme } from "@mui/material/styles";
import { KB_BRANDS, KB_FONT_STACK, KB_RADII, type KbBrand } from "@skycell-ag/kb-core";

export type CreateKbThemeOptions = {
  /** Brand palette — "skycell" (default) or "validaide". */
  brand?: KbBrand;
  /** "light" (default) or "dark". */
  mode?: "light" | "dark";
};

/**
 * Build an on-brand MUI theme for the KB widgets from the shared kb-core design
 * tokens. Use when a host has no MUI theme of its own (a host that already wraps
 * the widget in its own ThemeProvider — e.g. the Validaide-teal Intervention
 * client — can keep doing that instead). Keeps every embed recognisably the
 * same product.
 */
export function createKbTheme(options: CreateKbThemeOptions = {}): Theme {
  const { brand = "skycell", mode = "light" } = options;
  const b = KB_BRANDS[brand];
  return createTheme({
    palette: {
      mode,
      primary: {
        main: mode === "dark" ? b.primaryDark : b.primary,
        dark: b.primaryHover,
      },
    },
    shape: { borderRadius: KB_RADII.md },
    typography: { fontFamily: KB_FONT_STACK },
  });
}
