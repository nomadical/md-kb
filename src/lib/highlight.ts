export interface HighlightSegment {
  text: string;
  match: boolean;
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Split `text` into segments, flagging the parts that match `query`
 * (case-insensitive, all occurrences). Empty query → one non-matching segment.
 * Pure + allocation-light so it can drive a <mark>-rendering component.
 */
export function splitHighlight(text: string, query: string): HighlightSegment[] {
  const q = query.trim();
  if (!q) return [{ text, match: false }];
  const re = new RegExp(`(${escapeRegExp(q)})`, "ig");
  const needle = q.toLowerCase();
  return text
    .split(re)
    .filter((s) => s !== "")
    .map((s) => ({ text: s, match: s.toLowerCase() === needle }));
}
