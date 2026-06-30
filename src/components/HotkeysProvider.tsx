import { useEffect, useState } from "react";
import { useTheme } from "./ThemeProvider";
import HotkeysHelp from "./HotkeysHelp";

/** Returns true if the event target is a text-entry surface (don't hijack typing). */
function isTyping(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  if (!t) return false;
  const tag = t.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || t.isContentEditable;
}

/**
 * App-wide keyboard shortcuts that aren't owned by a specific surface.
 * (⌘K palette lives in CommandPalette; ⌘S save stays in the editor.)
 *   ⇧⌘L — toggle light/dark   ·   ? — keyboard-shortcuts help
 * Also opens help on the `kb:help` event (dispatched by the palette command).
 */
export default function HotkeysProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { toggle } = useTheme();
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e)) return;
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "l") {
        e.preventDefault();
        toggle();
      } else if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setHelpOpen(true);
      }
    };
    const onHelp = () => setHelpOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("kb:help", onHelp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("kb:help", onHelp);
    };
  }, [toggle]);

  return (
    <>
      {children}
      <HotkeysHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}
