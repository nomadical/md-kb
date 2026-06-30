import { useEffect, useState } from "react";

type Heading = { id: string; text: string; level: number };

/**
 * "On this page" rail: reads h2/h3 from the rendered article (the markdown
 * renderer already assigns ids), highlights the section in view (scrollspy).
 */
export default function ArticleToc({ containerId }: { containerId: string }) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const els = [
      ...container.querySelectorAll<HTMLElement>("h2[id], h3[id], h4[id]"),
    ];
    setHeadings(
      els.map((el) => ({
        id: el.id,
        text: el.textContent?.replace(/^#/, "").trim() ?? "",
        level: el.tagName === "H2" ? 2 : 3,
      })),
    );

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [containerId]);

  if (headings.length < 2) return null;

  return (
    <nav aria-label="On this page" className="text-[13px]">
      <p className="mb-2 font-semibold uppercase tracking-wide text-ink-mut text-[11px]">
        On this page
      </p>
      <ul className="space-y-1 border-l border-ink-line">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              className={`block border-l-2 py-0.5 transition-colors ${
                h.level === 3 ? "pl-6" : "pl-3"
              } ${
                active === h.id
                  ? "-ml-px border-ink-accent font-medium text-ink-accent"
                  : "-ml-px border-transparent text-ink-mut hover:text-ink-fg"
              }`}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
