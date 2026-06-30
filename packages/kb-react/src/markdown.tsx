import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

// Media-aware sanitize schema (mirrors knowledge-base-app/src/components/
// MarkdownView): allow the <video>/<iframe> embeds the KB authors use, on top of
// the safe default. rehype-raw parses the raw HTML; rehype-sanitize then prunes
// anything not allow-listed here.
const schema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), "video", "source", "iframe"],
  attributes: {
    ...defaultSchema.attributes,
    video: ["src", "controls", "width", "height", "poster", "style"],
    source: ["src", "type"],
    iframe: [
      "src",
      "width",
      "height",
      "title",
      "allow",
      "allowfullscreen",
      "frameborder",
      "style",
    ],
    img: [...((defaultSchema.attributes?.img as string[]) ?? []), "style"],
  },
};

export type MarkdownViewProps = {
  source: string;
  /** Absolute KB origin (+ base path) used to resolve root-relative assets like `/kb-images/...`. */
  baseUrl?: string;
  /** Called when an internal `/kb/<slug>` link is clicked, so the host can SPA-navigate. */
  onNavigate?: (slug: string) => void;
};

const KB_LINK = /^\/kb\/([^/?#]+)/;

export default function MarkdownView({
  source,
  baseUrl = "",
  onNavigate,
}: MarkdownViewProps) {
  const abs = (url: string) =>
    url.startsWith("/") ? `${baseUrl.replace(/\/$/, "")}${url}` : url;

  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw, [rehypeSanitize, schema]]}
      components={{
        a({ href = "", children, ...props }) {
          const m = href.match(KB_LINK);
          if (m && onNavigate) {
            const slug = m[1];
            return (
              <a
                href={abs(href)}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(slug);
                }}
                {...props}
              >
                {children}
              </a>
            );
          }
          const external = /^https?:\/\//.test(href);
          return (
            <a
              href={abs(href)}
              {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
              {...props}
            >
              {children}
            </a>
          );
        },
        img({ src = "", ...props }) {
          return <img src={abs(String(src))} {...props} />;
        },
      }}
    >
      {source}
    </Markdown>
  );
}
