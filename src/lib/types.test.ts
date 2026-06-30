import { describe, expect, it } from "vitest";
import { canWriteArticle, isPublicArticle, DEFAULT_SETTINGS, type Role } from "@/lib/types";

describe("isPublicArticle", () => {
  it("treats empty access_roles as public", () => {
    expect(isPublicArticle([])).toBe(true);
  });
  it("treats BASIC_ACCESS as public", () => {
    expect(isPublicArticle(["BASIC_ACCESS"])).toBe(true);
    expect(isPublicArticle(["INTERNAL", "BASIC_ACCESS"])).toBe(true);
  });
  it("treats any other role set as gated", () => {
    expect(isPublicArticle(["INTERNAL"])).toBe(false);
  });
});

describe("canWriteArticle", () => {
  const cases: [Role | null, string[], string[], boolean][] = [
    // admins + reviewers may write anything
    ["admin", ["INTERNAL"], [], true],
    ["reviewer", ["INTERNAL"], [], true],
    // viewers + anon may never write
    ["viewer", [], [], false],
    [null, [], [], false],
    // editors: public articles, or ones whose roles they fully hold
    ["editor", [], [], true],
    ["editor", ["BASIC_ACCESS"], [], true],
    ["editor", ["INTERNAL"], ["INTERNAL"], true],
    ["editor", ["INTERNAL", "STAFF"], ["INTERNAL"], false],
    ["editor", ["INTERNAL"], ["STAFF"], false],
  ];
  it.each(cases)(
    "role=%s article=%j user=%j -> %s",
    (role, articleRoles, userRoles, expected) => {
      expect(canWriteArticle(articleRoles, userRoles, role)).toBe(expected);
    },
  );
});

describe("DEFAULT_SETTINGS", () => {
  it("ships safe defaults (review required, no public-read gate, viewer default)", () => {
    expect(DEFAULT_SETTINGS.requireReview).toBe(true);
    expect(DEFAULT_SETTINGS.requireLoginToRead).toBe(false);
    expect(DEFAULT_SETTINGS.defaultUserRole).toBe("viewer");
  });
});
