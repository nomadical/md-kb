import { beforeEach, describe, expect, it } from "vitest";
import { isSaved, toggleSaved } from "@/lib/savedArticles";

beforeEach(() => localStorage.clear());

describe("saved articles store", () => {
  it("toggles a slug on and off, returning the new state", () => {
    expect(isSaved("a")).toBe(false);
    expect(toggleSaved("a")).toBe(true);
    expect(isSaved("a")).toBe(true);
    expect(toggleSaved("a")).toBe(false);
    expect(isSaved("a")).toBe(false);
  });

  it("prepends newly saved slugs (most-recent first)", () => {
    toggleSaved("first");
    toggleSaved("second");
    expect(JSON.parse(localStorage.getItem("kb:saved-articles")!)).toEqual([
      "second",
      "first",
    ]);
  });

  it("tolerates corrupt localStorage", () => {
    localStorage.setItem("kb:saved-articles", "{not json");
    expect(isSaved("x")).toBe(false);
    expect(toggleSaved("x")).toBe(true);
  });
});
