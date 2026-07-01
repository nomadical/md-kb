import type { ReactNode } from "react";

/**
 * Shared status/role lozenge. Every badge colour in the app lives here so the
 * palette stays consistent (roles, draft/live, access, suggestion statuses, …).
 * Tones follow one semantic scheme:
 *   green  → live / published / public / resolved / done
 *   amber  → draft / open / pending / in-review
 *   red    → blocked / failed
 *   blue   → info / reviewer
 *   violet → admin / special
 *   slate  → neutral / dismissed / archived / n-a / viewer
 *   indigo → access-role codes (kept distinct; usually mono)
 */
export type BadgeTone =
  | "green"
  | "amber"
  | "red"
  | "blue"
  | "violet"
  | "slate"
  | "indigo";

const TONE: Record<BadgeTone, string> = {
  green: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-700",
  blue: "bg-sky-100 text-sky-700",
  violet: "bg-violet-100 text-violet-700",
  slate: "bg-slate-200 text-slate-700",
  indigo: "bg-indigo-100 text-indigo-700",
};

export default function Badge({
  tone = "slate",
  uppercase = true,
  className = "",
  title,
  children,
}: {
  tone?: BadgeTone;
  /** Status/role lozenges are uppercase; set false for label-ish chips. */
  uppercase?: boolean;
  className?: string;
  title?: string;
  children: ReactNode;
}) {
  return (
    <span
      title={title}
      className={`inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide ${
        uppercase ? "uppercase" : ""
      } ${TONE[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
