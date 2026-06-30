const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: "⌘K", label: "Command palette — run actions or search articles" },
  { keys: "⇧⌘L", label: "Toggle theme (light / dark)" },
  { keys: "⌘S", label: "Save article (in the editor)" },
  { keys: "?", label: "Show this help" },
  { keys: "↑ ↓", label: "Move selection (in the palette)" },
  { keys: "↵", label: "Run / open the selection" },
  { keys: "Esc", label: "Close" },
];

export default function HotkeysHelp({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[16vh]"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full max-w-md overflow-hidden rounded-xl border border-ink-line bg-ink-panel shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-ink-line px-5 py-3">
          <h2 className="text-[14px] font-semibold">Keyboard shortcuts</h2>
          <button
            onClick={onClose}
            className="text-[12px] text-ink-mut hover:text-ink-accent"
          >
            Esc
          </button>
        </div>
        <ul className="divide-y divide-ink-line">
          {SHORTCUTS.map((s) => (
            <li key={s.keys} className="flex items-center justify-between gap-4 px-5 py-2.5">
              <span className="text-[13px] text-ink-mut">{s.label}</span>
              <kbd className="rounded border border-ink-line bg-ink-bg px-1.5 py-0.5 text-[12px] font-medium">
                {s.keys}
              </kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
