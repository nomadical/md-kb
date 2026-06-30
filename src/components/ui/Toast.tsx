import { useCallback, useEffect, useRef, useState } from "react";
import { FaCircleCheck, FaCircleExclamation, FaXmark } from "react-icons/fa6";

export type Toast = {
  id: number;
  kind: "success" | "error" | "info";
  message: string;
};

/** Transient feedback toasts. Returns the live list plus stable push/dismiss
 *  callbacks; render the list with <ToastHost>. */
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);
  const pushToast = useCallback((kind: Toast["kind"], message: string) => {
    const id = ++seq.current;
    setToasts((t) => [...t, { id, kind, message }]);
  }, []);
  const dismissToast = useCallback(
    (id: number) => setToasts((t) => t.filter((x) => x.id !== id)),
    [],
  );
  return { toasts, pushToast, dismissToast };
}

export function ToastHost({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: number) => void;
}) {
  // Auto-dismiss with proper cleanup (StrictMode-safe, unlike a bare setTimeout
  // fired from the state setter).
  useEffect(() => {
    const ms = toast.kind === "error" ? 6000 : 3500;
    const timer = setTimeout(() => onDismiss(toast.id), ms);
    return () => clearTimeout(timer);
  }, [toast.id, toast.kind, onDismiss]);

  const tone =
    toast.kind === "success"
      ? "border-emerald-500/30 text-emerald-700"
      : toast.kind === "error"
        ? "border-red-500/30 text-red-700"
        : "border-ink-line text-ink-mut";
  return (
    <div
      role="status"
      className={`kb-pop pointer-events-auto flex max-w-sm items-start gap-2.5 rounded-lg border bg-ink-panel px-3 py-2 text-[13px] shadow-2xl ${tone}`}
    >
      <span className="mt-0.5 shrink-0 text-[13px]">
        {toast.kind === "success" ? (
          <FaCircleCheck />
        ) : toast.kind === "error" ? (
          <FaCircleExclamation />
        ) : null}
      </span>
      <span className="flex-1 break-words">{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss"
        className="-mr-1 shrink-0 text-ink-mut transition-colors hover:text-ink-accent"
      >
        <FaXmark className="text-[11px]" />
      </button>
    </div>
  );
}
