import { useEffect, useState } from "react";
import { Box, Link, Stack, Typography } from "@mui/material";
import { useKb } from "../context";
import type { ArticleMeta } from "../types";

export type KbRelatedProps = {
  /** Stable screen identifier(s), e.g. ["intervention.shipment-detail"]. */
  contextKeys: string[];
  title?: string;
  max?: number;
};

/**
 * Contextual "related articles" for the screen the widget is shown on. The host
 * passes stable context keys; articles tagged with any of them are listed.
 * Clicking routes via the provider's `onNavigate` (e.g. open the launcher to
 * that slug). Renders nothing when there are no matches.
 */
export default function KbRelated({
  contextKeys,
  title = "Related articles",
  max = 6,
}: KbRelatedProps) {
  const { client, onNavigate } = useKb();
  const [items, setItems] = useState<ArticleMeta[] | null>(null);
  const key = contextKeys.join("");

  useEffect(() => {
    let alive = true;
    client
      .relatedArticles(contextKeys, max)
      .then((r) => alive && setItems(r))
      .catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
    // contextKeys is compared by value via `key`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, key, max]);

  if (!items || items.length === 0) return null;

  return (
    <Box>
      <Typography variant="overline" color="text.secondary">
        {title}
      </Typography>
      <Stack spacing={0.5} sx={{ mt: 0.5 }}>
        {items.map((a) => (
          <Link
            key={a.id}
            component="button"
            type="button"
            underline="hover"
            color="inherit"
            sx={{ textAlign: "left", width: "fit-content" }}
            onClick={() => onNavigate?.(a.slug)}
          >
            {a.title}
          </Link>
        ))}
      </Stack>
    </Box>
  );
}
