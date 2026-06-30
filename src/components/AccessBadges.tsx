import { isPublicArticle } from "@/lib/types";

/** Renders entitlement-role chips for an article (or a "Public" chip). */
export default function AccessBadges({
  roles,
  className = "",
}: {
  roles: string[];
  className?: string;
}) {
  const entitlements = roles.filter((r) => r !== "BASIC_ACCESS");

  return (
    <span className={`inline-flex flex-wrap items-center gap-1 ${className}`}>
      {isPublicArticle(roles) && (
        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
          Public
        </span>
      )}
      {entitlements.map((r) => (
        <span
          key={r}
          title="Requires this access role"
          className="rounded bg-indigo-100 px-1.5 py-0.5 font-mono text-[10px] font-medium text-indigo-700"
        >
          {r}
        </span>
      ))}
    </span>
  );
}
