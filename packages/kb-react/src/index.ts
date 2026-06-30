// @skycell-ag/kb-react — embeddable, read-only SkyCell Knowledge Base widgets.

export { createKbClient } from "./client";
export type { KbClient, KbClientConfig } from "./client";

export { KbProvider, useKb } from "./context";
export type { KbProviderProps } from "./context";

export { default as KnowledgeBase } from "./components/KnowledgeBase";
export { default as KbLauncher } from "./components/KbLauncher";
export type { KbLauncherProps } from "./components/KbLauncher";
export { default as KbRelated } from "./components/KbRelated";
export type { KbRelatedProps } from "./components/KbRelated";
export { default as KbSearch } from "./components/KbSearch";
export { default as KbArticleList } from "./components/KbArticleList";
export { default as KbArticleView } from "./components/KbArticleView";
export { default as MarkdownView } from "./markdown";
export type { MarkdownViewProps } from "./markdown";

export { extractKeycloakRoles } from "./keycloakRoles";
export { ARTICLE_LIST_COLUMNS, isPublicArticle } from "./types";
export type { Article, ArticleMeta } from "./types";

export { createKbTheme } from "./theme";
export type { CreateKbThemeOptions } from "./theme";
// Re-export the shared design tokens so hosts can match the KB look. Imported
// then exported (not a pass-through `export … from`) so tsup inlines them into
// the published .d.ts rather than referencing the private kb-core package.
import {
  KB_BRANDS,
  KB_NEUTRALS,
  KB_RADII,
  KB_FONT_STACK,
  type KbBrand,
} from "@skycell-ag/kb-core";
export { KB_BRANDS, KB_NEUTRALS, KB_RADII, KB_FONT_STACK };
export type { KbBrand };
