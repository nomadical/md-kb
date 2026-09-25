// A stand-in for the Supabase browser client in the static demo. It covers the
// slice of the PostgREST query builder and auth API the SPA uses, over the
// in-memory tables in ./db. It is not a general mock: when the app starts
// calling something new, add it here.

import type { SupabaseClient } from "@supabase/supabase-js";
import { DEMO_EMAIL, DEMO_USER_ID, now, save, table, uuid, type Row } from "./db";

type Result = {
  data: unknown;
  error: null | { message: string; code?: string };
};
type Pred = (r: Row) => boolean;

const SESSION = {
  access_token: "demo",
  refresh_token: "demo",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600 * 24 * 365,
  user: {
    id: DEMO_USER_ID,
    email: DEMO_EMAIL,
    aud: "authenticated",
    role: "authenticated",
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
  },
};

function project(row: Row, columns: string): Row {
  if (!columns || columns.trim() === "*") return { ...row };
  const out: Row = {};
  for (const c of columns
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean))
    out[c] = row[c];
  return out;
}

class Query implements PromiseLike<Result> {
  private preds: Pred[] = [];
  private sorts: { col: string; asc: boolean }[] = [];
  private max: number | undefined;
  private columns: string | null = null;
  private mode: "select" | "insert" | "update" | "upsert" | "delete" = "select";
  private payload: Row[] = [];
  private patch: Row = {};
  private conflict: string[] = [];
  private pick: "one" | "maybe" | null = null;

  constructor(private readonly name: string) {}

  select(columns = "*") {
    this.columns = columns;
    return this;
  }
  insert(rows: Row | Row[]) {
    this.mode = "insert";
    this.payload = Array.isArray(rows) ? rows : [rows];
    return this;
  }
  upsert(rows: Row | Row[], opts?: { onConflict?: string }) {
    this.mode = "upsert";
    this.payload = Array.isArray(rows) ? rows : [rows];
    this.conflict = (opts?.onConflict ?? "id").split(",").map((s) => s.trim());
    return this;
  }
  update(patch: Row) {
    this.mode = "update";
    this.patch = patch;
    return this;
  }
  delete() {
    this.mode = "delete";
    return this;
  }

  eq(col: string, v: unknown) {
    this.preds.push((r) => r[col] === v);
    return this;
  }
  neq(col: string, v: unknown) {
    this.preds.push((r) => r[col] !== v);
    return this;
  }
  is(col: string, v: unknown) {
    this.preds.push((r) => (v === null ? r[col] == null : r[col] === v));
    return this;
  }
  in(col: string, vs: unknown[]) {
    this.preds.push((r) => vs.includes(r[col]));
    return this;
  }
  not(col: string, op: string, v: unknown) {
    if (op === "is" && v === null) this.preds.push((r) => r[col] != null);
    else this.preds.push((r) => r[col] !== v);
    return this;
  }
  contains(col: string, vs: unknown[]) {
    this.preds.push((r) =>
      vs.every((v) => ((r[col] as unknown[]) ?? []).includes(v)),
    );
    return this;
  }
  match(obj: Row) {
    for (const [k, v] of Object.entries(obj)) this.eq(k, v);
    return this;
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.sorts.push({ col, asc: opts?.ascending ?? true });
    return this;
  }
  limit(n: number) {
    this.max = n;
    return this;
  }
  maybeSingle() {
    this.pick = "maybe";
    return this;
  }
  single() {
    this.pick = "one";
    return this;
  }

  private run(): Result {
    const rows = table(this.name);
    const hit = (r: Row) => this.preds.every((p) => p(r));
    let out: Row[];

    switch (this.mode) {
      case "insert":
        out = this.payload.map((p) => ({
          id: uuid(),
          created_at: now(),
          ...p,
        }));
        rows.push(...out);
        break;
      case "upsert":
        out = this.payload.map((p) => {
          const existing = rows.find((r) =>
            this.conflict.every((k) => r[k] === p[k]),
          );
          if (existing)
            return Object.assign(existing, p, { updated_at: now() });
          const row = {
            id: uuid(),
            created_at: now(),
            updated_at: now(),
            ...p,
          };
          rows.push(row);
          return row;
        });
        break;
      case "update":
        out = rows.filter(hit);
        for (const r of out)
          Object.assign(r, this.patch, { updated_at: now() });
        break;
      case "delete":
        out = rows.filter(hit);
        for (const r of out) rows.splice(rows.indexOf(r), 1);
        break;
      default:
        out = rows.filter(hit);
    }

    if (this.mode !== "select") save();

    if (this.mode === "select") {
      for (const { col, asc } of this.sorts.toReversed())
        out = [...out].sort((a, b) => {
          const x = a[col] as string | number;
          const y = b[col] as string | number;
          return (x < y ? -1 : x > y ? 1 : 0) * (asc ? 1 : -1);
        });
      if (this.max !== undefined) out = out.slice(0, this.max);
    } else if (this.columns === null) {
      return { data: null, error: null };
    }

    const data = out.map((r) => project(r, this.columns ?? "*"));
    if (this.pick === "maybe") return { data: data[0] ?? null, error: null };
    if (this.pick === "one")
      return data.length === 1
        ? { data: data[0], error: null }
        : { data: null, error: { message: "Row not found", code: "PGRST116" } };
    return { data, error: null };
  }

  // The builder is awaitable, exactly like supabase-js: `await from(t).select()`.
  // oxlint-disable-next-line unicorn/no-thenable
  then<A = Result, B = never>(
    ok?: ((v: Result) => A | PromiseLike<A>) | null,
    fail?: ((e: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    return Promise.resolve()
      .then(() => this.run())
      .then(ok, fail);
  }
}

// ---- RPCs ----

/** Typo-tolerant title/body search, standing in for pg_trgm + FTS. */
function searchArticles({
  query_text,
  match_count = 8,
}: {
  query_text: string;
  match_count?: number;
}) {
  const q = query_text.trim().toLowerCase();
  const words = q.split(/\s+/).filter(Boolean);
  const fuzzy = (hay: string, w: string) => {
    if (hay.includes(w)) return true;
    // one dropped or swapped letter still matches (wikilnks → wikilinks)
    return hay
      .split(/[^a-z0-9]+/)
      .some((t) => Math.abs(t.length - w.length) <= 1 && distance(t, w) <= 1);
  };
  return table("articles")
    .filter((a) => a.published && a.deleted_at == null)
    .map((a) => {
      const title = String(a.title).toLowerCase();
      const body =
        `${a.content} ${(a.tags as string[]).join(" ")}`.toLowerCase();
      const rank = words.reduce(
        (s, w) => s + (fuzzy(title, w) ? 3 : 0) + (fuzzy(body, w) ? 1 : 0),
        0,
      );
      return { a, rank };
    })
    .filter((x) => x.rank > 0)
    .sort((x, y) => y.rank - x.rank)
    .slice(0, match_count)
    .map(({ a }) =>
      project(a, "id,slug,title,folder,tags,access_roles,published,updated_at"),
    );
}

function distance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [
    i,
    ...Array(b.length).fill(0),
  ]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
  return d[a.length][b.length];
}

/** Get-or-create the caller's private draft of an article (fork-on-edit). */
export function forkDraft(articleId: string): Row | null {
  const drafts = table("article_drafts");
  const mine = drafts.find(
    (d) => d.article_id === articleId && d.author_id === DEMO_USER_ID,
  );
  if (mine) return mine;
  const a = table("articles").find((x) => x.id === articleId);
  if (!a) return null;
  const draft: Row = {
    id: uuid(),
    article_id: a.id,
    author_id: DEMO_USER_ID,
    language: "en",
    title: a.title,
    slug: a.slug,
    folder: a.folder,
    content: a.content,
    tags: [...(a.tags as string[])],
    access_roles: [...(a.access_roles as string[])],
    context_keys: [...(a.context_keys as string[])],
    status: "draft",
    review_note: null,
    base_revision:
      table("article_revisions").filter((r) => r.article_id === a.id).length ||
      null,
    submitted_at: null,
    created_at: now(),
    updated_at: now(),
  };
  drafts.push(draft);
  save();
  return draft;
}

const RPCS: Record<string, (args: Record<string, unknown>) => unknown> = {
  search_articles: (args) =>
    searchArticles(args as { query_text: string; match_count?: number }),
  fork_draft: (args) => forkDraft(args.p_article_id as string),
};

// ---- auth ----

type Listener = (event: string, session: typeof SESSION | null) => void;
let session: typeof SESSION | null = SESSION;
const listeners = new Set<Listener>();
const emit = (event: string) => listeners.forEach((l) => l(event, session));
const signIn = async () => {
  session = SESSION;
  emit("SIGNED_IN");
  return { data: { session, user: session.user }, error: null };
};

const auth = {
  getSession: async () => ({ data: { session }, error: null }),
  getUser: async () => ({ data: { user: session?.user ?? null }, error: null }),
  onAuthStateChange(cb: Listener) {
    listeners.add(cb);
    return {
      data: { subscription: { unsubscribe: () => listeners.delete(cb) } },
    };
  },
  signOut: async () => {
    session = null;
    emit("SIGNED_OUT");
    return { error: null };
  },
  // Any credentials sign you back in as the demo admin.
  signInWithPassword: signIn,
  signUp: signIn,
  signInWithOtp: signIn,
  signInWithOAuth: signIn,
  exchangeCodeForSession: signIn,
};

export function createDemoClient(): SupabaseClient {
  return {
    from: (name: string) => new Query(name),
    rpc: async (name: string, args: Record<string, unknown> = {}) => {
      const fn = RPCS[name];
      return fn
        ? { data: fn(args), error: null }
        : {
            data: null,
            error: { message: `${name} is not available in the demo.` },
          };
    },
    auth,
  } as unknown as SupabaseClient;
}
