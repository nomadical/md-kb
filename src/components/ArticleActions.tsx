import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FaRegCopy, FaDownload, FaCheck } from "react-icons/fa6";

const BTN =
  "inline-flex items-center gap-1.5 rounded-md border border-ink-line px-2 py-1 text-[12px] text-ink-mut transition-colors hover:border-ink-accent hover:text-ink-accent";

/** Reader actions: copy the article's markdown source, or download it as .md. */
export default function ArticleActions({
  slug,
  content,
}: {
  slug: string;
  content: string;
}) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — no-op */
    }
  }

  function download() {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug || "article"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <button type="button" onClick={copy} className={BTN}>
        {copied ? (
          <FaCheck className="text-emerald-600" />
        ) : (
          <FaRegCopy />
        )}
        {copied ? t("reader.copied") : t("reader.copyMarkdown")}
      </button>
      <button type="button" onClick={download} className={BTN}>
        <FaDownload /> {t("reader.download")}
      </button>
    </div>
  );
}
