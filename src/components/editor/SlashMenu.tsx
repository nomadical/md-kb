import {
  FaCode,
  FaHeading,
  FaListOl,
  FaListUl,
  FaMinus,
  FaQuoteLeft,
  FaTable,
} from "react-icons/fa6";

export type SlashCommand = {
  label: string;
  icon: React.ReactNode;
  // `caret` (optional) places the cursor at that offset within the inserted
  // text; otherwise it lands at the end.
  insert: (articleTitle: string) => { text: string; caret?: number };
};

export const SLASH_COMMANDS: SlashCommand[] = [
  { label: "Heading 1", icon: <FaHeading />, insert: () => ({ text: "# " }) },
  { label: "Heading 2", icon: <FaHeading />, insert: () => ({ text: "## " }) },
  { label: "Heading 3", icon: <FaHeading />, insert: () => ({ text: "### " }) },
  { label: "Bullet list", icon: <FaListUl />, insert: () => ({ text: "- " }) },
  {
    label: "Numbered list",
    icon: <FaListOl />,
    insert: () => ({ text: "1. " }),
  },
  { label: "Quote", icon: <FaQuoteLeft />, insert: () => ({ text: "> " }) },
  {
    label: "Code block",
    icon: <FaCode />,
    insert: () => ({ text: "```\n\n```", caret: 4 }), // caret on the empty line
  },
  {
    label: "Table",
    icon: <FaTable />,
    insert: () => ({
      text: "| Column | Column |\n| --- | --- |\n| Cell | Cell |\n",
    }),
  },
  { label: "Divider", icon: <FaMinus />, insert: () => ({ text: "\n---\n" }) },
];

// Pixel position of a character index inside a textarea, via a mirror element
// that replicates the textarea's text layout.
export function caretCoords(
  ta: HTMLTextAreaElement,
  index: number,
): { x: number; y: number } {
  const div = document.createElement("div");
  const cs = getComputedStyle(ta);
  const copy = [
    "boxSizing",
    "width",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "borderTopWidth",
    "borderRightWidth",
    "borderBottomWidth",
    "borderLeftWidth",
    "fontStyle",
    "fontVariant",
    "fontWeight",
    "fontSize",
    "fontFamily",
    "lineHeight",
    "letterSpacing",
    "textTransform",
    "wordSpacing",
    "textIndent",
    "tabSize",
  ] as const;
  for (const p of copy) div.style[p as never] = cs[p as never];
  div.style.position = "absolute";
  div.style.visibility = "hidden";
  div.style.whiteSpace = "pre-wrap";
  div.style.wordWrap = "break-word";
  div.style.overflow = "hidden";
  div.textContent = ta.value.slice(0, index);
  const span = document.createElement("span");
  span.textContent = ta.value.slice(index) || ".";
  div.appendChild(span);
  document.body.appendChild(div);
  const rect = ta.getBoundingClientRect();
  const lineHeight = parseInt(cs.lineHeight) || parseInt(cs.fontSize) * 1.4;
  const x = rect.left + span.offsetLeft - ta.scrollLeft;
  const y = rect.top + span.offsetTop - ta.scrollTop + lineHeight;
  document.body.removeChild(div);
  return { x, y };
}

export default function SlashMenu({
  x,
  y,
  items,
  activeIndex,
  onChoose,
  onClose,
}: {
  x: number;
  y: number;
  items: SlashCommand[];
  activeIndex: number;
  onChoose: (cmd: SlashCommand) => void;
  onClose: () => void;
}) {
  const width = 230;
  const height = Math.min(items.length, 8) * 34 + 8;
  const left = Math.min(x, window.innerWidth - width - 8);
  const top = Math.min(y + 4, window.innerHeight - height - 8);
  return (
    <div className="fixed inset-0 z-[70]" onMouseDown={onClose}>
      <div
        role="menu"
        onMouseDown={(e) => e.stopPropagation()}
        className="kb-pop absolute max-h-72 w-[230px] overflow-auto rounded-lg border border-ink-line bg-ink-panel py-1 text-[13px] shadow-2xl"
        style={{ left, top }}
      >
        {items.map((it, i) => (
          <button
            key={it.label}
            role="menuitem"
            // mousedown (not click) so the textarea keeps focus / caret.
            onMouseDown={(e) => {
              e.preventDefault();
              onChoose(it);
            }}
            className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors ${
              i === activeIndex
                ? "bg-ink-accent/15 text-ink-accent"
                : "hover:bg-ink-accent/10 hover:text-ink-accent"
            }`}
          >
            <span className="w-3.5 text-[12px] text-ink-mut">{it.icon}</span>
            <span className="flex-1">{it.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
