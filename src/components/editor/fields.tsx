import type { ReactNode } from "react";

// Shared classes for the metadata inputs + the pickers' triggers, so the
// floating-label boxes are all the same height/shape.
export const FIELD_INPUT =
  "rounded-md border border-ink-line bg-ink-panel px-2.5 pb-1 pt-1.5 text-[12px] text-ink-fg outline-none transition-colors focus:border-ink-accent";

/** Plain inline label + value, for the read-only translation metadata row. */
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex items-center gap-1.5 text-ink-mut">
      <span>{label}</span>
      {children}
    </label>
  );
}

/** MUI-style outlined field: the label floats onto the box's top border so it
 *  reads as part of the input and frees the horizontal space a separate label
 *  column used. Wrap any bordered control (input / picker) sharing FIELD_INPUT. */
export function FloatingField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="group relative">
      <span className="pointer-events-none absolute -top-1.5 left-2 z-10 rounded bg-ink-panel px-1 text-[10px] font-medium leading-none text-ink-mut transition-colors group-focus-within:text-ink-accent">
        {label}
      </span>
      {children}
    </div>
  );
}
