import { isPublicArticle } from "@/lib/types";
import Badge from "@/components/ui/Badge";

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
        <Badge tone="green" uppercase={false}>
          Public
        </Badge>
      )}
      {entitlements.map((r) => (
        <Badge
          key={r}
          tone="indigo"
          uppercase={false}
          className="font-mono"
          title="Requires this access role"
        >
          {r}
        </Badge>
      ))}
    </span>
  );
}
