import { defaultSchema } from "rehype-sanitize";

/**
 * rehype-sanitize schema extended to allow media embeds in article markdown:
 * <video>/<source> (uploaded clips) and <iframe> (YouTube/Vimeo etc.). Content
 * is authored only by editors and still sanitized (no scripts/event handlers),
 * with src limited to http(s).
 */
export const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), "video", "source", "iframe"],
  attributes: {
    ...defaultSchema.attributes,
    video: [
      "src",
      "controls",
      "width",
      "height",
      "poster",
      "loop",
      "muted",
      "autoplay",
      "playsinline",
      "preload",
      "style",
      "className",
    ],
    source: ["src", "type"],
    iframe: [
      "src",
      "width",
      "height",
      "title",
      "allow",
      "allowfullscreen",
      "frameborder",
      "loading",
      "referrerpolicy",
      "style",
      "className",
    ],
    img: [...((defaultSchema.attributes?.img as string[]) ?? []), "loading"],
  },
  protocols: {
    ...defaultSchema.protocols,
    src: ["http", "https"],
  },
};
