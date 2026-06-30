import { useMemo } from "react";
import { useRouter } from "@/components/ui/navigation";
import { useTheme } from "@/components/ThemeProvider";
import { useSettings } from "@/spa/data/settings";
import { createArticle } from "@/spa/data/writes";
import type { Role } from "@/lib/types";

export type Command = {
  id: string;
  title: string;
  section: "Create" | "Navigate" | "View" | "Help";
  keys?: string;
  run: () => void;
};

/** Build the command palette's actions for the current role + client context. */
export function useCommands(role: Role | null): Command[] {
  const router = useRouter();
  const { toggle } = useTheme();
  const { askAiEnabled } = useSettings();

  return useMemo(() => {
    const editor = role === "admin" || role === "editor";
    const reviewer = role === "admin" || role === "reviewer";
    const staff = editor || reviewer;
    const admin = role === "admin";

    const all: (Command & { when: boolean })[] = [
      { id: "new", title: "New article", section: "Create", run: () => void createArticle().then(({ id }) => router.push(`/admin/${id}`)), when: editor },
      { id: "nav-editor", title: "Open editor", section: "Navigate", run: () => router.push("/admin"), when: staff },
      { id: "nav-templates", title: "Templates", section: "Navigate", run: () => router.push("/admin/templates"), when: editor },
      { id: "nav-review", title: "Review queue", section: "Navigate", run: () => router.push("/admin/review"), when: reviewer },
      { id: "nav-analytics", title: "Analytics", section: "Navigate", run: () => router.push("/admin/analytics"), when: staff },
      { id: "nav-trash", title: "Trash", section: "Navigate", run: () => router.push("/admin/trash"), when: admin },
      { id: "nav-users", title: "Manage users", section: "Navigate", run: () => router.push("/admin/users"), when: admin },
      { id: "nav-home", title: "Go to Home", section: "Navigate", run: () => router.push("/"), when: true },
      { id: "nav-browse", title: "Browse all articles", section: "Navigate", run: () => router.push("/kb"), when: true },
      { id: "nav-ask", title: "Ask the knowledge base", section: "Navigate", run: () => router.push("/?ai=1"), when: askAiEnabled },
      { id: "theme", title: "Toggle theme (light / dark)", section: "View", keys: "⇧⌘L", run: toggle, when: true },
      { id: "help", title: "Keyboard shortcuts", section: "Help", keys: "?", run: () => window.dispatchEvent(new Event("kb:help")), when: true },
    ];
    return all.filter((c) => c.when).map(({ when: _when, ...c }) => c);
  }, [router, toggle, role, askAiEnabled]);
}
