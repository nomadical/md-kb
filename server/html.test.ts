import { describe, expect, it } from "vitest";
import { summarize } from "./html";

describe("summarize", () => {
  it("strips markdown to plain text", () => {
    expect(summarize("# Title\n\nSome **bold** and `code` and [a link](/x).")).toBe(
      "Title Some bold and code and a link.",
    );
  });
  it("drops fenced code and images", () => {
    expect(summarize("Intro\n\n```js\nconst x = 1\n```\n\n![alt](/img.png) end")).toBe(
      "Intro end",
    );
  });
  it("truncates long text on a word boundary with an ellipsis", () => {
    const out = summarize("word ".repeat(100), 40);
    expect(out.length).toBeLessThanOrEqual(40);
    expect(out.endsWith("…")).toBe(true);
    expect(out).not.toMatch(/\bwor$/); // didn't cut mid-word
  });
  it("returns short text unchanged", () => {
    expect(summarize("Just a line.")).toBe("Just a line.");
  });
});
