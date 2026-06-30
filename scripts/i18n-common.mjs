// Shared helpers for the POEditor sync scripts.
//
// Local locale files (src/i18n/locales/*.json) are NESTED (so react-i18next can
// resolve dotted keys like "editor.title"). POEditor stores flat, dotted term
// keys. These helpers convert between the two representations.

import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
export const LOCALES_DIR = path.resolve(here, "../src/i18n/locales");

// Languages to sync. `code` is the local file name + i18next code; `poeditor`
// is the language code in your POEditor project (usually identical). Keep in
// sync with LANGUAGES in packages/kb-core/src/index.ts.
export const LANGUAGES = [
  { code: "en", poeditor: "en" },
  { code: "de", poeditor: "de" },
];

export const POEDITOR_API = "https://api.poeditor.com/v2";

export function requireEnv() {
  const token = process.env.POEDITOR_API_TOKEN;
  const projectId = process.env.POEDITOR_PROJECT_ID;
  if (!token || !projectId) {
    console.error(
      "Missing POEDITOR_API_TOKEN and/or POEDITOR_PROJECT_ID.\n" +
        "Add them to .env.local and run with `node --env-file=.env.local scripts/i18n-pull.mjs`.",
    );
    process.exit(1);
  }
  return { token, projectId };
}

/** POST application/x-www-form-urlencoded to the POEditor API and return JSON. */
export async function poeditor(endpoint, fields) {
  const body = new URLSearchParams(fields);
  const res = await fetch(`${POEDITOR_API}${endpoint}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = await res.json();
  if (json?.response?.status !== "success") {
    throw new Error(
      `POEditor ${endpoint} failed: ${json?.response?.message ?? res.status}`,
    );
  }
  return json;
}

/** { "a": { "b": "x" } } -> { "a.b": "x" } */
export function flatten(obj, prefix = "", out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}

/** { "a.b": "x" } -> { "a": { "b": "x" } } */
export function unflatten(flat) {
  const out = {};
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split(".");
    let node = out;
    for (let i = 0; i < parts.length - 1; i++) {
      node[parts[i]] ??= {};
      node = node[parts[i]];
    }
    node[parts[parts.length - 1]] = value;
  }
  return out;
}

/** Stable, recursively key-sorted JSON (so diffs stay minimal). */
export function stableStringify(obj) {
  const sort = (v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, sort(v[k])]),
        )
      : v;
  return JSON.stringify(sort(obj), null, 2) + "\n";
}
