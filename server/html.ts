import { anonClient } from "./supabase";
import { SITE_URL } from "./env";

// Server-side <head> rendering for the SPA shell. The SPA itself updates the
// title client-side, but social scrapers and non-JS crawlers only see what the
// server sends — so for article routes we inject real per-article OG/meta tags
// into index.html before serving it.

const escapeHtml = (s: string) =>
  s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]!);

/** Markdown → a short plain-text summary suitable for a meta description. */
export function summarize(markdown: string, max = 160): string {
  const text = markdown
    .replace(/^#{1,6}\s+/gm, "") // headings
    .replace(/```[\s\S]*?```/g, "") // code fences
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links → text
    .replace(/[*_`>#~-]/g, "") // residual markdown punctuation
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  return text.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

interface Meta {
  title: string;
  description: string;
  url: string;
}

function metaTags({ title, description, url }: Meta): string {
  const t = escapeHtml(title);
  const d = escapeHtml(description);
  const u = escapeHtml(url);
  return [
    `<meta property="og:type" content="article" />`,
    `<meta property="og:title" content="${t}" />`,
    description && `<meta property="og:description" content="${d}" />`,
    url && `<meta property="og:url" content="${u}" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${t}" />`,
    description && `<meta name="twitter:description" content="${d}" />`,
  ]
    .filter(Boolean)
    .join("\n    ");
}

/** Rewrite the shell's <title>/description and append OG/Twitter tags. */
function applyMeta(template: string, meta: Meta): string {
  const t = escapeHtml(meta.title);
  const d = escapeHtml(meta.description);
  let html = template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${t}</title>`)
    .replace(
      /<meta\s+name="description"[\s\S]*?\/>/,
      `<meta name="description" content="${d}" />`,
    );
  return html.replace("</head>", `    ${metaTags(meta)}\n  </head>`);
}

/**
 * Given a request path and the index.html shell, return HTML with per-article
 * meta when the path is a published article route; otherwise the shell as-is.
 * Best-effort: any failure (no Supabase, unknown slug, draft) returns the shell.
 */
export async function renderShell(
  template: string,
  pathname: string,
  origin: string,
): Promise<string> {
  const match = pathname.match(/\/kb\/([^/?#]+)\/?$/);
  if (!match) return template;
  const slug = decodeURIComponent(match[1]);
  try {
    const { data } = await anonClient()
      .from("articles")
      .select("title, content")
      .eq("slug", slug)
      .eq("published", true)
      .limit(1)
      .maybeSingle();
    if (!data?.title) return template;
    // Drop the leading H1 (== title) so the description isn't title-prefixed,
    // mirroring the reader's stripLeadingH1.
    const body = (data.content ?? "").replace(/^\s*#\s+.*(?:\r?\n)+/, "");
    return applyMeta(template, {
      title: data.title,
      description: summarize(body),
      url: `${SITE_URL || origin}${pathname}`,
    });
  } catch {
    return template;
  }
}
