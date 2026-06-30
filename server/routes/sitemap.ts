import { Router } from "express";
import { anonClient } from "../supabase";
import { SITE_URL, BASE_PATH } from "../env";

// Public SEO endpoints: robots.txt + sitemap.xml. Both query through the
// anonymous Supabase client, so RLS only ever exposes published, publicly
// readable articles — if `requireLoginToRead` is on, anon sees nothing and the
// sitemap is correctly empty.
const r = Router();

/** Absolute origin for canonical URLs. Falls back to the request host when
 *  VITE_SITE_URL isn't configured (e.g. local dev). No trailing slash. */
function origin(req: { protocol: string; get(h: string): string | undefined }): string {
  if (SITE_URL) return SITE_URL;
  const host = req.get("host") ?? "localhost";
  return `${req.protocol}://${host}`;
}

const xmlEscape = (s: string) =>
  s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);

r.get("/robots.txt", (req, res) => {
  const base = `${origin(req)}${BASE_PATH}`;
  res.type("text/plain").send(`User-agent: *\nAllow: /\nSitemap: ${base}/sitemap.xml\n`);
});

r.get("/sitemap.xml", async (req, res) => {
  const base = `${origin(req)}${BASE_PATH}`;
  const urls: { loc: string; lastmod?: string }[] = [{ loc: `${base}/` }];

  // Best-effort: a misconfigured or unreachable Supabase must not 500 the
  // sitemap (and must never leak a stack trace) — fall back to homepage-only.
  try {
    const { data } = await anonClient()
      .from("articles")
      .select("slug, updated_at")
      .eq("published", true);

    // One entry per canonical slug (translations share a slug), newest lastmod.
    const bySlug = new Map<string, string>();
    for (const a of data ?? []) {
      const prev = bySlug.get(a.slug);
      if (!prev || a.updated_at > prev) bySlug.set(a.slug, a.updated_at);
    }
    for (const [slug, updated] of bySlug) {
      urls.push({ loc: `${base}/kb/${encodeURIComponent(slug)}`, lastmod: updated });
    }
  } catch {
    // leave urls at homepage-only
  }

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map(
        (u) =>
          `  <url><loc>${xmlEscape(u.loc)}</loc>` +
          (u.lastmod ? `<lastmod>${new Date(u.lastmod).toISOString().slice(0, 10)}</lastmod>` : "") +
          `</url>`,
      )
      .join("\n") +
    `\n</urlset>\n`;

  res.type("application/xml").send(body);
});

export default r;
