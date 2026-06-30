import { useCallback, useEffect, useState } from "react";
import type { Article } from "@/lib/types";
import type { Draft } from "@/lib/editorStorage";

// Stable string of the editable fields, for unsaved-change detection. Access
// roles are order-normalized so reordering alone doesn't read as a change.
export function snapshot(
  title: string,
  slug: string,
  folder: string,
  tags: string,
  accessRoles: string[],
  contextKeys: string,
  content: string,
): string {
  return JSON.stringify([
    title,
    slug,
    folder,
    tags,
    [...accessRoles].sort(),
    contextKeys,
    content,
  ]);
}

// Fresh articles get an auto-derived slug from the title; existing
// (already-named) articles keep their slug stable so URLs don't move.
const isFresh = (s: string) => /^untitled(-|$)/.test(s);

/** The editable article document: field state, baseline/dirty source, and a
 *  re-sync when navigating to a different article in the same component
 *  instance. `current` is the live snapshot; compare to `baseline` for dirty. */
export function useEditorState(article: Article) {
  const [title, setTitle] = useState(article.title);
  const [slug, setSlug] = useState(article.slug);
  const [folder, setFolder] = useState(article.folder);
  const [tags, setTags] = useState(article.tags.join(", "));
  const [accessRoles, setAccessRoles] = useState<string[]>(
    article.access_roles,
  );
  const [contextKeys, setContextKeys] = useState(
    article.context_keys.join(", "),
  );
  const [content, setContent] = useState(article.content);
  const [slugTouched, setSlugTouched] = useState(!isFresh(article.slug));
  const [baseline, setBaseline] = useState(() =>
    snapshot(
      article.title,
      article.slug,
      article.folder,
      article.tags.join(", "),
      article.access_roles,
      article.context_keys.join(", "),
      article.content,
    ),
  );

  const current = snapshot(
    title,
    slug,
    folder,
    tags,
    accessRoles,
    contextKeys,
    content,
  );

  // Re-sync when navigating to a different article (same component instance).
  useEffect(() => {
    setTitle(article.title);
    setSlug(article.slug);
    setFolder(article.folder);
    setTags(article.tags.join(", "));
    setAccessRoles(article.access_roles);
    setContextKeys(article.context_keys.join(", "));
    setContent(article.content);
    setSlugTouched(!isFresh(article.slug));
    setBaseline(
      snapshot(
        article.title,
        article.slug,
        article.folder,
        article.tags.join(", "),
        article.access_roles,
        article.context_keys.join(", "),
        article.content,
      ),
    );
  }, [article.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply a recovered draft to the editor fields.
  const applyDraft = useCallback((d: Draft) => {
    setTitle(d.title);
    setSlug(d.slug);
    setFolder(d.folder);
    setTags(d.tags);
    setAccessRoles(d.accessRoles);
    setContextKeys(d.contextKeys);
    setContent(d.content);
    setSlugTouched(true);
  }, []);

  return {
    title,
    setTitle,
    slug,
    setSlug,
    folder,
    setFolder,
    tags,
    setTags,
    accessRoles,
    setAccessRoles,
    contextKeys,
    setContextKeys,
    content,
    setContent,
    slugTouched,
    setSlugTouched,
    current,
    baseline,
    setBaseline,
    applyDraft,
  };
}
