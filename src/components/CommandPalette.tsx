import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "@/components/ui/navigation";
import { createClient } from "@/lib/supabase/client";
import { useCommands, type Command } from "@/lib/commands";
import { useSettings } from "@/spa/data/settings";
import { BASE_PATH } from "@/lib/config";
import { normalizeLanguage, type ArticleMeta, type Role } from "@/lib/types";

type Item =
  | { type: "command"; command: Command }
  | { type: "article"; article: ArticleMeta };

/**
 * ⌘K palette: runs commands (role-aware) and full-text searches articles
 * (RLS-scoped via PostgREST). Empty query shows all commands; typing filters
 * commands and adds article matches. Keyboard-navigable across both.
 */
export default function CommandPalette({ role = null }: { role?: Role | null }) {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { searchLogging } = useSettings();
  const commands = useCommands(role);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ArticleMeta[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const loggedRef = useRef<string>("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
    else {
      setQ("");
      setResults([]);
      setActive(0);
    }
  }, [open]);

  // Debounced article search (only when something is typed).
  useEffect(() => {
    const needle = q.trim();
    if (!needle) {
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      const supabase = createClient();
      // Typo-tolerant search: FTS + pg_trgm title similarity (RLS-scoped RPC).
      const { data } = await supabase.rpc("search_articles", {
        query_text: needle,
        match_count: 8,
        lang: normalizeLanguage(i18n.resolvedLanguage ?? i18n.language),
      });
      const rows = (data as ArticleMeta[]) ?? [];
      setResults(rows);
      setActive(0);
      setLoading(false);
      if (searchLogging && needle.length >= 3 && loggedRef.current !== needle.toLowerCase()) {
        loggedRef.current = needle.toLowerCase();
        void supabase
          .from("search_queries")
          .insert({ query: needle, result_count: rows.length })
          .then(() => {});
      }
    }, 400);
    return () => clearTimeout(t);
  }, [q, i18n.resolvedLanguage, i18n.language, searchLogging]);

  const needle = q.trim().toLowerCase();
  const cmdMatches = useMemo(
    () => (needle ? commands.filter((c) => c.title.toLowerCase().includes(needle)) : commands),
    [commands, needle],
  );

  const items: Item[] = useMemo(
    () => [
      ...cmdMatches.map((command) => ({ type: "command" as const, command })),
      ...results.map((article) => ({ type: "article" as const, article })),
    ],
    [cmdMatches, results],
  );

  const openArticle = useCallback(
    (a: ArticleMeta) => {
      try {
        const blob = new Blob([JSON.stringify({ query: q.trim(), articleId: a.id })], {
          type: "application/json",
        });
        navigator.sendBeacon(`${BASE_PATH}/api/search`, blob);
      } catch {
        /* best-effort analytics */
      }
      setOpen(false);
      router.push(`/kb/${a.slug}`);
    },
    [router, q],
  );

  const runItem = useCallback(
    (item: Item) => {
      if (item.type === "article") return openArticle(item.article);
      setOpen(false);
      item.command.run();
    },
    [openArticle],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]"
      onClick={() => setOpen(false)}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full max-w-xl overflow-hidden rounded-xl border border-ink-line bg-ink-panel shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => Math.min(i + 1, items.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter" && items[active]) {
              runItem(items[active]);
            }
          }}
          placeholder={t("common.commandPlaceholder")}
          className="w-full border-b border-ink-line px-5 py-4 text-[15px] outline-none"
        />
        <div className="max-h-80 overflow-y-auto">
          {cmdMatches.length > 0 && (
            <div className="px-5 pt-2 text-[11px] font-semibold uppercase tracking-wide text-ink-mut">
              Commands
            </div>
          )}
          {cmdMatches.map((c, i) => (
            <button
              key={c.id}
              onMouseEnter={() => setActive(i)}
              onClick={() => runItem({ type: "command", command: c })}
              className={`flex w-full items-center justify-between gap-3 px-5 py-2.5 text-left ${
                i === active ? "bg-ink-accent/10" : ""
              }`}
            >
              <span className="text-[14px]">{c.title}</span>
              {c.keys && <span className="text-[11px] text-ink-mut">{c.keys}</span>}
            </button>
          ))}

          {results.length > 0 && (
            <div className="px-5 pt-2 text-[11px] font-semibold uppercase tracking-wide text-ink-mut">
              Articles
            </div>
          )}
          {results.map((a, idx) => {
            const i = cmdMatches.length + idx;
            return (
              <button
                key={a.id}
                onMouseEnter={() => setActive(i)}
                onClick={() => openArticle(a)}
                className={`flex w-full items-center justify-between gap-3 px-5 py-3 text-left ${
                  i === active ? "bg-ink-accent/10" : ""
                }`}
              >
                <span>
                  <span className="block text-[14px] font-medium">{a.title}</span>
                  {a.folder && (
                    <span className="block text-[12px] text-ink-mut">{a.folder}</span>
                  )}
                </span>
                {i === active && <span className="text-[11px] text-ink-mut">↵</span>}
              </button>
            );
          })}

          {needle && !loading && items.length === 0 && (
            <p className="px-5 py-4 text-[14px] text-ink-mut">No matches for “{q.trim()}”.</p>
          )}
        </div>
        <div className="flex items-center gap-3 border-t border-ink-line px-5 py-2 text-[11px] text-ink-mut">
          <span>↑↓ navigate</span>
          <span>↵ run / open</span>
          <span>esc close</span>
          <span className="ml-auto">? shortcuts</span>
        </div>
      </div>
    </div>
  );
}
