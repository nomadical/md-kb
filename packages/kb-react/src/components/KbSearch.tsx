import { useEffect, useRef, useState } from "react";
import { Box, InputAdornment, TextField, Typography } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { useKb } from "../context";
import type { ArticleMeta } from "../types";
import { ArticleCard, ArticleGrid, SectionLabel } from "./ui";

/** Debounced full-text search with a rounded search field + result cards. */
export default function KbSearch({ autoFocus }: { autoFocus?: boolean }) {
  const { client, onNavigate } = useKb();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ArticleMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);

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

  return (
    <Box>
      <TextField
        fullWidth
        autoFocus={autoFocus}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search the knowledge base…"
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          },
        }}
        sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3, bgcolor: "background.paper" } }}
      />
      {searching && (
        <Box sx={{ mt: 2 }}>
          <SectionLabel>
            {loading && results.length === 0
              ? "Searching…"
              : `${results.length} result${results.length === 1 ? "" : "s"} for “${q.trim()}”`}
          </SectionLabel>
          {results.length > 0 ? (
            <ArticleGrid>
              {results.map((a) => (
                <ArticleCard key={a.id} article={a} onOpen={(s) => onNavigate?.(s)} />
              ))}
            </ArticleGrid>
          ) : (
            !loading && (
              <Typography color="text.secondary">No matches for “{q.trim()}”.</Typography>
            )
          )}
        </Box>
      )}
    </Box>
  );
}
