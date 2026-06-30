import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSettings } from "@/spa/data/settings";
import Link from "@/components/ui/AppLink";
import { FaMagnifyingGlass, FaWandMagicSparkles } from "react-icons/fa6";
import { createClient } from "@/lib/supabase/client";
import { normalizeLanguage, type ArticleMeta } from "@/lib/types";
import AccessBadges from "@/components/AccessBadges";
import AskResult, { type AskResult as AskResultData } from "@/components/AskResult";
import { useSearchParams } from "@/components/ui/navigation";
import { BASE_PATH as BP } from "@/lib/config";

type Mode = "search" | "ai";
type RecentView = "updated" | "searched";

const RECENT_KEY = "kb:recent-searches";
const RECENT_MAX = 8;

function loadRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function pushRecentSearch(term: string): string[] {
  const clean = term.trim();
  if (!clean) return loadRecentSearches();
  const next = [
    clean,
    ...loadRecentSearches().filter((x) => x.toLowerCase() !== clean.toLowerCase()),
  ].slice(0, RECENT_MAX);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* storage may be unavailable (private mode) — degrade silently */
  }
  return next;
}

/** Segmented-toggle button styling, shared by the mode + recent-view switches. */
const tabBtn = (active: boolean) =>
  `flex items-center gap-1.5 rounded-md px-3 py-1 transition-colors ${
    active ? "bg-ink-accent text-white shadow-sm" : "text-ink-mut hover:text-ink-accent"
  }`;

/** Fire-and-forget beacon recording which result a user opened from a search. */
function logSearchClick(query: string, articleId: string) {
  try {
    const blob = new Blob([JSON.stringify({ query, articleId })], {
      type: "application/json",
    });
    navigator.sendBeacon(`${BP}/api/search`, blob);
  } catch {
    /* best-effort analytics */
  }
}

/** Home hero + inline search. A switch flips the single field between keyword
 *  search (filters the article list below) and AI ("Ask the KB", answered
 *  inline). When the search field is empty the section below offers a choice of
 *  recently-updated articles or the visitor's recent searches. */
export default function HomeSearch({
  articles,
  recent,
}: {
  articles: ArticleMeta[];
  recent: ArticleMeta[];
}) {
  const { t, i18n } = useTranslation();
  const { askAiEnabled, searchLogging, tagline } = useSettings();
  const params = useSearchParams();
  const [mode, setMode] = useState<Mode>(
    askAiEnabled && params.get("ai") === "1" ? "ai" : "search",
  );
  const [q, setQ] = useState("");
  const [view, setView] = useState<RecentView>("updated");
  const [recentSearches, setRecentSearches] = useState<string[]>(loadRecentSearches);

  // AI ask state.
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<AskResultData | null>(null);

  const needle = q.trim().toLowerCase();

  const results = useMemo(() => {
    if (!needle) return [];
    return articles
      .map((a) => {
        const title = a.title.toLowerCase();
        let score = 0;
        if (title.startsWith(needle)) score = 3;
        else if (title.includes(needle)) score = 2;
        else if (
          a.folder.toLowerCase().includes(needle) ||
          a.tags.some((tag) => tag.toLowerCase().includes(needle))
        )
          score = 1;
        return { a, score };
      })
      .filter((r) => r.score > 0)
      .sort((x, y) => y.score - x.score || x.a.title.localeCompare(y.a.title))
      .map((r) => r.a);
  }, [articles, needle]);

  // Log the settled query once (captures zero-result searches too) and record
  // it in the visitor's recent searches. Only in keyword mode — AI questions
  // are not searches.
  const loggedRef = useRef<string>("");
  useEffect(() => {
    if (mode !== "search" || needle.length < 3 || loggedRef.current === needle)
      return;
    const term = q.trim();
    const handle = setTimeout(() => {
      loggedRef.current = needle;
      setRecentSearches(pushRecentSearch(term));
      // `.then()` forces the (otherwise lazy) PostgREST builder to execute.
      if (searchLogging)
        void createClient()
          .from("search_queries")
          .insert({ query: needle, result_count: results.length })
          .then(() => {});
    }, 600);
    return () => clearTimeout(handle);
  }, [mode, needle, q, results.length, searchLogging]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (mode !== "ai") return;
    const question = q.trim();
    if (question.length < 3) return;
    setAsking(true);
    setAnswer(null);
    try {
      const r = await fetch(`${BP}/api/ask`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          question,
          lang: normalizeLanguage(i18n.resolvedLanguage ?? i18n.language),
        }),
      });
      setAnswer(await r.json());
    } catch {
      setAnswer({
        answer: null,
        sources: [],
        grounded: false,
        error: t("ask.requestFailed"),
      });
    } finally {
      setAsking(false);
    }
  }

  function selectMode(next: Mode) {
    setMode(next);
    if (next === "search") setAnswer(null);
  }

  const SearchIcon = mode === "ai" ? FaWandMagicSparkles : FaMagnifyingGlass;

  const articleGrid = (list: ArticleMeta[]) => (
    <ul className="mt-3 grid gap-3 sm:grid-cols-2">
      {list.map((a) => (
        <li key={a.id}>
          <Link
            href={`/kb/${a.slug}`}
            onClick={() => {
              if (needle) logSearchClick(needle, a.id);
            }}
            className="block rounded-xl border border-ink-line bg-ink-panel p-4 transition-all hover:-translate-y-0.5 hover:border-ink-accent hover:shadow-sm"
          >
            <div className="font-medium">{a.title}</div>
            {a.folder && (
              <div className="mt-1 text-[12px] text-ink-mut">{a.folder}</div>
            )}
            <div className="mt-2">
              <AccessBadges roles={a.access_roles} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      {/* hero */}
      <section className="rounded-2xl bg-gradient-to-b from-ink-accent/[0.08] to-transparent px-6 pb-10 pt-12 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          {t("home.heroTitle")}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-[15px] text-ink-mut">
          {tagline || t("home.heroSubtitle", { count: articles.length })}
        </p>

        <form onSubmit={onSubmit} className="mx-auto mt-6 flex w-full max-w-xl gap-2">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-mut" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={
                mode === "ai" ? t("ask.placeholder") : t("home.searchPlaceholder")
              }
              className="w-full rounded-xl border border-ink-line bg-white py-3.5 pl-11 pr-4 text-[15px] shadow-sm outline-none transition-shadow focus:border-ink-accent focus:shadow-md"
            />
          </div>
          {mode === "ai" && (
            <button
              type="submit"
              disabled={asking || q.trim().length < 3}
              className="shrink-0 rounded-xl bg-ink-accent px-5 text-sm font-medium text-white hover:bg-ink-accentHover disabled:opacity-60"
            >
              {asking ? t("ask.thinking") : t("ask.ask")}
            </button>
          )}
        </form>

        {/* search ↔ AI switch */}
        {askAiEnabled && (
        <div className="mt-3 flex justify-center">
          <div
            role="group"
            aria-label={t("home.modeLabel")}
            className="inline-flex rounded-lg border border-ink-line bg-ink-bg p-0.5 text-[12px] font-medium"
          >
            <button
              type="button"
              onClick={() => selectMode("search")}
              aria-pressed={mode === "search"}
              className={tabBtn(mode === "search")}
            >
              <FaMagnifyingGlass className="text-[11px]" /> {t("home.searchTab")}
            </button>
            <button
              type="button"
              onClick={() => selectMode("ai")}
              aria-pressed={mode === "ai"}
              className={tabBtn(mode === "ai")}
            >
              <FaWandMagicSparkles className="text-[11px]" /> {t("home.askTab")}
            </button>
          </div>
        </div>
        )}
      </section>

      {/* AI answer */}
      {mode === "ai" ? (
        <section className="mx-auto mt-8 max-w-xl">
          {!answer && !asking && (
            <p className="text-center text-[13px] text-ink-mut">
              {t("home.askHint")}
            </p>
          )}
          <AskResult result={answer} loading={asking} />
        </section>
      ) : (
        /* keyword results / recently-updated / recently-searched */
        <section className="mt-10">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-mut">
              {needle
                ? t("home.resultsFor", { count: results.length, query: q.trim() })
                : view === "updated"
                  ? t("home.recentlyUpdated")
                  : t("home.recentlySearched")}
            </h2>
            {!needle && (
              <div
                role="group"
                aria-label={t("home.recentViewLabel")}
                className="inline-flex shrink-0 rounded-md border border-ink-line bg-ink-bg p-0.5 text-[11px] font-medium"
              >
                <button
                  type="button"
                  onClick={() => setView("updated")}
                  aria-pressed={view === "updated"}
                  className={tabBtn(view === "updated")}
                >
                  {t("home.recentlyUpdated")}
                </button>
                <button
                  type="button"
                  onClick={() => setView("searched")}
                  aria-pressed={view === "searched"}
                  className={tabBtn(view === "searched")}
                >
                  {t("home.recentlySearched")}
                </button>
              </div>
            )}
          </div>

          {needle ? (
            results.length === 0 ? (
              <div className="mt-3 rounded-lg border border-dashed border-ink-line p-8 text-center text-ink-mut">
                {t("home.noMatches", { query: q.trim() })}
              </div>
            ) : (
              articleGrid(results)
            )
          ) : view === "updated" ? (
            recent.length === 0 ? (
              <div className="mt-3 rounded-lg border border-dashed border-ink-line p-8 text-center text-ink-mut">
                {t("home.nothingPublished")}
              </div>
            ) : (
              articleGrid(recent)
            )
          ) : recentSearches.length === 0 ? (
            <div className="mt-3 rounded-lg border border-dashed border-ink-line p-8 text-center text-ink-mut">
              {t("home.noRecentSearches")}
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {recentSearches.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => {
                    selectMode("search");
                    setQ(term);
                  }}
                  className="flex items-center gap-1.5 rounded-full border border-ink-line bg-ink-panel px-3 py-1.5 text-[13px] text-ink-mut transition-colors hover:border-ink-accent hover:text-ink-accent"
                >
                  <FaMagnifyingGlass className="text-[11px]" />
                  {term}
                </button>
              ))}
            </div>
          )}
        </section>
      )}
    </>
  );
}
