import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Article } from "@/lib/types";
import { snapshot, useEditorState } from "./useEditorState";

function makeArticle(over: Partial<Article> = {}): Article {
  return {
    id: "a1",
    slug: "hello",
    title: "Hello",
    folder: "Guides",
    content: "# Hello\n\nbody",
    tags: ["x", "y"],
    access_roles: ["role-b", "role-a"],
    context_keys: ["k1"],
    status: "draft",
    published: false,
    submitted_by: null,
    submitted_at: null,
    reviewed_by: null,
    reviewed_at: null,
    review_note: null,
    deleted_at: null,
    deleted_by: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...over,
  };
}

describe("snapshot", () => {
  it("is insensitive to access-role ordering", () => {
    expect(snapshot("t", "s", "f", "tag", ["a", "b"], "c", "body")).toBe(
      snapshot("t", "s", "f", "tag", ["b", "a"], "c", "body"),
    );
  });

  it("changes when any field changes", () => {
    expect(snapshot("t", "s", "f", "tag", ["a"], "c", "body")).not.toBe(
      snapshot("t2", "s", "f", "tag", ["a"], "c", "body"),
    );
  });
});

describe("useEditorState", () => {
  it("starts clean (current === baseline)", () => {
    const { result } = renderHook(() => useEditorState(makeArticle()));
    expect(result.current.current).toBe(result.current.baseline);
  });

  it("treats 'untitled' slugs as fresh (auto-slug) and named ones as touched", () => {
    const fresh = renderHook(() =>
      useEditorState(makeArticle({ slug: "untitled-1" })),
    );
    expect(fresh.result.current.slugTouched).toBe(false);

    const named = renderHook(() =>
      useEditorState(makeArticle({ slug: "hello" })),
    );
    expect(named.result.current.slugTouched).toBe(true);
  });

  it("diverges from baseline once a field is edited", () => {
    const { result } = renderHook(() => useEditorState(makeArticle()));
    act(() => result.current.setContent("edited body"));
    expect(result.current.current).not.toBe(result.current.baseline);
  });

  it("applyDraft loads draft values and marks the slug as touched", () => {
    const { result } = renderHook(() =>
      useEditorState(makeArticle({ slug: "untitled-1" })),
    );
    act(() =>
      result.current.applyDraft({
        title: "Draft Title",
        slug: "draft-slug",
        folder: "F",
        tags: "a, b",
        accessRoles: ["r1"],
        contextKeys: "ck",
        content: "draft body",
        ts: 1,
      }),
    );
    expect(result.current.title).toBe("Draft Title");
    expect(result.current.content).toBe("draft body");
    expect(result.current.slugTouched).toBe(true);
  });

  it("re-syncs all fields and resets baseline when the article changes", () => {
    const { result, rerender } = renderHook(({ a }) => useEditorState(a), {
      initialProps: { a: makeArticle({ id: "a1", title: "One" }) },
    });
    act(() => result.current.setTitle("locally edited"));
    expect(result.current.title).toBe("locally edited");

    rerender({ a: makeArticle({ id: "a2", title: "Two", slug: "two" }) });
    expect(result.current.title).toBe("Two");
    // A fresh article means no unsaved edits.
    expect(result.current.current).toBe(result.current.baseline);
  });
});
