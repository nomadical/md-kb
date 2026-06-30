import { useCallback, useEffect, useState } from "react";
import { Box, Dialog, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import KnowledgeBase from "./KnowledgeBase";

export type KbLauncherProps = {
  /** Toggle hotkey, combined with Cmd/Ctrl. Default "k" (⌘K / Ctrl+K); null disables. */
  hotkey?: string | null;
  /** Controlled open state (optional — omit for self-managed). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/**
 * Command-palette-style launcher: opens the KB in a modal over the host page
 * (no route change) via ⌘K/Ctrl+K. Mount once, inside a <KbProvider>. The host
 * can also drive it via the controlled `open`/`onOpenChange` props (e.g. from a
 * toolbar button).
 */
export default function KbLauncher({
  hotkey = "k",
  open: controlled,
  onOpenChange,
}: KbLauncherProps) {
  const [uncontrolled, setUncontrolled] = useState(false);
  const isControlled = controlled !== undefined;
  const open = isControlled ? controlled : uncontrolled;

  const set = useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolled(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  useEffect(() => {
    if (!hotkey) return;
    const onKey = (e: KeyboardEvent) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === hotkey.toLowerCase()
      ) {
        e.preventDefault();
        set(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hotkey, open, set]);

  return (
    <Dialog
      open={open}
      onClose={() => set(false)}
      fullWidth
      maxWidth="md"
      PaperProps={{ sx: { borderRadius: 2, minHeight: "60vh" } }}
    >
      <Box sx={{ position: "relative", p: { xs: 2, sm: 3 } }}>
        <IconButton
          aria-label="Close"
          onClick={() => set(false)}
          sx={{ position: "absolute", top: 8, right: 8, zIndex: 1 }}
        >
          <CloseIcon />
        </IconButton>
        <KnowledgeBase />
      </Box>
    </Dialog>
  );
}
