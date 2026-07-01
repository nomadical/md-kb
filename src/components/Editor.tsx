import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useBlocker } from "react-router-dom";
import Link from "@/components/ui/AppLink";
import {
  FaPhotoFilm,
  FaClockRotateLeft,
  FaShapes,
  FaXmark,
  FaBold,
  FaItalic,
  FaStrikethrough,
  FaCode,
  FaLink,
  FaScissors,
  FaCopy,
} from "react-icons/fa6";
import { useTranslation } from "react-i18next";
import type { ICommand, PreviewType } from "@uiw/react-md-editor";
import { SOURCE_LANGUAGE, type Article } from "@/lib/types";
import { slugify } from "@/lib/markdown";
import { applyTemplate } from "@/lib/templates";
import MarkdownView from "@/components/MarkdownView";
import AccessRolePicker from "@/components/AccessRolePicker";
import FolderPicker from "@/components/FolderPicker";
import { ToastHost, useToast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import ContextMenu from "@/components/ui/ContextMenu";
import SlashMenu, {
  SLASH_COMMANDS,
  caretCoords,
  type SlashCommand,
} from "@/components/editor/SlashMenu";
import ViewControls, {
  Tooltip,
  ViewToggle,
} from "@/components/editor/ViewControls";
import ReviewControls, {
  DeleteButton,
} from "@/components/editor/ReviewControls";
import DraftControls from "@/components/editor/DraftControls";
import LanguageVersionPicker, {
  type LanguageVersion,
} from "@/components/editor/LanguageVersionPicker";
import ReadOnlyArticleView from "@/components/editor/ReadOnlyArticleView";
import TemplatePickerModal from "@/components/editor/TemplatePickerModal";
import { Field, FloatingField, FIELD_INPUT } from "@/components/editor/fields";
import { caretPos, wrapT, linkT } from "@/components/editor/editorText";
import { useMediaUpload } from "@/components/editor/useMediaUpload";
import { loadSplit, loadView, saveSplit, saveView } from "@/lib/editorStorage";
import { useEditorState } from "@/components/editor/useEditorState";
import { useAutosave } from "@/components/editor/useAutosave";
import { useSettings } from "@/spa/data/settings";

// MDEditor touches `window` and is heavy; lazy-load it (also code-splits the
// admin editor out of the main bundle).
const MDEditor = lazy(() => import("@uiw/react-md-editor"));

export default function Editor({
  article,
  canEdit,
  canDelete,
  canReview = false,
  reviewDiffBase = null,
  folders = [],
  templates = [],
  isAdmin = false,
  userAccessRoles = [],
  language = SOURCE_LANGUAGE,
  isTranslation = false,
  languageVersions = [],
  onLanguageChange,
  articleDraftId,
  draftStatus,
  reviewing = false,
}: {
  article: Article;
  canEdit: boolean;
  canDelete: boolean;
  /** Reviewer/admin: may approve or reject submissions. */
  canReview?: boolean;
  /** Content of the last published revision, for the review diff (null = none). */
  reviewDiffBase?: string | null;
  /** Existing folder paths, for the folder combobox suggestions. */
  folders?: string[];
  /** Templates available to insert at the caret. */
  templates?: { id: string; name: string; content: string }[];
  /** Admins may assign any entitlement role; editors only ones they hold. */
  isAdmin?: boolean;
  userAccessRoles?: string[];
  /** Language currently being edited (source = the article itself). */
  language?: string;
  /** True when `article` is a translation doc (title/content of a non-source
   *  language); article-level metadata is then read-only. */
  isTranslation?: boolean;
  /** Status of every language version, for the version picker. */
  languageVersions?: LanguageVersion[];
  /** Switch the edited language (the parent reloads + remounts the editor). */
  onLanguageChange?: (language: string) => void;
  /** Source-language private draft being edited (article_drafts.id). When set,
   *  the editor drives the per-user draft lifecycle instead of the article. */
  articleDraftId?: string;
  draftStatus?: "draft" | "in_review";
  /** Reviewer opened someone else's submitted draft (read-only review). */
  reviewing?: boolean;
}) {
  const { t } = useTranslation();
  const { tagsEnabled, defaultEditorView } = useSettings();
  const {
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
  } = useEditorState(article);

  // Editor layout, persisted across sessions/articles.
  const [previewMode, setPreviewMode] = useState<PreviewType>(() =>
    loadView(defaultEditorView),
  );
  const [fullscreen, setFullscreen] = useState(false);
  // Zen / distraction-free mode: full-viewport overlay, chrome hidden.
  const [zen, setZen] = useState(false);
  // Editor/preview split as a percentage (editor width) for the live view.
  const [split, setSplit] = useState<number>(loadSplit);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => saveView(previewMode), [previewMode]);
  useEffect(() => saveSplit(split), [split]);

  const [templatePicker, setTemplatePicker] = useState(false);
  // Custom right-click menu: position + the selection captured at click time.
  const [ctxMenu, setCtxMenu] = useState<{
    x: number;
    y: number;
    start: number;
    end: number;
  } | null>(null);
  // Slash command menu: position of the "/", the typed query, caret coords,
  // and the highlighted item index.
  const [slash, setSlash] = useState<{
    pos: number;
    query: string;
    x: number;
    y: number;
    index: number;
  } | null>(null);
  // Transient feedback toasts (save / upload).
  const { toasts, pushToast, dismissToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Caret position captured when the toolbar image button is clicked, so the
  // uploaded image is inserted where the cursor was (not appended).
  const pendingPos = useRef<{ start: number; end: number } | undefined>(
    undefined,
  );

  // Unsaved-edit detection + word count, recomputed each render.
  const dirty = canEdit && current !== baseline;
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  const readMins = Math.max(1, Math.ceil(words / 200));

  // Per-language localStorage draft key, so each language's recovery copy is
  // independent (the source keeps the legacy `<id>` key for back-compat).
  const draftId = isTranslation ? `${article.id}:${language}` : article.id;

  // Save + autosave + local-draft recovery + unsaved-changes guards.
  const {
    save,
    pending,
    savedAt,
    error,
    clearError,
    recovery,
    restoreDraft,
    discardDraft,
  } = useAutosave({
    article,
    canEdit,
    language,
    isTranslation,
    draftId,
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
  });

  // Switch the edited language. Persist unsaved edits first (the parent then
  // reloads the target language and remounts this editor).
  const handleLanguageSelect = useCallback(
    (next: string) => {
      if (!onLanguageChange || next === language) return;
      if (dirty && canEdit) save();
      onLanguageChange(next);
    },
    [onLanguageChange, language, dirty, canEdit, save],
  );

  // Upload dropped/pasted/picked media and insert at the caret (images/GIFs as
  // markdown image links, videos as a <video> tag rendered via the sanitizer).
  const { uploading, insertImages } = useMediaUpload({
    clearError,
    setContent,
    pushToast,
  });

  // Image-upload button inside the MDEditor toolbar (native placement). Clicking
  // it opens the file picker; the chosen image inserts at the captured caret.
  const imageCommand: ICommand = {
    name: "upload-media",
    keyCommand: "upload-media",
    buttonProps: {
      "aria-label": "Upload image or video",
      title: "Upload image / video",
    },
    icon: <FaPhotoFilm />,
    execute: (state) => {
      pendingPos.current = state?.selection
        ? { start: state.selection.start, end: state.selection.end }
        : undefined;
      fileInputRef.current?.click();
    },
  };

  // Insert-template toolbar button: capture the caret, then open a picker.
  const templateCommand: ICommand = {
    name: "insert-template",
    keyCommand: "insert-template",
    buttonProps: { "aria-label": "Insert template", title: "Insert template" },
    icon: <FaShapes />,
    execute: (state) => {
      pendingPos.current = state?.selection
        ? { start: state.selection.start, end: state.selection.end }
        : undefined;
      setTemplatePicker(true);
    },
  };

  const insertTemplate = useCallback(
    (raw: string) => {
      const md = applyTemplate(raw, { title });
      setContent((prev) => {
        const start = pendingPos.current?.start ?? prev.length;
        const end = pendingPos.current?.end ?? start;
        return prev.slice(0, start) + md + prev.slice(end);
      });
      pendingPos.current = undefined;
      setTemplatePicker(false);
    },
    [title, setContent],
  );

  // ---- Custom right-click menu actions -----------------------------------
  const editorTextarea = () =>
    wrapRef.current?.querySelector<HTMLTextAreaElement>(
      "textarea.w-md-editor-text-input",
    ) ?? null;

  // Open our menu (instead of the browser's) when right-clicking the editor
  // textarea; right-clicks on the preview/toolbar keep the native menu.
  const onEditorContextMenu = (e: React.MouseEvent) => {
    const ta = e.target as HTMLElement;
    if (ta.tagName !== "TEXTAREA") return;
    e.preventDefault();
    setCtxMenu({
      x: e.clientX,
      y: e.clientY,
      start: (ta as HTMLTextAreaElement).selectionStart,
      end: (ta as HTMLTextAreaElement).selectionEnd,
    });
  };

  // Restore focus + caret/selection after React re-renders the controlled
  // textarea (offsets are relative to the document start).
  const setSelectionSoon = (selStart: number, selEnd: number) => {
    requestAnimationFrame(() => {
      const ta = editorTextarea();
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(selStart, selEnd);
    });
  };

  // Replace text in [start, end) with `transform(selectedText).text`, then
  // place the caret/selection at the returned offsets (relative to the start
  // of the inserted text; defaults to the caret at the end of it). Reads the
  // live textarea value so it's safe from keydown handlers' stale closures.
  const runEditAt = (
    start: number,
    end: number,
    transform: (sel: string) => {
      text: string;
      selStart?: number;
      selEnd?: number;
    },
  ) => {
    const base = editorTextarea()?.value ?? content;
    const { text, selStart, selEnd } = transform(base.slice(start, end));
    setContent(base.slice(0, start) + text + base.slice(end));
    setCtxMenu(null);
    const caretStart = start + (selStart ?? text.length);
    setSelectionSoon(caretStart, start + (selEnd ?? selStart ?? text.length));
  };

  // Context-menu helpers operate on the right-click selection.
  const wrapSelection = (before: string, after = before) =>
    ctxMenu && runEditAt(ctxMenu.start, ctxMenu.end, wrapT(before, after));
  const insertLink = () =>
    ctxMenu && runEditAt(ctxMenu.start, ctxMenu.end, linkT);

  // ⌘K → link (the library binds ⌘K to image; image stays available via the
  // toolbar / right-click / drag-drop). Intercept in the capture phase so the
  // library's textarea handler never sees it. Slash-menu keys handled too.
  const onEditorKeyDown = (e: React.KeyboardEvent) => {
    if (slash) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSlash((s) => s && { ...s, index: (s.index + 1) % slashFiltered.length });
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSlash(
          (s) =>
            s && {
              ...s,
              index: (s.index - 1 + slashFiltered.length) % slashFiltered.length,
            },
        );
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        if (slashFiltered[slash.index]) {
          e.preventDefault();
          chooseSlash(slashFiltered[slash.index]);
          return;
        }
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setSlash(null);
        return;
      }
    }
    // Smart list/quote continuation on Enter. We own this in the capture phase
    // (the library only handles non-indented -, *, 1., and never exits an empty
    // item or continues quotes), so the behaviour is consistent everywhere.
    if (
      e.key === "Enter" &&
      !e.shiftKey &&
      !e.metaKey &&
      !e.ctrlKey &&
      !e.altKey &&
      (e.target as HTMLElement).tagName === "TEXTAREA"
    ) {
      const ta = e.target as HTMLTextAreaElement;
      if (ta.selectionStart === ta.selectionEnd) {
        const v = ta.value;
        const pos = ta.selectionStart;
        const ls = v.lastIndexOf("\n", pos - 1) + 1;
        const le = v.indexOf("\n", pos);
        const line = v.slice(ls, le === -1 ? v.length : le);
        const bullet = line.match(/^(\s*)([-*+])\s+(\[[ xX]\]\s+)?(.*)$/);
        const ordered = line.match(/^(\s*)(\d+)([.)])\s+(.*)$/);
        const quote = line.match(/^(\s*)(>+)\s+(.*)$/);
        if (bullet || ordered || quote) {
          e.preventDefault();
          e.stopPropagation();
          const lineContent = bullet ? bullet[4] : ordered ? ordered[4] : quote![3];
          if (lineContent.trim() === "") {
            // Empty item → exit the list: drop the marker, leaving a blank line.
            setContent(v.slice(0, ls) + v.slice(pos));
            setSelectionSoon(ls, ls);
          } else {
            const cont = bullet
              ? `${bullet[1]}${bullet[2]} ${bullet[3] ? "[ ] " : ""}`
              : ordered
                ? `${ordered[1]}${parseInt(ordered[2]) + 1}${ordered[3]} `
                : `${quote![1]}${quote![2]} `;
            const insert = `\n${cont}`;
            setContent(v.slice(0, pos) + insert + v.slice(pos));
            setSelectionSoon(pos + insert.length, pos + insert.length);
          }
        }
      }
      return;
    }
    if (
      (e.metaKey || e.ctrlKey) &&
      !e.shiftKey &&
      !e.altKey &&
      e.key.toLowerCase() === "k"
    ) {
      const ta = e.target as HTMLElement;
      if (ta.tagName !== "TEXTAREA") return;
      e.preventDefault();
      e.stopPropagation();
      const t = ta as HTMLTextAreaElement;
      runEditAt(t.selectionStart, t.selectionEnd, linkT);
    }
  };

  const copySelection = async (cut: boolean) => {
    if (!ctxMenu) return;
    const sel = content.slice(ctxMenu.start, ctxMenu.end);
    try {
      await navigator.clipboard.writeText(sel);
    } catch {
      /* clipboard blocked — fall through; cut still removes the text */
    }
    if (cut) runEditAt(ctxMenu.start, ctxMenu.end, () => ({ text: "" }));
    else setCtxMenu(null);
  };

  // ---- Slash command menu ------------------------------------------------
  // Built-in block commands + the article's templates.
  const slashAll: SlashCommand[] = [
    ...SLASH_COMMANDS,
    ...templates.map((t) => ({
      label: t.name,
      icon: <FaShapes />,
      insert: (articleTitle: string) => ({
        text: applyTemplate(t.content, { title: articleTitle }),
      }),
    })),
  ];
  const slashFiltered = slash
    ? slashAll.filter((c) =>
        c.label.toLowerCase().includes(slash.query.toLowerCase()),
      )
    : [];

  // On each edit, detect a "/token" being typed at line start / after
  // whitespace and (re)open the slash menu anchored at the caret.
  const onEditorInput = () => {
    const ta = editorTextarea();
    if (!ta) return;
    const caret = ta.selectionStart;
    const text = ta.value;
    let i = caret - 1;
    while (i >= 0 && !/\s/.test(text[i]) && text[i] !== "/") i--;
    if (
      i >= 0 &&
      text[i] === "/" &&
      (i === 0 || /\s/.test(text[i - 1])) &&
      /^[a-zA-Z]*$/.test(text.slice(i + 1, caret))
    ) {
      const c = caretCoords(ta, i);
      setSlash((s) => ({
        pos: i,
        query: text.slice(i + 1, caret),
        x: c.x,
        y: c.y,
        index: s ? s.index : 0,
      }));
    } else if (slash) {
      setSlash(null);
    }
  };

  // Replace the "/query" with the chosen command's markdown.
  const chooseSlash = (cmd: SlashCommand) => {
    if (!slash) return;
    const ta = editorTextarea();
    const base = ta?.value ?? content;
    const caret = ta?.selectionStart ?? slash.pos + 1 + slash.query.length;
    const insert = cmd.insert(title);
    setContent(base.slice(0, slash.pos) + insert.text + base.slice(caret));
    setSlash(null);
    const cpos = slash.pos + (insert.caret ?? insert.text.length);
    setSelectionSoon(cpos, cpos);
  };

  // Esc exits fullscreen / zen mode.
  useEffect(() => {
    if (!fullscreen && !zen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFullscreen(false);
        setZen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen, zen]);

  // Block in-app (SPA) navigation away from unsaved changes. Pairs with the
  // beforeunload guard above, which only covers reload/tab-close. When
  // `blocker.state === "blocked"` we render a custom confirm dialog (below).
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && currentLocation.pathname !== nextLocation.pathname,
  );

  // Drag the editor/preview divider (live view only). Updates the split %
  // from the pointer's x position within the editor wrapper.
  const startSplitDrag = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const onMove = (ev: PointerEvent) => {
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      setSplit(Math.min(85, Math.max(15, pct)));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, []);

  // ---- Read-only view for reviewers / viewers ----------------------------
  if (!canEdit) {
    return (
      <ReadOnlyArticleView
        article={article}
        language={language}
        languageVersions={languageVersions}
        onLanguageSelect={onLanguageChange ? handleLanguageSelect : undefined}
        isTranslation={isTranslation}
        articleDraftId={articleDraftId}
        draftStatus={draftStatus}
        canReview={canReview}
        reviewDiffBase={reviewDiffBase}
        reviewing={reviewing}
      />
    );
  }

  // ---- Editor view for editors/admins ------------------------------------
  return (
    <div
      className={`flex h-full flex-col ${
        zen ? "fixed inset-0 z-[60] bg-ink-bg" : ""
      }`}
    >
      {/* Zen mode: slim bar with just the essentials. */}
      {zen && (
        <div className="flex items-center gap-3 border-b border-ink-line bg-ink-panel/90 px-4 py-2 backdrop-blur">
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              // Slug is article-level; never derive it while editing a
              // translation (it stays the source article's slug).
              if (!slugTouched && !isTranslation) setSlug(slugify(e.target.value));
            }}
            placeholder={t("editor.titlePlaceholder")}
            className="min-w-40 flex-1 rounded-md px-2 py-1 text-[15px] font-semibold outline-none focus:bg-black/[0.04]"
          />
          <span className="whitespace-nowrap text-[12px] text-ink-mut">
            {t("editor.wordCount", { count: words, minutes: readMins })}
          </span>
          {onLanguageChange && (
            <LanguageVersionPicker
              language={language}
              versions={languageVersions}
              onSelect={handleLanguageSelect}
            />
          )}
          <ViewToggle value={previewMode} onChange={setPreviewMode} />
          <button
            onClick={() => save()}
            disabled={pending || !dirty}
            className="rounded-md bg-ink-accent px-3 py-1 text-[13px] font-medium text-white hover:bg-ink-accentHover disabled:opacity-60"
          >
            {pending ? t("common.saving") : dirty ? t("common.save") : t("common.saved")}
          </button>
          <Tooltip label="Esc">
            <button
              type="button"
              onClick={() => setZen(false)}
              className="inline-flex items-center gap-1.5 rounded-md border border-ink-line px-2 py-1 text-[13px] text-ink-mut transition-colors hover:border-ink-accent hover:text-ink-accent"
            >
              <FaXmark /> {t("editor.exitZen")}
            </button>
          </Tooltip>
        </div>
      )}

      {/* toolbar */}
      {!zen && (
      <div className="flex flex-wrap items-center gap-2 border-b border-ink-line bg-ink-panel px-4 py-2">
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
          placeholder="Title"
          className="min-w-40 flex-1 rounded-md px-2 py-1 text-[15px] font-semibold outline-none focus:bg-black/[0.04]"
        />
        {onLanguageChange && (
          <LanguageVersionPicker
            language={language}
            versions={languageVersions}
            onSelect={handleLanguageSelect}
          />
        )}
        {isTranslation || !articleDraftId ? (
          <ReviewControls
            articleId={article.id}
            slug={slug}
            initialStatus={article.status}
            initialNote={article.review_note}
            canEdit={canEdit}
            canReview={canReview}
            language={language}
          />
        ) : (
          <DraftControls
            draftId={articleDraftId}
            status={draftStatus ?? "draft"}
            published={article.published}
            slug={slug}
            reviewNote={article.review_note}
            canEdit={canEdit}
            canReview={canReview}
            reviewing={reviewing}
          />
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files?.length)
              void insertImages(e.target.files, pendingPos.current);
            pendingPos.current = undefined;
            e.target.value = "";
          }}
        />
        {uploading && (
          <span className="text-[12px] text-ink-mut">{t("editor.uploading")}</span>
        )}
        <button
          onClick={() => save()}
          disabled={pending || !dirty}
          className="rounded-md bg-ink-accent px-3 py-1 text-[13px] font-medium text-white hover:bg-ink-accentHover disabled:opacity-60"
        >
          {pending ? t("common.saving") : dirty ? t("common.save") : t("common.saved")}
        </button>
        <Link
          href={`/admin/${article.id}/history${
            isTranslation ? `?lang=${language}` : ""
          }`}
          className="inline-flex items-center gap-1.5 rounded-md border border-ink-line px-2 py-1 text-[13px] text-ink-mut hover:border-ink-accent hover:text-ink-accent"
        >
          <FaClockRotateLeft className="text-[11px]" /> {t("editor.history")}
        </Link>
        {canDelete && <DeleteButton id={article.id} />}
      </div>
      )}

      {/* metadata row */}
      {!zen && (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-4 border-b border-ink-line bg-ink-bg px-4 py-3 text-[12px]">
        {isTranslation ? (
          // Article-level fields live on the source language; show them
          // read-only here so a translator can see (but not change) them.
          <div className="flex flex-wrap items-center gap-3 text-ink-mut">
            <Field label={t("editor.slug")}>
              <span className="font-mono text-ink-fg">{slug}</span>
            </Field>
            <Field label={t("editor.folder")}>
              <span className="text-ink-fg">{folder || "(root)"}</span>
            </Field>
            {tags.trim() && (
              <Field label={t("editor.tags")}>
                <span className="text-ink-fg">#{tags.split(",").map((s) => s.trim()).filter(Boolean).join(" #")}</span>
              </Field>
            )}
            <span className="text-ink-mut">·</span>
            <span className="italic">{t("editor.translationManagedOnSource")}</span>
          </div>
        ) : (
          <>
            <FloatingField label={t("editor.slug")}>
              <input
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
                className={FIELD_INPUT + " w-48"}
              />
            </FloatingField>
            <FloatingField label={t("editor.folder")}>
              <FolderPicker value={folder} onChange={setFolder} folders={folders} />
            </FloatingField>
            {tagsEnabled && (
              <FloatingField label={t("editor.tags")}>
                <input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder={t("editor.tagsPlaceholder")}
                  className={FIELD_INPUT + " w-44"}
                />
              </FloatingField>
            )}
            <FloatingField label={t("editor.contextKeys")}>
              <input
                value={contextKeys}
                onChange={(e) => setContextKeys(e.target.value)}
                placeholder="intervention.shipment-detail, …"
                className={FIELD_INPUT + " w-56"}
              />
            </FloatingField>
            <FloatingField label={t("editor.accessRoles")}>
              <AccessRolePicker
                value={accessRoles}
                onChange={setAccessRoles}
                allowedRoles={isAdmin ? undefined : userAccessRoles}
              />
            </FloatingField>
          </>
        )}
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-3 text-ink-mut">
            <span className="whitespace-nowrap">
              {t("editor.wordCount", { count: words, minutes: readMins })}
            </span>
            {error ? (
              <span className="text-red-600">{error}</span>
            ) : dirty ? (
              <span>{t("editor.unsaved")}</span>
            ) : savedAt ? (
              <span>{t("editor.savedAt", { time: savedAt })}</span>
            ) : (
              <span>{t("editor.saveHint")}</span>
            )}
          </div>
          <ViewControls
            previewMode={previewMode}
            setPreviewMode={setPreviewMode}
            fullscreen={fullscreen}
            setFullscreen={setFullscreen}
            setZen={setZen}
          />
        </div>
      </div>
      )}

      {/* Local draft recovery banner. */}
      {recovery && (
        <div className="kb-fade flex flex-wrap items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-[12px] text-amber-700">
          <span className="flex-1">
            {t("editor.draftFound", {
              date: new Date(recovery.ts).toLocaleString(),
            })}
          </span>
          <button
            onClick={restoreDraft}
            className="rounded-md bg-ink-accent px-2.5 py-1 font-medium text-white transition-colors hover:bg-ink-accentHover"
          >
            {t("common.restore")}
          </button>
          <button
            onClick={discardDraft}
            className="rounded-md border border-ink-line px-2.5 py-1 text-ink-mut transition-colors hover:border-ink-accent hover:text-ink-accent"
          >
            {t("common.discard")}
          </button>
        </div>
      )}

      {/* editor + live preview */}
      <div
        ref={wrapRef}
        onContextMenu={onEditorContextMenu}
        onKeyDownCapture={onEditorKeyDown}
        onInput={onEditorInput}
        className={`relative min-h-0 flex-1 ${
          previewMode === "live" ? "kb-live-split" : ""
        }`}
        style={{ ["--kb-split" as string]: `${split}%` } as React.CSSProperties}
      >
        <Suspense
          fallback={
            <div className="p-6 text-[13px] text-ink-mut">Loading editor…</div>
          }
        >
        <MDEditor
          value={content}
          onChange={(v) => setContent(v ?? "")}
          height="100%"
          preview={previewMode}
          fullscreen={fullscreen && !zen}
          visibleDragbar={false}
          textareaProps={{ spellCheck: true }}
          extraCommands={
            templates.length > 0 ? [imageCommand, templateCommand] : [imageCommand]
          }
          components={{ preview: (source) => <MarkdownView source={source} /> }}
          style={{ borderRadius: 0 }}
          onPaste={(e) => {
            const files = e.clipboardData?.files;
            if (files?.length) {
              e.preventDefault();
              void insertImages(files, caretPos(e.target));
              return;
            }
            // Paste a URL over selected text → wrap it as a markdown link.
            const text = e.clipboardData?.getData("text/plain").trim();
            const ta = e.target as HTMLElement;
            if (
              text &&
              /^https?:\/\/\S+$/.test(text) &&
              ta instanceof HTMLTextAreaElement &&
              ta.selectionStart !== ta.selectionEnd
            ) {
              e.preventDefault();
              runEditAt(ta.selectionStart, ta.selectionEnd, (sel) => ({
                text: `[${sel}](${text})`,
              }));
            }
          }}
          onDrop={(e) => {
            const files = e.dataTransfer?.files;
            if (files?.length) {
              e.preventDefault();
              void insertImages(files, caretPos(e.target));
            }
          }}
        />
        </Suspense>
        {previewMode === "live" && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize editor and preview"
            onPointerDown={startSplitDrag}
            onDoubleClick={() => setSplit(50)}
            title="Drag to resize · double-click to reset"
            className="absolute bottom-0 top-9 z-10 -ml-1 w-2 cursor-col-resize before:absolute before:inset-y-0 before:left-1/2 before:w-px before:bg-ink-line hover:before:bg-ink-accent before:transition-colors"
            style={{ left: `${split}%` }}
          />
        )}
      </div>

      {/* Split-ratio override + the editor's shared popup/hover transitions. */}
      <style>{`
        .kb-live-split .w-md-editor-input { width: var(--kb-split) !important; }
        .kb-live-split .w-md-editor-preview { width: calc(100% - var(--kb-split)) !important; }
        @keyframes kbPop { from { opacity: 0; transform: scale(.97) translateY(-3px); } to { opacity: 1; transform: none; } }
        @keyframes kbFade { from { opacity: 0; } to { opacity: 1; } }
        .kb-pop { animation: kbPop .13s cubic-bezier(.2,.8,.3,1); transform-origin: top; }
        .kb-fade { animation: kbFade .16s ease-out; }
        @media (prefers-reduced-motion: reduce) {
          .kb-pop, .kb-fade { animation: none; }
        }
      `}</style>

      {/* Custom right-click menu for the editor. */}
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          onClose={() => setCtxMenu(null)}
          items={[
            {
              label: "Cut",
              icon: <FaScissors />,
              shortcut: "⌘X",
              disabled: ctxMenu.start === ctxMenu.end,
              onClick: () => void copySelection(true),
            },
            {
              label: "Copy",
              icon: <FaCopy />,
              shortcut: "⌘C",
              disabled: ctxMenu.start === ctxMenu.end,
              onClick: () => void copySelection(false),
            },
            { divider: true },
            {
              label: "Bold",
              icon: <FaBold />,
              shortcut: "⌘B",
              onClick: () => wrapSelection("**"),
            },
            {
              label: "Italic",
              icon: <FaItalic />,
              shortcut: "⌘I",
              onClick: () => wrapSelection("*"),
            },
            {
              label: "Strikethrough",
              icon: <FaStrikethrough />,
              onClick: () => wrapSelection("~~"),
            },
            {
              label: "Inline code",
              icon: <FaCode />,
              onClick: () => wrapSelection("`"),
            },
            {
              label: "Link",
              icon: <FaLink />,
              shortcut: "⌘K",
              onClick: () => insertLink(),
            },
            { divider: true },
            {
              label: "Insert image / video",
              icon: <FaPhotoFilm />,
              onClick: () => {
                pendingPos.current = { start: ctxMenu.start, end: ctxMenu.end };
                setCtxMenu(null);
                fileInputRef.current?.click();
              },
            },
            ...(templates.length > 0
              ? [
                  {
                    label: "Insert template",
                    icon: <FaShapes />,
                    onClick: () => {
                      pendingPos.current = {
                        start: ctxMenu.start,
                        end: ctxMenu.end,
                      };
                      setCtxMenu(null);
                      setTemplatePicker(true);
                    },
                  },
                ]
              : []),
          ]}
        />
      )}

      {/* Slash command menu, anchored at the caret. */}
      {slash && slashFiltered.length > 0 && (
        <SlashMenu
          x={slash.x}
          y={slash.y}
          items={slashFiltered}
          activeIndex={slash.index}
          onChoose={chooseSlash}
          onClose={() => setSlash(null)}
        />
      )}

      <ToastHost toasts={toasts} onDismiss={dismissToast} />

      {/* Unsaved-changes confirm (custom popup, replaces window.confirm). */}
      {blocker.state === "blocked" && (
        <ConfirmDialog
          title="Unsaved changes"
          message="You have unsaved changes. Leave this page without saving?"
          confirmLabel="Leave"
          cancelLabel="Stay"
          danger
          onConfirm={() => blocker.proceed()}
          onCancel={() => blocker.reset()}
        />
      )}

      {templatePicker && (
        <TemplatePickerModal
          templates={templates}
          onPick={insertTemplate}
          onClose={() => setTemplatePicker(false)}
        />
      )}
    </div>
  );
}
