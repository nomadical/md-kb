import { Fragment } from "react";
import { splitHighlight } from "@/lib/highlight";

/** Renders `text` with every case-insensitive occurrence of `query` wrapped in
 *  a subtle <mark>. With no query it renders the text unchanged. */
export default function Highlight({
  text,
  query,
}: {
  text: string;
  query: string;
}) {
  return (
    <>
      {splitHighlight(text, query).map((seg, i) =>
        seg.match ? (
          <mark
            key={i}
            className="rounded-[3px] bg-ink-accent/20 px-0.5 text-inherit"
          >
            {seg.text}
          </mark>
        ) : (
          <Fragment key={i}>{seg.text}</Fragment>
        ),
      )}
    </>
  );
}
