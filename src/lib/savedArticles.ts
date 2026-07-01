import { useSyncExternalStore } from "react";

// Client-only "saved articles" store. Slugs are persisted in localStorage and
// exposed through a reactive hook so the bookmark toggle, the nav count, and the
// Saved page all stay in sync. No backend — this is a per-browser preference.

const KEY = "kb:saved-articles";

function read(): string[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? arr.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

// Cached snapshot so useSyncExternalStore gets a stable reference between
// changes (returning a fresh array every read would loop).
let snapshot: string[] = read();
const listeners = new Set<() => void>();

function emit() {
  snapshot = read();
  for (const l of listeners) l();
}

function write(slugs: string[]) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(slugs));
  } catch {
    // ignore quota/availability errors
  }
  emit();
}

/** Add or remove a slug; returns the new saved state for that slug. */
export function toggleSaved(slug: string): boolean {
  const current = read();
  const has = current.includes(slug);
  write(has ? current.filter((s) => s !== slug) : [slug, ...current]);
  return !has;
}

export function isSaved(slug: string): boolean {
  return read().includes(slug);
}

// Cross-tab sync: mirror changes made in other tabs.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) emit();
  });
}

/** Reactive list of saved slugs (most-recently-saved first). */
export function useSavedSlugs(): string[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => snapshot,
    () => snapshot,
  );
}

/** Reactive boolean for a single slug. */
export function useIsSaved(slug: string): boolean {
  return useSavedSlugs().includes(slug);
}
