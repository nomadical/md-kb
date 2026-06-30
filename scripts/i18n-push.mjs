// Push the source-language keys (src/i18n/locales/en.json) to POEditor so new
// strings show up there for translators.
//
//   node --env-file=.env.local scripts/i18n-push.mjs
//   (or: npm run i18n:push)
//
// Uploads as terms + the English reference translation. Existing translations in
// POEditor are NOT overwritten (overwrite=0); it only adds new terms and the
// English source text. Run i18n:pull afterwards to bring translations back.

import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  LOCALES_DIR,
  POEDITOR_API,
  flatten,
  requireEnv,
} from "./i18n-common.mjs";

const { token, projectId } = requireEnv();

const en = JSON.parse(
  await readFile(path.join(LOCALES_DIR, "en.json"), "utf8"),
);
const flat = flatten(en);

// POEditor /projects/upload expects the data as an uploaded file part.
const terms = Object.entries(flat).map(([term, value]) => ({
  term,
  translation: { content: value },
}));

const form = new FormData();
form.append("api_token", token);
form.append("id", projectId);
form.append("updating", "terms_translations");
form.append("language", "en");
form.append("overwrite", "0"); // don't clobber existing translations
form.append("sync_terms", "0"); // don't delete terms missing from this file
form.append(
  "file",
  new Blob([JSON.stringify(terms)], { type: "application/json" }),
  "en.json",
);

const res = await fetch(`${POEDITOR_API}/projects/upload`, {
  method: "POST",
  body: form,
});
const json = await res.json();
if (json?.response?.status !== "success") {
  console.error(`POEditor upload failed: ${json?.response?.message ?? res.status}`);
  process.exit(1);
}

const t = json.result?.terms ?? {};
const tr = json.result?.translations ?? {};
console.log(
  `✓ pushed ${Object.keys(flat).length} keys — terms added ${t.added ?? 0}, translations added ${tr.added ?? 0}.`,
);
