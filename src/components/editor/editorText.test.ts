import { describe, expect, it } from "vitest";
import { caretPos, linkT, wrapT } from "./editorText";

describe("wrapT", () => {
  it("wraps a selection and selects the wrapped text", () => {
    expect(wrapT("**")("bold")).toEqual({ text: "**bold**", selStart: 2, selEnd: 6 });
  });
  it("supports distinct open/close markers", () => {
    expect(wrapT("<", ">")("x")).toEqual({ text: "<x>", selStart: 1, selEnd: 2 });
  });
  it("places the caret between markers for an empty selection", () => {
    const r = wrapT("`")("");
    expect(r.text).toBe("``");
    expect(r.selStart).toBe(1);
    expect(r.selEnd).toBe(1);
  });
});

describe("linkT", () => {
  it("uses the selection as the label and selects the url placeholder", () => {
    const r = linkT("Docs");
    expect(r.text).toBe("[Docs](url)");
    expect(r.text.slice(r.selStart, r.selEnd)).toBe("url");
  });
  it("falls back to 'text' for an empty selection", () => {
    expect(linkT("").text).toBe("[text](url)");
  });
});

describe("caretPos", () => {
  it("returns undefined for non-textarea targets", () => {
    expect(caretPos(null)).toBeUndefined();
    expect(caretPos(document.createElement("div"))).toBeUndefined();
  });
  it("reads the selection range from a textarea", () => {
    const ta = document.createElement("textarea");
    ta.value = "hello world";
    ta.setSelectionRange(2, 5);
    expect(caretPos(ta)).toEqual({ start: 2, end: 5 });
  });
});
