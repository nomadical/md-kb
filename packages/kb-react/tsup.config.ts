import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  // dts.resolve inlines @skycell-ag/kb-core's types into the .d.ts; noExternal
  // inlines its JS. Both are needed so the published package is self-contained
  // (kb-core is private/unpublished).
  dts: { resolve: true },
  sourcemap: true,
  clean: true,
  treeshake: true,
  noExternal: ["@skycell-ag/kb-core"],
  // Keep the host's copies of these; never bundle them into the lib.
  external: [
    "react",
    "react-dom",
    "@mui/material",
    "@mui/icons-material",
    "@emotion/react",
    "@emotion/styled",
    "@skycell-ag/scd-lib",
  ],
});
