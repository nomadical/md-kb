// Read-only article model for embeds. The shared, framework-agnostic bits live
// in @skycell-ag/kb-core (bundled into this package by tsup, so no runtime dep).

import {
  ARTICLE_LIST_COLUMNS,
  isPublicArticle,
  type ArticleMeta,
} from "@skycell-ag/kb-core";

export { ARTICLE_LIST_COLUMNS, isPublicArticle, type ArticleMeta };

/** Full read shape for a single article view (list shape + body). */
export type Article = ArticleMeta & {
  content: string;
  created_at: string;
};
