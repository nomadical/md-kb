import { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import { useKb } from "../context";
import type { ArticleMeta } from "../types";
import { ArticleCard, ArticleGrid, SectionLabel } from "./ui";

/** Browse published articles as cards grouped by folder. */
export default function KbArticleList() {
  const { client, onNavigate } = useKb();
  const [articles, setArticles] = useState<ArticleMeta[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    client
      .listArticles()
      .then((a) => alive && setArticles(a))
      .catch((e) => alive && setError((e as Error).message));
    return () => {
      alive = false;
    };
  }, [client]);

  if (error) return <Typography color="error">{error}</Typography>;
  if (!articles) return <Typography color="text.secondary">Loading…</Typography>;
  if (articles.length === 0)
    return <Typography color="text.secondary">Nothing published yet.</Typography>;

  const byFolder = new Map<string, ArticleMeta[]>();
  for (const a of articles) {
    const k = a.folder || "General";
    byFolder.set(k, [...(byFolder.get(k) ?? []), a]);
  }

  return (
    <Box>
      {[...byFolder.entries()].map(([folder, items]) => (
        <Box key={folder} sx={{ mb: 3.5 }}>
          <SectionLabel>{folder}</SectionLabel>
          <ArticleGrid>
            {items.map((a) => (
              <ArticleCard key={a.id} article={a} onOpen={(s) => onNavigate?.(s)} />
            ))}
          </ArticleGrid>
        </Box>
      ))}
    </Box>
  );
}
