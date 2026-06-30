import { useEffect } from "react";

export type MenuItem = {
  label?: string;
  icon?: React.ReactNode;
  shortcut?: string;
  disabled?: boolean;
  divider?: boolean;
  onClick?: () => void;
};

/** Custom popup menu anchored at (x, y). Stays on-screen by nudging left/up on
 *  overflow; any click / right-click / scroll / Escape dismisses it. */
export default function ContextMenu({
  x,
  y,
  items,
  onClose,
}: {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}) {
  // Keep the menu on-screen: nudge it left/up if it would overflow.
  const width = 224;
  const height = items.length * 34 + 8;
  const left = Math.min(x, window.innerWidth - width - 8);
  const top = Math.min(y, window.innerHeight - height - 8);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    // Full-screen catcher: any click / right-click / scroll dismisses.
    <div
      className="fixed inset-0 z-[70]"
      onClick={onClose}
      onContextMenu={(e) => {
        e.preventDefault();
        onClose();
      }}
      onWheel={onClose}
    >
      <div
        role="menu"
        onClick={(e) => e.stopPropagation()}
        className="kb-pop absolute min-w-[200px] overflow-hidden rounded-lg border border-ink-line bg-ink-panel py-1 text-[13px] shadow-2xl"
        style={{ left, top }}
      >
        {items.map((it, i) => {
          const key = it.divider ? `divider-${i}` : (it.label ?? i);
          return it.divider ? (
            <div key={key} className="my-1 h-px bg-ink-line" />
          ) : (
            <button
              key={key}
              role="menuitem"
              disabled={it.disabled}
              onClick={it.onClick}
              className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors hover:bg-ink-accent/10 hover:text-ink-accent disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-inherit"
            >
              <span className="w-3.5 text-[12px] text-ink-mut">{it.icon}</span>
              <span className="flex-1">{it.label}</span>
              {it.shortcut && (
                <span className="text-[11px] text-ink-mut">{it.shortcut}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
