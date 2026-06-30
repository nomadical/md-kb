// Index published articles into public.article_chunks for "Ask the KB".
// Chunks markdown, embeds each chunk (OpenAI-compatible endpoint, or a gated
// dev fallback), and upserts with denormalized visibility (published +
// access_roles) so RLS can role-filter retrieval.
//
// Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//      EMBEDDINGS_URL + EMBEDDINGS_MODEL  (or KB_DEV_EMBEDDINGS=true)
//
// Usage: node scripts/embed-kb.mjs

import { createClient } from "@supabase/supabase-js";

const DIM = 768;
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMB_URL = process.env.EMBEDDINGS_URL;
const EMB_MODEL = process.env.EMBEDDINGS_MODEL ?? "nomic-embed-text";
const EMB_DIMS = process.env.EMBEDDINGS_DIMENSIONS ? Number(process.env.EMBEDDINGS_DIMENSIONS) : undefined;
const API_KEY = process.env.INFERENCE_API_KEY;
const AUTH_STYLE = process.env.INFERENCE_AUTH_STYLE ?? "bearer";
const DEV = process.env.KB_DEV_EMBEDDINGS === "true";

if (!URL || !SERVICE) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!EMB_URL && !DEV) {
  console.error("Set EMBEDDINGS_URL (or KB_DEV_EMBEDDINGS=true for offline dev)");
  process.exit(1);
}

const db = createClient(URL, SERVICE, { auth: { persistSession: false } });

function devEmbed(text) {
  const v = new Array(DIM).fill(0);
  for (const tok of text.toLowerCase().match(/[a-z0-9]+/g) ?? []) {
    let h = 2166136261;
    for (let i = 0; i < tok.length; i++) {
      h ^= tok.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    v[Math.abs(h) % DIM] += 1;
  }
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / norm);
}

async function embed(texts) {
  if (!EMB_URL) return texts.map(devEmbed);
  const res = await fetch(`${EMB_URL.replace(/\/$/, "")}/embeddings`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(API_KEY
        ? AUTH_STYLE === "api-key"
          ? { "api-key": API_KEY }
          : { authorization: `Bearer ${API_KEY}` }
        : {}),
    },
    body: JSON.stringify({
      model: EMB_MODEL,
      input: texts,
      ...(EMB_DIMS ? { dimensions: EMB_DIMS } : {}),
    }),
  });
  if (!res.ok) throw new Error(`embeddings ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const vectors = json.data.map((d) => d.embedding);
  if (vectors[0] && vectors[0].length !== DIM) {
    throw new Error(
      `embeddings returned dim ${vectors[0].length}, expected ${DIM} ` +
        `(set EMBEDDINGS_DIMENSIONS=${DIM} for text-embedding-3-*)`,
    );
  }
  return vectors;
}

// Markdown -> ~1200-char chunks on paragraph boundaries, stripped of images and
// wikilink/link syntax noise.
function chunk(md) {
  const clean = md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g, "$2$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
  const paras = clean.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks = [];
  let buf = "";
  for (const p of paras) {
    if ((buf + "\n\n" + p).length > 1200 && buf) {
      chunks.push(buf);
      buf = p;
    } else {
      buf = buf ? `${buf}\n\n${p}` : p;
    }
  }
  if (buf) chunks.push(buf);
  return chunks;
}

const vecLiteral = (a) => `[${a.join(",")}]`;

// Index one language version of an article into article_chunks. Visibility
// (published + access_roles) is denormalized so RLS can role-filter retrieval;
// chunks are keyed by (article_id, language, chunk_index).
async function indexVersion({ articleId, language, title, content, published, accessRoles }) {
  const pieces = chunk(`${title}\n\n${content}`);
  // Always clear this language's old chunks first (handles unpublish/shrink).
  await db.from("article_chunks").delete().eq("article_id", articleId).eq("language", language);
  if (pieces.length === 0 || !published) return 0;
  const vectors = await embed(pieces);
  const rows = pieces.map((c, i) => ({
    article_id: articleId,
    chunk_index: i,
    content: c,
    embedding: vecLiteral(vectors[i]),
    published,
    access_roles: accessRoles,
    language,
  }));
  const { error: insErr } = await db.from("article_chunks").insert(rows);
  if (insErr) throw new Error(`${title} [${language}]: ${insErr.message}`);
  return rows.length;
}

// 1. Source language (English): every published article.
const { data: articles, error } = await db
  .from("articles")
  .select("id,title,content,access_roles,published")
  .eq("published", true);
if (error) throw new Error(error.message);

let total = 0;
for (const a of articles) {
  const n = await indexVersion({
    articleId: a.id,
    language: "en",
    title: a.title,
    content: a.content,
    published: a.published,
    accessRoles: a.access_roles,
  });
  if (n) process.stdout.write(`  ${a.title}: ${n} chunks\n`);
  total += n;
}

// 2. Translations: every published translation of a published article. The
//    chunk is visible only when BOTH the article and translation are published;
//    access_roles come from the parent article.
const { data: translations, error: trErr } = await db
  .from("article_translations")
  .select("article_id,language,title,content,published,articles!inner(title,published,access_roles)")
  .eq("published", true);
if (trErr) throw new Error(trErr.message);

let trTotal = 0;
for (const t of translations ?? []) {
  const parent = t.articles;
  const n = await indexVersion({
    articleId: t.article_id,
    language: t.language,
    title: t.title,
    content: t.content,
    published: t.published && parent.published,
    accessRoles: parent.access_roles,
  });
  if (n) process.stdout.write(`  ${parent.title} [${t.language}]: ${n} chunks\n`);
  trTotal += n;
}

console.log(
  `\nIndexed ${total} source chunks from ${articles.length} articles` +
    ` + ${trTotal} translation chunks from ${translations?.length ?? 0} translations` +
    `${EMB_URL ? "" : " (DEV embeddings)"}.`,
);
