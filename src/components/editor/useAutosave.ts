import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { SOURCE_LANGUAGE, type Article } from "@/lib/types";
import { clearDraft, loadDraft, saveDraft, type Draft } from "@/lib/editorStorage";
import { saveArticle, saveTranslation } from "@/spa/data/writes";
import { snapshot } from "./useEditorState";

type UseAutosaveParams = {
  article: Article;
  canEdit: boolean;
  /** Language being edited. The source language saves the article; any other
   *  language saves that article's translation row. */
  language?: string;
  /** True when editing a non-source language (translation row). */
  isTranslation?: boolean;
  /** localStorage draft key — per (article, language) so languages don't
   *  clobber each other's recovery copy. */
  draftId?: string;
  /** Live field snapshot (from useEditorState) — drives the debounced effects. */
  current: string;
  dirty: boolean;
  title: string;
  slug: string;
  folder: string;
  tags: string;
  accessRoles: string[];
  contextKeys: string;
  content: string;
  /** Mark the just-saved (or recovered) field values as the new baseline. */
  setBaseline: (snapshot: string) => void;
  /** Apply a recovered draft's values back into the editor fields. */
  applyDraft: (draft: Draft) => void;
  pushToast: (kind: "success" | "error" | "info", message: string) => void;
};

/** Persistence layer for the editor: manual save, debounced autosave, a
 *  localStorage draft mirror with crash recovery, and the unsaved-changes
 *  guards (beforeunload + Cmd/Ctrl+S). Field state lives in useEditorState. */
export function useAutosave({
  article,
  canEdit,
  language = SOURCE_LANGUAGE,
  isTranslation = false,
  draftId = article.id,
  current,
  dirty,
  title,
  slug,
  folder,
  tags,
  accessRoles,
  contextKeys,
  content,
  setBaseline,
  applyDraft,
  pushToast,
}: UseAutosaveParams) {
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // A locally-stashed unsaved draft that diverges from the loaded article,
  // offered for recovery (e.g. after a crash or a failed save).
  const [recovery, setRecovery] = useState<Draft | null>(null);
  // Tracks whether we've already toasted an autosave failure, so it doesn't
  // spam once per attempt — reset on the next success.
  const autosaveErrored = useRef(false);
  // Last content snapshot we attempted to autosave (avoids retry loops).
  const lastAutosaved = useRef<string | null>(null);

  const save = useCallback(
    (manual = true) => {
      setError(null);
      startTransition(async () => {
        // Translations carry only title + content; article-level metadata
        // (slug/folder/tags/access/context) stays on the source article.
        const res = isTranslation
          ? await saveTranslation({
              articleId: article.id,
              language,
              title,
              content,
            })
          : await saveArticle({
              id: article.id,
              title,
              slug,
              folder,
              content,
              tags: tags.split(","),
              access_roles: accessRoles,
              context_keys: contextKeys.split(","),
            });
        if (res.ok) {
          setSavedAt(new Date().toLocaleTimeString());
          setBaseline(
            snapshot(title, slug, folder, tags, accessRoles, contextKeys, content),
          );
          clearDraft(draftId); // persisted now — drop the local recovery copy
          setRecovery(null);
          autosaveErrored.current = false;
          if (manual) pushToast("success", "Article saved");
        } else {
          setError(res.error);
          // Manual saves always toast; autosave toasts once until it recovers.
          if (manual) {
            pushToast("error", `Save failed: ${res.error}`);
          } else if (!autosaveErrored.current) {
            autosaveErrored.current = true;
            pushToast("error", `Autosave failed: ${res.error}`);
          }
        }
      });
    },
    [article.id, language, isTranslation, draftId, title, slug, folder, content, tags, accessRoles, contextKeys, pushToast, setBaseline],
  );

  // Reset transient save state when navigating to a different article.
  useEffect(() => {
    setSavedAt(null);
    setError(null);
    lastAutosaved.current = null;
  }, [article.id]);

  // Autosave: 1.5s after the last edit, persist the draft. `current` changes
  // on every keystroke so the timer debounces. We attempt each distinct
  // snapshot at most once (lastAutosaved) so a failing save doesn't retry in a
  // loop — the next real edit re-enables it.
  useEffect(() => {
    if (!dirty || pending || current === lastAutosaved.current) return;
    const t = setTimeout(() => {
      lastAutosaved.current = current;
      save(false);
    }, 1500);
    return () => clearTimeout(t);
  }, [current, dirty, pending, save]);

  // Mirror unsaved edits to localStorage (debounced) so a crash / closed tab /
  // failed save is recoverable. Survives independently of the server.
  useEffect(() => {
    if (!canEdit || !dirty) return;
    const t = setTimeout(() => {
      saveDraft(draftId, {
        title,
        slug,
        folder,
        tags,
        accessRoles,
        contextKeys,
        content,
        ts: Date.now(),
      });
    }, 600);
    return () => clearTimeout(t);
  }, [current, dirty, canEdit, draftId]); // eslint-disable-line react-hooks/exhaustive-deps

  // On opening an article, offer to recover a local draft that diverges from
  // the loaded (server) version. Stale drafts (equal to the server) are dropped.
  useEffect(() => {
    const d = loadDraft(draftId);
    if (
      d &&
      snapshot(
        d.title,
        d.slug,
        d.folder,
        d.tags,
        d.accessRoles,
        d.contextKeys,
        d.content,
      ) !==
        snapshot(
          article.title,
          article.slug,
          article.folder,
          article.tags.join(", "),
          article.access_roles,
          article.context_keys.join(", "),
          article.content,
        )
    ) {
      setRecovery(d);
    } else {
      setRecovery(null);
      if (d) clearDraft(draftId);
    }
  }, [draftId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply a recovered draft to the editor fields.
  const restoreDraft = useCallback(() => {
    setRecovery((d) => {
      if (d) applyDraft(d);
      return null;
    });
  }, [applyDraft]);

  const discardDraft = useCallback(() => {
    clearDraft(draftId);
    setRecovery(null);
  }, [draftId]);

  // Clear a stale save error (e.g. when starting an unrelated upload).
  const clearError = useCallback(() => setError(null), []);

  // Warn before leaving (reload/close) with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // Cmd/Ctrl+S to save (editors only).
  useEffect(() => {
    if (!canEdit) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save, canEdit]);

  return {
    save,
    pending,
    savedAt,
    error,
    clearError,
    recovery,
    restoreDraft,
    discardDraft,
  };
}
