import { defineConfig } from "tsup";

// kb-core ships built JS + .d.ts so both consumers get a real declaration file:
// the Next app imports it like any dep, and kb-react's tsup (dts.resolve) can
// inline these types into its own published .d.ts (so kb-core stays private).
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  treeshake: true,
});
