import type { PreviewType } from "@uiw/react-md-editor";

// ---- Local draft recovery ----------------------------------------------
export type Draft = {
  title: string;
  slug: string;
  folder: string;
  tags: string;
  accessRoles: string[];
  contextKeys: string;
  content: string;
  ts: number;
};

const draftKey = (id: string) => `kb-draft-${id}`;

export function loadDraft(id: string): Draft | null {
  try {
    const raw = window.localStorage.getItem(draftKey(id));
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

export function saveDraft(id: string, draft: Draft) {
  try {
    window.localStorage.setItem(draftKey(id), JSON.stringify(draft));
  } catch {
    /* storage full / disabled — recovery just won't be available */
  }
}

export function clearDraft(id: string) {
  try {
    window.localStorage.removeItem(draftKey(id));
  } catch {
    /* ignore */
  }
}

// ---- Layout-preference persistence -------------------------------------
const VIEW_KEY = "kb-editor-view";
const SPLIT_KEY = "kb-editor-split";

function storePref(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private mode / disabled storage — preference just won't persist */
  }
}

export function loadView(fallback: PreviewType = "live"): PreviewType {
  try {
    const v = window.localStorage.getItem(VIEW_KEY);
    if (v === "edit" || v === "live" || v === "preview") return v;
  } catch {
    /* ignore */
  }
  return fallback;
}

export function saveView(value: PreviewType) {
  storePref(VIEW_KEY, value);
}

export function loadSplit(): number {
  try {
    const n = Number(window.localStorage.getItem(SPLIT_KEY));
    if (Number.isFinite(n) && n >= 15 && n <= 85) return n;
  } catch {
    /* ignore */
  }
  return 50;
}

export function saveSplit(value: number) {
  storePref(SPLIT_KEY, String(value));
}
