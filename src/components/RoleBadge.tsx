import type { Role } from "@/lib/types";
import Badge, { type BadgeTone } from "@/components/ui/Badge";

// Roles keep distinct (but shared-palette) tones so they stay recognisable.
const TONE: Record<Role, BadgeTone> = {
  admin: "violet",
  editor: "green",
  reviewer: "blue",
  viewer: "slate",
};

export default function RoleBadge({ role }: { role: Role }) {
  return <Badge tone={TONE[role]}>{role}</Badge>;
}
