import { useEffect, useState } from "react";
import { Box, Chip, Stack, Typography } from "@mui/material";
import { useKb } from "../context";
import MarkdownView from "../markdown";
import { isPublicArticle, type Article } from "../types";
import { markdownSx } from "./ui";

/** Fetch a published article by slug and render its markdown (sanitized). */
export default function KbArticleView({ slug }: { slug: string }) {
  const { client, baseUrl, onNavigate } = useKb();
  const [article, setArticle] = useState<Article | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setArticle(undefined);
    client
      .getArticleBySlug(slug)
      .then((a) => alive && setArticle(a))
      .catch((e) => alive && setError((e as Error).message));
    return () => {
      alive = false;
    };
  }, [client, slug]);

  if (error) return <Typography color="error">{error}</Typography>;
  if (article === undefined)
    return <Typography color="text.secondary">Loading…</Typography>;
  if (article === null)
    return <Typography color="text.secondary">Article not found.</Typography>;

  return (
    <Box sx={{ maxWidth: 760, mx: "auto" }}>
      <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1.25 }}>
        {article.title}
      </Typography>
      {!isPublicArticle(article.access_roles) && (
        <Stack direction="row" spacing={0.5} sx={{ mt: 1.5, flexWrap: "wrap", gap: 0.5 }}>
          {article.access_roles.map((r) => (
            <Chip key={r} label={r} size="small" variant="outlined" />
          ))}
        </Stack>
      )}
      <Box sx={{ ...markdownSx, mt: 3 }}>
        <MarkdownView source={article.content} baseUrl={baseUrl} onNavigate={onNavigate} />
      </Box>
    </Box>
  );
}
