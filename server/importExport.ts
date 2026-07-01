import matter from "gray-matter";
import { slugify } from "../src/lib/markdown";

// Pure helpers for bulk import/export: article <-> frontmatter markdown. No
// Supabase or filesystem here so they stay unit-testable; admin.ts wires them to
// the DB and the zip.

export interface ExportArticle {
  slug: string;
  title: string;
  folder: string;
  tags: string[];
  access_roles: string[];
  context_keys: string[];
  content: string;
  status: string;
}

export interface ParsedImport {
  title: string;
  slug: string;
  folder: string;
  tags: string[];
  access_roles: string[];
  context_keys: string[];
  content: string;
}

/** Collapse/trim a folder path: " A // B " -> "A/B". */
export function normalizeFolder(folder: string): string {
  return folder
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean)
    .join("/");
}

/** Make one path segment safe for a zip entry (no traversal, no separators). */
function safeSegment(s: string): string {
  return s
    .replace(/[/\\]+/g, "-")
    .replace(/[^\w.\- ]+/g, "_")
    .replace(/^\.+/, "")
    .trim();
}

/** Serialize an article to a frontmatter markdown file and its zip path. */
export function articleToMarkdownFile(a: ExportArticle): { path: string; contents: string } {
  const data: Record<string, unknown> = { title: a.title, slug: a.slug };
  if (a.folder) data.folder = a.folder;
  if (a.tags?.length) data.tags = a.tags;
  if (a.access_roles?.length) data.access_roles = a.access_roles;
  if (a.context_keys?.length) data.context_keys = a.context_keys;
  data.status = a.status;

  const contents = matter.stringify(a.content ?? "", data);
  const dir = (a.folder ?? "")
    .split("/")
    .map(safeSegment)
    .filter(Boolean)
    .join("/");
  const file = `${safeSegment(a.slug) || "untitled"}.md`;
  return { path: dir ? `${dir}/${file}` : file, contents };
}

const asStringArray = (v: unknown): string[] =>
  Array.isArray(v)
    ? v.map((x) => String(x).trim()).filter(Boolean)
    : typeof v === "string"
      ? v.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

const firstH1 = (md: string): string | null => {
  const m = md.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : null;
};

const baseName = (p: string): string => (p.split("/").pop() ?? p).replace(/\.md$/i, "");
const dirName = (p: string): string => p.split("/").slice(0, -1).join("/");

/**
 * Parse an uploaded markdown file into an importable article. `path` may carry
 * folders (e.g. from a zip); frontmatter wins over the path/body when present.
 * Falls back to the first H1, then the filename, for the title.
 */
export function parseMarkdownImport(path: string, raw: string): ParsedImport {
  const { data, content } = matter(raw);
  const dataTitle = typeof data.title === "string" ? data.title.trim() : "";
  const title = dataTitle || firstH1(content) || baseName(path) || "Untitled";
  const dataFolder = typeof data.folder === "string" ? data.folder : "";
  const folder = normalizeFolder(dataFolder || dirName(path));
  const dataSlug = typeof data.slug === "string" ? data.slug : "";
  const slug = slugify(dataSlug || title) || "untitled";
  return {
    title,
    slug,
    folder,
    tags: asStringArray(data.tags),
    access_roles: asStringArray(data.access_roles).map((s) => s.toUpperCase()),
    context_keys: asStringArray(data.context_keys),
    content: content.replace(/^\n+/, ""),
  };
}
