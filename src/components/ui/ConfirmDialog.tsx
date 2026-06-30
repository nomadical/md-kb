import { useEffect, useRef } from "react";

/** Reusable confirm popup (replaces window.confirm). Focuses the confirm button
 *  on open; Enter confirms, Escape (or backdrop click) cancels. */
export default function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onConfirm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, onConfirm]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
      <div className="kb-fade absolute inset-0 bg-black/40" onClick={onCancel} />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="kb-pop relative w-full max-w-sm overflow-hidden rounded-xl border border-ink-line bg-ink-panel shadow-2xl"
      >
        <div className="px-5 pb-2 pt-4 text-[15px] font-semibold">{title}</div>
        <div className="px-5 pb-4 text-[13px] text-ink-mut">{message}</div>
        <div className="flex justify-end gap-2 border-t border-ink-line px-4 py-3">
          <button
            onClick={onCancel}
            className="rounded-md border border-ink-line px-3 py-1.5 text-[13px] text-ink-mut transition-colors hover:border-ink-accent hover:text-ink-accent"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`rounded-md px-3 py-1.5 text-[13px] font-medium text-white transition-colors ${
              danger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-ink-accent hover:bg-ink-accentHover"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
