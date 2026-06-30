// Pull translations from POEditor into src/i18n/locales/*.json.
//
//   node --env-file=.env.local scripts/i18n-pull.mjs
//   (or: npm run i18n:pull)
//
// Requires POEDITOR_API_TOKEN + POEDITOR_PROJECT_ID. Exports each language as
// flat key_value_json, then writes it back as a nested file the app consumes.

import { writeFile } from "node:fs/promises";
import path from "node:path";
import {
  LANGUAGES,
  LOCALES_DIR,
  poeditor,
  requireEnv,
  unflatten,
  stableStringify,
} from "./i18n-common.mjs";

const { token, projectId } = requireEnv();

for (const lang of LANGUAGES) {
  // 1. Ask POEditor for an export URL for this language (flat key:value JSON).
  const exported = await poeditor("/projects/export", {
    api_token: token,
    id: projectId,
    language: lang.poeditor,
    type: "key_value_json",
  });
  const url = exported.result?.url;
  if (!url) {
    console.error(`! ${lang.code}: no export URL returned, skipping`);
    continue;
  }

  // 2. Download the exported file and nest it for react-i18next.
  const flat = await fetch(url).then((r) => r.json());
  const nested = unflatten(flat);
  const file = path.join(LOCALES_DIR, `${lang.code}.json`);
  await writeFile(file, stableStringify(nested));
  console.log(
    `✓ ${lang.code}: ${Object.keys(flat).length} keys → ${path.relative(process.cwd(), file)}`,
  );
}

console.log("Done.");
