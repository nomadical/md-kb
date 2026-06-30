import { useEffect, useRef, useState } from "react";
import { Box, Button, InputAdornment, TextField, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { KbProvider, useKb } from "../context";
import KbArticleView from "./KbArticleView";
import type { ArticleMeta } from "../types";
import { ArticleCard, ArticleGrid, SectionLabel } from "./ui";

/**
 * Self-routing KB widget styled after the KB app's home (hero search + article
 * cards + clean reading view). All colour comes from the MUI theme, so it adopts
 * the host's palette. Re-provides the context with an internal `onNavigate`.
 */
export default function KnowledgeBase() {
  const { client, baseUrl } = useKb();
  const [slug, setSlug] = useState<string | null>(null);

  return (
    <KbProvider client={client} baseUrl={baseUrl} onNavigate={setSlug}>
      {slug ? (
        <Box>
          <Button
            startIcon={<ArrowBackIcon fontSize="small" />}
            onClick={() => setSlug(null)}
            sx={{ mb: 2 }}
          >
            Back
          </Button>
          <KbArticleView slug={slug} />
        </Box>
      ) : (
        <Browse onOpen={setSlug} />
      )}
    </KbProvider>
  );
}

function Browse({ onOpen }: { onOpen: (slug: string) => void }) {
  const { client } = useKb();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ArticleMeta[]>([]);
  const [articles, setArticles] = useState<ArticleMeta[] | null>(null);
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    let alive = true;
    client
      .listArticles()
      .then((r) => alive && setArticles(r))
      .catch(() => alive && setArticles([]));
    return () => {
      alive = false;
    };
  }, [client]);

  useEffect(() => {
    const needle = q.trim();
    if (needle.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const mine = ++seq.current;
    const t = setTimeout(async () => {
      try {
        const r = await client.searchArticles(needle);
        if (mine === seq.current) setResults(r);
      } finally {
        if (mine === seq.current) setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q, client]);

  const searching = q.trim().length >= 2;
  const count = articles?.length ?? 0;

  return (
    <Box>
      <Box
        sx={(t) => ({
          textAlign: "center",
          py: { xs: 4, sm: 6 },
          px: 2,
          mb: 4,
          borderRadius: 3,
          background: `linear-gradient(180deg, ${alpha(t.palette.primary.main, 0.1)} 0%, ${alpha(t.palette.primary.main, 0)} 100%)`,
        })}
      >
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          How can we help?
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>
          Guides, FAQs and how-tos{count ? ` — ${count} articles available to you` : ""}.
        </Typography>
        <TextField
          fullWidth
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search the knowledge base…"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            },
          }}
          sx={{
            maxWidth: 560,
            mx: "auto",
            display: "block",
            "& .MuiOutlinedInput-root": { borderRadius: 3, bgcolor: "background.paper" },
          }}
        />
      </Box>

      {searching ? (
        <Box>
          <SectionLabel>
            {loading && results.length === 0
              ? "Searching…"
              : `${results.length} result${results.length === 1 ? "" : "s"} for “${q.trim()}”`}
          </SectionLabel>
          {results.length > 0 ? (
            <ArticleGrid>
              {results.map((a) => (
                <ArticleCard key={a.id} article={a} onOpen={onOpen} />
              ))}
            </ArticleGrid>
          ) : (
            !loading && (
              <Typography color="text.secondary">No matches for “{q.trim()}”.</Typography>
            )
          )}
        </Box>
      ) : (
        <FolderGroups articles={articles} onOpen={onOpen} />
      )}
    </Box>
  );
}

function FolderGroups({
  articles,
  onOpen,
}: {
  articles: ArticleMeta[] | null;
  onOpen: (slug: string) => void;
}) {
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
              <ArticleCard key={a.id} article={a} onOpen={onOpen} />
            ))}
          </ArticleGrid>
        </Box>
      ))}
    </Box>
  );
}
