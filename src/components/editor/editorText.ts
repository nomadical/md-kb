// Pure text helpers for the markdown editor: caret resolution and the
// selection-transform builders used by the toolbar / context menu / shortcuts.
// No React or DOM state — kept here so they're trivially unit-testable.

export interface EditRange {
  start: number;
  end: number;
}

/** The result of transforming a selection: replacement text plus where to put
 *  the caret/selection afterwards (offsets relative to the inserted text). */
export interface EditResult {
  text: string;
  selStart?: number;
  selEnd?: number;
}

/** Resolve the caret position from a paste/drop whose target is the editor's
 *  <textarea>. Returns undefined (meaning: append) if we can't find it. */
export function caretPos(target: EventTarget | null): EditRange | undefined {
  if (target instanceof HTMLTextAreaElement) {
    return { start: target.selectionStart, end: target.selectionEnd };
  }
  return undefined;
}

/** Wrap the selection with markers; the caret lands between them (empty
 *  selection) or around the wrapped text (so the next toggle still targets it). */
export const wrapT =
  (before: string, after = before) =>
  (sel: string): EditResult => ({
    text: `${before}${sel}${after}`,
    selStart: before.length,
    selEnd: before.length + sel.length,
  });

/** `[label](url)` with the `url` placeholder selected, ready to type over. */
export const linkT = (sel: string): EditResult => {
  const label = sel || "text";
  const caret = `[${label}](`.length;
  return { text: `[${label}](url)`, selStart: caret, selEnd: caret + 3 };
};
