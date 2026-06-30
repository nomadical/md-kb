import { useEffect, useState } from "react";
import { FaArrowUp } from "react-icons/fa6";

/** "Back to top" pill that appears after scrolling ~1.5 screens. */
export default function BackToTop({ scrollTargetId }: { scrollTargetId: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = document.getElementById(scrollTargetId);
    if (!el) return;
    const onScroll = () => setShow(el.scrollTop > el.clientHeight * 1.5);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [scrollTargetId]);

  if (!show) return null;

  return (
    <button
      onClick={() => {
        document
          .getElementById(scrollTargetId)
          ?.scrollTo({ top: 0, behavior: "smooth" });
      }}
      aria-label="Back to top"
      className="fixed bottom-6 right-6 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-ink-line bg-ink-panel text-ink-mut shadow-md transition-all hover:-translate-y-0.5 hover:border-ink-accent hover:text-ink-accent"
    >
      <FaArrowUp />
    </button>
  );
}
