import {
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import { FaShapes } from "react-icons/fa6";
import { applyTemplate } from "@/lib/templates";
import { linkT, wrapT } from "@/components/editor/editorText";
import {
  SLASH_COMMANDS,
  caretCoords,
  type SlashCommand,
} from "@/components/editor/SlashMenu";

/** Right-click menu anchor + the selection captured when it opened. */
export interface CtxMenuState {
  x: number;
  y: number;
  start: number;
  end: number;
}

/** Slash menu anchor, typed query, and the highlighted item index. */
export interface SlashState {
  pos: number;
  query: string;
  x: number;
  y: number;
  index: number;
}

interface Args {
  wrapRef: RefObject<HTMLDivElement | null>;
  content: string;
  setContent: Dispatch<SetStateAction<string>>;
  title: string;
  templates: { id: string; name: string; content: string }[];
}

/**
 * The markdown editor's textarea command layer: the custom right-click menu, the
 * slash-command menu, ⌘K→link, and smart list/quote continuation on Enter. Owns
 * the ctxMenu/slash state and returns the handlers to attach to the editor
 * wrapper plus the primitives the menus call. Handlers read the live textarea
 * value, so they're safe from stale closures.
 */
export function useEditorCommands({
  wrapRef,
  content,
  setContent,
  title,
  templates,
}: Args) {
  const [ctxMenu, setCtxMenu] = useState<CtxMenuState | null>(null);
  const [slash, setSlash] = useState<SlashState | null>(null);

  const editorTextarea = () =>
    wrapRef.current?.querySelector<HTMLTextAreaElement>(
      "textarea.w-md-editor-text-input",
    ) ?? null;

  // Open our menu (instead of the browser's) when right-clicking the editor
  // textarea; right-clicks on the preview/toolbar keep the native menu.
  const onEditorContextMenu = (e: React.MouseEvent) => {
    const ta = e.target as HTMLElement;
    if (ta.tagName !== "TEXTAREA") return;
    e.preventDefault();
    setCtxMenu({
      x: e.clientX,
      y: e.clientY,
      start: (ta as HTMLTextAreaElement).selectionStart,
      end: (ta as HTMLTextAreaElement).selectionEnd,
    });
  };

  // Restore focus + caret/selection after React re-renders the controlled
  // textarea (offsets are relative to the document start).
  const setSelectionSoon = (selStart: number, selEnd: number) => {
    requestAnimationFrame(() => {
      const ta = editorTextarea();
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(selStart, selEnd);
    });
  };

  // Replace text in [start, end) with `transform(selectedText).text`, then
  // place the caret/selection at the returned offsets (relative to the start
  // of the inserted text; defaults to the caret at the end of it). Reads the
  // live textarea value so it's safe from keydown handlers' stale closures.
  const runEditAt = (
    start: number,
    end: number,
    transform: (sel: string) => {
      text: string;
      selStart?: number;
      selEnd?: number;
    },
  ) => {
    const base = editorTextarea()?.value ?? content;
    const { text, selStart, selEnd } = transform(base.slice(start, end));
    setContent(base.slice(0, start) + text + base.slice(end));
    setCtxMenu(null);
    const caretStart = start + (selStart ?? text.length);
    setSelectionSoon(caretStart, start + (selEnd ?? selStart ?? text.length));
  };

  // Context-menu helpers operate on the right-click selection.
  const wrapSelection = (before: string, after = before) =>
    ctxMenu && runEditAt(ctxMenu.start, ctxMenu.end, wrapT(before, after));
  const insertLink = () =>
    ctxMenu && runEditAt(ctxMenu.start, ctxMenu.end, linkT);

  // Built-in block commands + the article's templates.
  const slashAll: SlashCommand[] = [
    ...SLASH_COMMANDS,
    ...templates.map((t) => ({
      label: t.name,
      icon: <FaShapes />,
      insert: (articleTitle: string) => ({
        text: applyTemplate(t.content, { title: articleTitle }),
      }),
    })),
  ];
  const slashFiltered = slash
    ? slashAll.filter((c) =>
        c.label.toLowerCase().includes(slash.query.toLowerCase()),
      )
    : [];

  // Replace the "/query" with the chosen command's markdown.
  const chooseSlash = (cmd: SlashCommand) => {
    if (!slash) return;
    const ta = editorTextarea();
    const base = ta?.value ?? content;
    const caret = ta?.selectionStart ?? slash.pos + 1 + slash.query.length;
    const insert = cmd.insert(title);
    setContent(base.slice(0, slash.pos) + insert.text + base.slice(caret));
    setSlash(null);
    const cpos = slash.pos + (insert.caret ?? insert.text.length);
    setSelectionSoon(cpos, cpos);
  };

  // ⌘K → link (the library binds ⌘K to image; image stays available via the
  // toolbar / right-click / drag-drop). Intercept in the capture phase so the
  // library's textarea handler never sees it. Slash-menu keys handled too.
  const onEditorKeyDown = (e: React.KeyboardEvent) => {
    if (slash) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSlash((s) => s && { ...s, index: (s.index + 1) % slashFiltered.length });
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSlash(
          (s) =>
            s && {
              ...s,
              index: (s.index - 1 + slashFiltered.length) % slashFiltered.length,
            },
        );
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        if (slashFiltered[slash.index]) {
          e.preventDefault();
          chooseSlash(slashFiltered[slash.index]);
          return;
        }
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setSlash(null);
        return;
      }
    }
    // Smart list/quote continuation on Enter. We own this in the capture phase
    // (the library only handles non-indented -, *, 1., and never exits an empty
    // item or continues quotes), so the behaviour is consistent everywhere.
    if (
      e.key === "Enter" &&
      !e.shiftKey &&
      !e.metaKey &&
      !e.ctrlKey &&
      !e.altKey &&
      (e.target as HTMLElement).tagName === "TEXTAREA"
    ) {
      const ta = e.target as HTMLTextAreaElement;
      if (ta.selectionStart === ta.selectionEnd) {
        const v = ta.value;
        const pos = ta.selectionStart;
        const ls = v.lastIndexOf("\n", pos - 1) + 1;
        const le = v.indexOf("\n", pos);
        const line = v.slice(ls, le === -1 ? v.length : le);
        const bullet = line.match(/^(\s*)([-*+])\s+(\[[ xX]\]\s+)?(.*)$/);
        const ordered = line.match(/^(\s*)(\d+)([.)])\s+(.*)$/);
        const quote = line.match(/^(\s*)(>+)\s+(.*)$/);
        if (bullet || ordered || quote) {
          e.preventDefault();
          e.stopPropagation();
          const lineContent = bullet ? bullet[4] : ordered ? ordered[4] : quote![3];
          if (lineContent.trim() === "") {
            // Empty item → exit the list: drop the marker, leaving a blank line.
            setContent(v.slice(0, ls) + v.slice(pos));
            setSelectionSoon(ls, ls);
          } else {
            const cont = bullet
              ? `${bullet[1]}${bullet[2]} ${bullet[3] ? "[ ] " : ""}`
              : ordered
                ? `${ordered[1]}${parseInt(ordered[2]) + 1}${ordered[3]} `
                : `${quote![1]}${quote![2]} `;
            const insert = `\n${cont}`;
            setContent(v.slice(0, pos) + insert + v.slice(pos));
            setSelectionSoon(pos + insert.length, pos + insert.length);
          }
        }
      }
      return;
    }
    if (
      (e.metaKey || e.ctrlKey) &&
      !e.shiftKey &&
      !e.altKey &&
      e.key.toLowerCase() === "k"
    ) {
      const ta = e.target as HTMLElement;
      if (ta.tagName !== "TEXTAREA") return;
      e.preventDefault();
      e.stopPropagation();
      const t = ta as HTMLTextAreaElement;
      runEditAt(t.selectionStart, t.selectionEnd, linkT);
    }
  };

  const copySelection = async (cut: boolean) => {
    if (!ctxMenu) return;
    const sel = content.slice(ctxMenu.start, ctxMenu.end);
    try {
      await navigator.clipboard.writeText(sel);
    } catch {
      /* clipboard blocked — fall through; cut still removes the text */
    }
    if (cut) runEditAt(ctxMenu.start, ctxMenu.end, () => ({ text: "" }));
    else setCtxMenu(null);
  };

  // On each edit, detect a "/token" being typed at line start / after
  // whitespace and (re)open the slash menu anchored at the caret.
  const onEditorInput = () => {
    const ta = editorTextarea();
    if (!ta) return;
    const caret = ta.selectionStart;
    const text = ta.value;
    let i = caret - 1;
    while (i >= 0 && !/\s/.test(text[i]) && text[i] !== "/") i--;
    if (
      i >= 0 &&
      text[i] === "/" &&
      (i === 0 || /\s/.test(text[i - 1])) &&
      /^[a-zA-Z]*$/.test(text.slice(i + 1, caret))
    ) {
      const c = caretCoords(ta, i);
      setSlash((s) => ({
        pos: i,
        query: text.slice(i + 1, caret),
        x: c.x,
        y: c.y,
        index: s ? s.index : 0,
      }));
    } else if (slash) {
      setSlash(null);
    }
  };

  return {
    ctxMenu,
    setCtxMenu,
    slash,
    setSlash,
    slashFiltered,
    onEditorContextMenu,
    onEditorKeyDown,
    onEditorInput,
    runEditAt,
    wrapSelection,
    insertLink,
    copySelection,
    chooseSlash,
  };
}
