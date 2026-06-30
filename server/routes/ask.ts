import { Router } from "express";
import {
  chat,
  embed,
  embeddingsConfigured,
  llmConfigured,
  type ChatMessage,
} from "../../src/lib/inference";
import { anonClient, userClient } from "../supabase";
import { normalizeLanguage } from "../../src/lib/types";

// Port of /api/ask. Retrieval runs under the caller's session (or anon), so the
// pgvector/FTS match RPCs are RLS-filtered to articles the user may read.
// `lang` picks which language's content to retrieve (falls back to English).
const r = Router();

type Match = {
  article_id: string;
  slug: string;
  title: string;
  content: string;
  similarity: number;
};

r.post("/ask", async (req, res) => {
  const question = (req.body?.question ?? "") as string;
  if (!question || typeof question !== "string" || question.trim().length < 3) {
    res.status(400).json({ error: "Ask a question." });
    return;
  }
  const lang = normalizeLanguage(req.body?.lang as string | undefined);
  const auth = req.header("authorization") ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(auth);
  const supabase = m ? userClient(m[1].trim()) : anonClient();

  try {
    let matches: Match[];
    if (embeddingsConfigured()) {
      const [queryVec] = await embed([question]);
      const { data, error } = await supabase.rpc("match_article_chunks", {
        query_embedding: `[${queryVec.join(",")}]`,
        match_count: 6,
        lang,
      });
      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }
      matches = (data ?? []) as Match[];
    } else {
      const { data, error } = await supabase.rpc("match_articles_fts", {
        query_text: question,
        match_count: 6,
        lang,
      });
      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }
      matches = (data ?? []) as Match[];
    }

    await supabase
      .from("search_queries")
      .insert({ query: question.trim().slice(0, 256), result_count: matches.length });

    if (matches.length === 0) {
      res.json({ answer: null, sources: [], grounded: false });
      return;
    }

    const sources = matches.reduce<{ slug: string; title: string }[]>((acc, mt) => {
      if (!acc.some((s) => s.slug === mt.slug)) acc.push({ slug: mt.slug, title: mt.title });
      return acc;
    }, []);

    if (!llmConfigured()) {
      res.json({ answer: null, sources, grounded: false });
      return;
    }

    const context = matches.map((mt) => `## ${mt.title}\n${mt.content.slice(0, 2000)}`).join("\n\n");
    const messages: ChatMessage[] = [
      {
        role: "system",
        content:
          "You are the SkyCell knowledge base assistant. Answer the question using ONLY the provided context. " +
          "Be concise and clear; do not add citations or source numbers. " +
          'If the context does not contain the answer, reply with exactly "NO_ANSWER" and nothing else.',
      },
      { role: "user", content: `Question: ${question}\n\nContext:\n${context}` },
    ];
    const raw = (await chat(messages))?.trim() ?? null;
    const noAnswer =
      !raw ||
      /\bno[_\s]?answer\b/i.test(raw) ||
      /^(i (?:don'?t|do not) know|i (?:couldn'?t|could not|can'?t|cannot)\b|i'?m (?:not sure|unable)|sorry[,.! ])/i.test(raw);
    const answer = noAnswer ? null : raw.replace(/\s*\[(?:n|\d+)\]/gi, "");
    res.json({ answer, sources, grounded: true });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

export default r;
