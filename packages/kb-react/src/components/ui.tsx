import { Box, Chip, Paper, Stack, Typography } from "@mui/material";
import { alpha, type SxProps, type Theme } from "@mui/material/styles";
import { isPublicArticle, type ArticleMeta } from "../types";

/** Responsive card grid (mirrors the KB home "cards" layout). */
export function ArticleGrid({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        display: "grid",
        gap: 1.5,
        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
      }}
    >
      {children}
    </Box>
  );
}

/** A single article card with a subtle hover lift, accented by the theme. */
export function ArticleCard({
  article,
  onOpen,
}: {
  article: ArticleMeta;
  onOpen: (slug: string) => void;
}) {
  const gated = !isPublicArticle(article.access_roles);
  return (
    <Paper
      variant="outlined"
      onClick={() => onOpen(article.slug)}
      sx={(t) => ({
        p: 2,
        borderRadius: 2,
        cursor: "pointer",
        transition: "transform .15s ease, box-shadow .15s ease, border-color .15s ease",
        "&:hover": {
          transform: "translateY(-2px)",
          borderColor: t.palette.primary.main,
          boxShadow: `0 6px 20px ${alpha(t.palette.primary.main, 0.12)}`,
        },
      })}
    >
      <Typography sx={{ fontWeight: 600, lineHeight: 1.3 }}>
        {article.title}
      </Typography>
      {article.folder && (
        <Typography variant="caption" color="text.secondary">
          {article.folder}
        </Typography>
      )}
      {gated && (
        <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: "wrap", gap: 0.5 }}>
          {article.access_roles.map((r) => (
            <Chip key={r} label={r} size="small" variant="outlined" />
          ))}
        </Stack>
      )}
    </Paper>
  );
}

/** Small uppercase section label (folder / "Recently updated"). */
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      variant="overline"
      color="text.secondary"
      sx={{ display: "block", letterSpacing: ".06em", mb: 1 }}
    >
      {children}
    </Typography>
  );
}

/** Reading typography for rendered markdown — KB-like, theme-accented links. */
export const markdownSx: SxProps<Theme> = {
  color: "text.primary",
  lineHeight: 1.7,
  fontSize: 15,
  "& h1, & h2, & h3": { fontWeight: 700, lineHeight: 1.3, mt: 4, mb: 1.5 },
  "& h1": { fontSize: 28 },
  "& h2": { fontSize: 22 },
  "& h3": { fontSize: 18 },
  "& p": { my: 1.5 },
  "& ul, & ol": { my: 1.5, pl: 3 },
  "& li": { my: 0.5 },
  "& a": { color: "primary.main", textDecoration: "none", "&:hover": { textDecoration: "underline" } },
  "& code": (t) => ({
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: ".88em",
    bgcolor: alpha(t.palette.text.primary, 0.06),
    px: 0.6,
    py: 0.2,
    borderRadius: 0.75,
  }),
  "& pre": (t) => ({
    bgcolor: alpha(t.palette.text.primary, 0.05),
    p: 2,
    borderRadius: 1.5,
    overflow: "auto",
    "& code": { bgcolor: "transparent", p: 0 },
  }),
  "& blockquote": (t) => ({
    m: 0,
    my: 2,
    pl: 2,
    borderLeft: `3px solid ${t.palette.primary.main}`,
    color: "text.secondary",
  }),
  "& img, & video, & iframe": { maxWidth: "100%", borderRadius: 1.5 },
  "& table": { borderCollapse: "collapse", width: "100%", my: 2 },
  "& th, & td": (t) => ({ border: `1px solid ${t.palette.divider}`, p: 1, textAlign: "left" }),
};
