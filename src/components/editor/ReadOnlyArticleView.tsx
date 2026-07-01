import { useState } from "react";
import type { Article } from "@/lib/types";
import MarkdownView from "@/components/MarkdownView";
import DiffView from "@/components/DiffView";
import AccessBadges from "@/components/AccessBadges";
import ReviewControls from "@/components/editor/ReviewControls";
import DraftControls from "@/components/editor/DraftControls";
import LanguageVersionPicker, {
  type LanguageVersion,
} from "@/components/editor/LanguageVersionPicker";

/** The read-only editor surface shown to reviewers/viewers (canEdit === false):
 *  header + metadata + either the rendered article or the review diff. */
export default function ReadOnlyArticleView({
  article,
  language,
  languageVersions,
  onLanguageSelect,
  isTranslation,
  articleDraftId,
  draftStatus,
  canReview,
  reviewDiffBase,
  reviewing,
}: {
  article: Article;
  language: string;
  languageVersions: LanguageVersion[];
  /** Defined only when language switching is enabled (renders the picker). */
  onLanguageSelect?: (language: string) => void;
  isTranslation: boolean;
  articleDraftId?: string;
  draftStatus?: "draft" | "in_review";
  canReview: boolean;
  reviewDiffBase: string | null;
  reviewing: boolean;
}) {
  // Reviewer's read-only view: show the diff-since-last-published first.
  const [showDiff, setShowDiff] = useState(true);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-ink-line bg-ink-panel px-4 py-2">
        <h1 className="min-w-40 flex-1 truncate text-[15px] font-semibold">
          {article.title}
        </h1>
        {onLanguageSelect && (
          <LanguageVersionPicker
            language={language}
            versions={languageVersions}
            onSelect={onLanguageSelect}
          />
        )}
        {isTranslation || !articleDraftId ? (
          <ReviewControls
            articleId={article.id}
            slug={article.slug}
            initialStatus={article.status}
            initialNote={article.review_note}
            canEdit={false}
            canReview={canReview}
            language={language}
          />
        ) : (
          <DraftControls
            draftId={articleDraftId}
            status={draftStatus ?? (article.status === "in_review" ? "in_review" : "draft")}
            published={article.published}
            slug={article.slug}
            reviewNote={article.review_note}
            canEdit={false}
            canReview={canReview}
            reviewing={reviewing}
          />
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3 border-b border-ink-line px-4 py-2 text-[12px] text-ink-mut">
        <span>{article.folder || "(root)"}</span>
        {article.tags.length > 0 && <span>#{article.tags.join(" #")}</span>}
        <AccessBadges roles={article.access_roles} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
        {canReview && article.status === "in_review" && reviewDiffBase != null ? (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setShowDiff((v) => !v)}
              className="rounded border border-ink-line px-2 py-0.5 text-[12px] text-ink-mut hover:border-ink-accent hover:text-ink-accent"
            >
              {showDiff ? "View rendered article" : "View changes"}
            </button>
            {showDiff ? (
              <DiffView base={reviewDiffBase} next={article.content} />
            ) : (
              <MarkdownView source={article.content} />
            )}
          </div>
        ) : (
          <MarkdownView source={article.content} />
        )}
      </div>
    </div>
  );
}
