import { describe, expect, it } from "vitest";
import { splitHighlight } from "@/lib/highlight";

describe("splitHighlight", () => {
  it("returns the whole string for an empty query", () => {
    expect(splitHighlight("Hello", "")).toEqual([{ text: "Hello", match: false }]);
    expect(splitHighlight("Hello", "   ")).toEqual([{ text: "Hello", match: false }]);
  });

  it("flags case-insensitive matches while preserving original casing", () => {
    expect(splitHighlight("Notification Settings", "set")).toEqual([
      { text: "Notification ", match: false },
      { text: "Set", match: true },
      { text: "tings", match: false },
    ]);
  });

  it("flags every occurrence", () => {
    const segs = splitHighlight("aXaXa", "x");
    expect(segs.filter((s) => s.match).map((s) => s.text)).toEqual(["X", "X"]);
    expect(segs.map((s) => s.text).join("")).toBe("aXaXa");
  });

  it("treats regex metacharacters in the query literally", () => {
    expect(splitHighlight("a.b.c", ".")).toEqual([
      { text: "a", match: false },
      { text: ".", match: true },
      { text: "b", match: false },
      { text: ".", match: true },
      { text: "c", match: false },
    ]);
  });

  it("returns a single non-matching segment when there is no match", () => {
    expect(splitHighlight("Hello", "zzz")).toEqual([{ text: "Hello", match: false }]);
  });
});
