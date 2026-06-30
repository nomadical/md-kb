import type { Role } from "@/lib/types";

const STYLES: Record<Role, string> = {
  admin: "bg-violet-100 text-violet-700",
  editor: "bg-emerald-100 text-emerald-700",
  reviewer: "bg-sky-100 text-sky-700",
  viewer: "bg-slate-200 text-slate-700",
};

export default function RoleBadge({ role }: { role: Role }) {
  return (
    <span
      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STYLES[role]}`}
    >
      {role}
    </span>
  );
}
