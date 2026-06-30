import { BASE_PATH as BP, SUPABASE_URL } from "@/lib/config";

/** Article images live in the public Supabase Storage `kb-images` bucket. */
const KB_IMAGE_BASE = SUPABASE_URL
  ? `${SUPABASE_URL}/storage/v1/object/public/kb-images`
  : `${BP}/kb-images`;

/** Turn a title (or wikilink target) into a URL-safe slug. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Rewrite Obsidian-style wikilinks into standard markdown links so the
 * existing renderer handles them:
 *   [[my-page]]          -> [my-page](/kb/my-page)
 *   [[my-page|Read me]]  -> [Read me](/kb/my-page)
 *   [[Some Title]]       -> [Some Title](/kb/some-title)
 */
export function transformWikilinks(markdown: string): string {
  return markdown.replace(/\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g, (_m, target, label) => {
    const slug = slugify(String(target));
    const text = (label ?? target).toString().trim();
    return `[${text}](${BP}/kb/${slug})`;
  });
}

/** Rewrite root-relative content URLs (stored without host/base path):
 *  `/kb-images/X` → the Supabase Storage public URL, and `/kb/X` (internal
 *  article links) → under the app base path. */
export function prefixContentUrls(markdown: string): string {
  return markdown
    .replace(/(\]\(<?|src=["'])\/kb-images\//g, `$1${KB_IMAGE_BASE}/`)
    .replace(/(\]\(<?|src=["'])\/kb\//g, BP ? `$1${BP}/kb/` : "$1/kb/");
}

/** Drop a leading `# H1` from the body — the page header already renders the
 *  title, so keeping it would show the title twice. */
export function stripLeadingH1(markdown: string): string {
  return markdown.replace(/^\s*#\s+[^\n]+\n+/, "");
}

/** Pull a first-paragraph excerpt for list/preview cards. */
export function excerpt(markdown: string, max = 160): string {
  const plain = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[-#>*_`~]/g, " ")
    .replace(/\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g, "$2$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > max ? plain.slice(0, max).trimEnd() + "…" : plain;
}
