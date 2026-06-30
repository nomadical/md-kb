import MarkdownPreview from "@uiw/react-markdown-preview";
import rehypeSanitize from "rehype-sanitize";
import rehypeRaw from "rehype-raw";
import { prefixContentUrls, transformWikilinks } from "@/lib/markdown";
import { sanitizeSchema } from "@/lib/sanitize";

/**
 * Read-only markdown renderer. Reuses the same preview engine the editor uses
 * (GFM + syntax highlighting) so the editor and public views match. rehype-raw
 * parses embedded HTML (<video>/<iframe>), then rehype-sanitize cleans it with
 * our media-aware allow-list. SSR-safe.
 */
export default function MarkdownView({ source }: { source: string }) {
  return (
    <div className="prose max-w-none">
      <MarkdownPreview
        source={prefixContentUrls(transformWikilinks(source || ""))}
        rehypePlugins={[[rehypeRaw], [rehypeSanitize, sanitizeSchema]]}
        style={{ background: "transparent", color: "inherit" }}
      />
    </div>
  );
}
