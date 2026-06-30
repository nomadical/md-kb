import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Article } from "@/lib/types";
import { useAutosave } from "./useAutosave";

// Mock the write module so no network / Supabase client is touched.
vi.mock("@/spa/data/writes", () => ({ saveArticle: vi.fn() }));
import { saveArticle } from "@/spa/data/writes";
const mockSave = vi.mocked(saveArticle);

function makeArticle(over: Partial<Article> = {}): Article {
  return {
    id: "a1",
    slug: "hello",
    title: "Hello",
    folder: "Guides",
    content: "# Hello\n\nbody",
    tags: ["x", "y"],
    access_roles: ["role-a"],
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

type Params = Parameters<typeof useAutosave>[0];

function setup(over: Partial<Params> = {}) {
  const setBaseline = vi.fn();
  const applyDraft = vi.fn();
  const pushToast = vi.fn();
  const article = over.article ?? makeArticle();
  const initialProps: Params = {
    article,
    canEdit: true,
    current: "CURRENT",
    dirty: true,
    title: "T",
    slug: "s",
    folder: "F",
    tags: "a, b",
    accessRoles: ["r1"],
    contextKeys: "ck",
    content: "body",
    setBaseline,
    applyDraft,
    pushToast,
    ...over,
  };
  const utils = renderHook((p: Params) => useAutosave(p), { initialProps });
  return { ...utils, setBaseline, applyDraft, pushToast, article };
}

beforeEach(() => {
  localStorage.clear();
  mockSave.mockReset();
  mockSave.mockResolvedValue({ ok: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useAutosave — manual save", () => {
  it("posts the current fields, resets the baseline, and toasts success", async () => {
    const { result, setBaseline, pushToast } = setup();
    await act(async () => {
      result.current.save();
    });
    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "a1",
        title: "T",
        slug: "s",
        folder: "F",
        content: "body",
        tags: ["a", " b"],
        access_roles: ["r1"],
        context_keys: ["ck"],
      }),
    );
    expect(setBaseline).toHaveBeenCalledTimes(1);
    expect(pushToast).toHaveBeenCalledWith("success", "Article saved");
  });

  it("surfaces a save failure as an error toast and does not reset baseline", async () => {
    mockSave.mockResolvedValue({ ok: false, error: "boom" });
    const { result, setBaseline, pushToast } = setup();
    await act(async () => {
      result.current.save();
    });
    expect(setBaseline).not.toHaveBeenCalled();
    expect(pushToast).toHaveBeenCalledWith("error", "Save failed: boom");
  });
});

describe("useAutosave — debounced autosave", () => {
  it("autosaves 1.5s after an edit when dirty", async () => {
    vi.useFakeTimers();
    setup({ dirty: true });
    await act(async () => {
      vi.advanceTimersByTime(1500);
    });
    expect(mockSave).toHaveBeenCalledTimes(1);
  });

  it("does not autosave while clean", async () => {
    vi.useFakeTimers();
    setup({ dirty: false });
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    expect(mockSave).not.toHaveBeenCalled();
  });
});

describe("useAutosave — local draft mirror", () => {
  it("writes a recoverable draft to localStorage 600ms after an edit", () => {
    vi.useFakeTimers();
    setup({ dirty: true, canEdit: true });
    expect(localStorage.getItem("kb-draft-a1")).toBeNull();
    act(() => {
      vi.advanceTimersByTime(600);
    });
    const raw = localStorage.getItem("kb-draft-a1");
    expect(raw).toBeTruthy();
    const draft = JSON.parse(raw!);
    expect(draft.title).toBe("T");
    expect(draft.content).toBe("body");
  });
});

describe("useAutosave — recovery on open", () => {
  it("offers a divergent local draft for recovery", () => {
    const article = makeArticle();
    localStorage.setItem(
      `kb-draft-${article.id}`,
      JSON.stringify({
        title: "UNSAVED EDIT",
        slug: article.slug,
        folder: article.folder,
        tags: article.tags.join(", "),
        accessRoles: article.access_roles,
        contextKeys: article.context_keys.join(", "),
        content: article.content,
        ts: 1,
      }),
    );
    const { result } = setup({ article });
    expect(result.current.recovery?.title).toBe("UNSAVED EDIT");
  });

  it("drops a stale draft that equals the server version", () => {
    const article = makeArticle();
    localStorage.setItem(
      `kb-draft-${article.id}`,
      JSON.stringify({
        title: article.title,
        slug: article.slug,
        folder: article.folder,
        tags: article.tags.join(", "),
        accessRoles: article.access_roles,
        contextKeys: article.context_keys.join(", "),
        content: article.content,
        ts: 1,
      }),
    );
    const { result } = setup({ article });
    expect(result.current.recovery).toBeNull();
    expect(localStorage.getItem(`kb-draft-${article.id}`)).toBeNull();
  });
});

describe("useAutosave — keyboard save", () => {
  it("saves on Cmd/Ctrl+S for editors", async () => {
    await act(async () => {
      setup({ canEdit: true });
    });
    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "s", metaKey: true }),
      );
    });
    expect(mockSave).toHaveBeenCalled();
  });
});
