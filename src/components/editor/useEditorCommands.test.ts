import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Dispatch, SetStateAction } from "react";
import { useEditorCommands } from "./useEditorCommands";

// Integration smoke test for the extracted editor command layer: drives the
// real hook against a live jsdom <textarea> (the same node the MDEditor renders)
// and asserts the content transforms. Guards the refactor that pulled this out
// of Editor.tsx.

let container: HTMLDivElement;
let textarea: HTMLTextAreaElement;
let wrapRef: { current: HTMLDivElement | null };
let setContent: ReturnType<typeof vi.fn>;

beforeEach(() => {
  container = document.createElement("div");
  textarea = document.createElement("textarea");
  textarea.className = "w-md-editor-text-input";
  container.appendChild(textarea);
  document.body.appendChild(container);
  wrapRef = { current: container };
  setContent = vi.fn();
});

afterEach(() => {
  document.body.removeChild(container);
  vi.restoreAllMocks();
});

function setup(content = "", title = "Doc", templates: { id: string; name: string; content: string }[] = []) {
  return renderHook(() =>
    useEditorCommands({
      wrapRef,
      content,
      setContent: setContent as unknown as Dispatch<SetStateAction<string>>,
      title,
      templates,
    }),
  );
}

/** Put text + a caret/selection into the live textarea. */
function type(value: string, selStart = value.length, selEnd = selStart) {
  textarea.value = value;
  textarea.selectionStart = selStart;
  textarea.selectionEnd = selEnd;
}

function key(over: Record<string, unknown>) {
  return {
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    target: textarea,
    shiftKey: false,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    ...over,
  } as unknown as React.KeyboardEvent;
}

describe("useEditorCommands — Enter list/quote continuation", () => {
  it("continues a bullet list on Enter", () => {
    const { result } = setup();
    type("- item one");
    act(() => result.current.onEditorKeyDown(key({ key: "Enter" })));
    expect(setContent).toHaveBeenCalledWith("- item one\n- ");
  });

  it("continues an ordered list, incrementing the number", () => {
    const { result } = setup();
    type("1. first");
    act(() => result.current.onEditorKeyDown(key({ key: "Enter" })));
    expect(setContent).toHaveBeenCalledWith("1. first\n2. ");
  });

  it("exits the list when Enter is pressed on an empty item", () => {
    const { result } = setup();
    type("- ");
    act(() => result.current.onEditorKeyDown(key({ key: "Enter" })));
    expect(setContent).toHaveBeenCalledWith("");
  });

  it("continues a blockquote", () => {
    const { result } = setup();
    type("> quoted");
    act(() => result.current.onEditorKeyDown(key({ key: "Enter" })));
    expect(setContent).toHaveBeenCalledWith("> quoted\n> ");
  });
});

describe("useEditorCommands — Cmd/Ctrl+K link", () => {
  it("wraps the selection as a markdown link", () => {
    const { result } = setup("hello");
    type("hello", 0, 5);
    act(() => result.current.onEditorKeyDown(key({ key: "k", metaKey: true })));
    expect(setContent).toHaveBeenCalledWith("[hello](url)");
  });
});

describe("useEditorCommands — slash menu", () => {
  it("opens the slash menu when '/' is typed at line start", () => {
    const { result } = setup();
    type("/");
    act(() => result.current.onEditorInput());
    expect(result.current.slash).toMatchObject({ pos: 0, query: "" });
    expect(result.current.slashFiltered.length).toBeGreaterThan(0);
  });

  it("does not open mid-word", () => {
    const { result } = setup();
    type("foo/bar");
    act(() => result.current.onEditorInput());
    expect(result.current.slash).toBeNull();
  });
});

describe("useEditorCommands — context menu selection actions", () => {
  it("opens on right-click over the textarea and bold-wraps the selection", () => {
    const { result } = setup("hello");
    type("hello", 0, 5);
    act(() =>
      result.current.onEditorContextMenu({
        target: textarea,
        clientX: 5,
        clientY: 5,
        preventDefault: vi.fn(),
      } as unknown as React.MouseEvent),
    );
    expect(result.current.ctxMenu).toMatchObject({ start: 0, end: 5 });
    act(() => {
      result.current.wrapSelection("**");
    });
    expect(setContent).toHaveBeenCalledWith("**hello**");
  });
});
