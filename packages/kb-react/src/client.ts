import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { extractKeycloakRoles } from "./keycloakRoles";
import { ARTICLE_LIST_COLUMNS, type Article, type ArticleMeta } from "./types";

export type KbClientConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  /**
   * Returns the host's current Keycloak token. Only used to mirror entitlement
   * roles into the KB profile (sync_my_access_roles) so access_roles RLS matches
   * what the user may read. Auth itself is the Supabase session below — return
   * null/undefined if unavailable; role sync is then skipped (best-effort).
   */
  getKeycloakToken?: () =>
    | string
    | null
    | undefined
    | Promise<string | null | undefined>;
  /**
   * Where Keycloak returns to after the (silent, SSO) sign-in redirect. Must be
   * a same-origin URL where a KbProvider mounts so supabase-js can exchange the
   * `?code` on return. Defaults to the current page (window.location.href).
   */
  redirectTo?: string;
};

export type KbClient = {
  supabase: SupabaseClient;
  /** Ensure a Supabase session (Keycloak bridge) + entitlement sync. Idempotent. */
  ready: () => Promise<void>;
  listArticles: () => Promise<ArticleMeta[]>;
  listFolders: () => Promise<string[]>;
  getArticleBySlug: (slug: string) => Promise<Article | null>;
  searchArticles: (query: string) => Promise<ArticleMeta[]>;
  /** Published articles tagged with any of the given context keys (RLS-scoped). */
  relatedArticles: (contextKeys: string[], limit?: number) => Promise<ArticleMeta[]>;
};

export function createKbClient(config: KbClientConfig): KbClient {
  const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      flowType: "pkce",
      persistSession: true,
      autoRefreshToken: true,
      // On return from the Keycloak redirect, auto-exchange the `?code` in the
      // URL for a session (no host callback page needed).
      detectSessionInUrl: true,
      storageKey: "kb-react-auth",
    },
  });

  let readyPromise: Promise<void> | null = null;
  async function doReady() {
    // Establish a Supabase session via the Keycloak OAuth provider. The host is
    // already Keycloak-SSO'd, so this is a SILENT full-page redirect (no login
    // prompt) — replacing the old hidden-iframe/popup bridge that tripped on
    // frame-ancestors/CORS. On return, detectSessionInUrl exchanges the code.
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      await supabase.auth.signInWithOAuth({
        provider: "keycloak",
        options: {
          redirectTo: config.redirectTo ?? window.location.href,
          scopes: "openid profile email",
        },
      });
      return; // page navigates to Keycloak; resolves after the round-trip
    }

    // Signed in: mirror the host's Keycloak entitlement roles into the caller's
    // KB profile so access_roles RLS matches what they may read. Best-effort — a
    // sync hiccup must not block reading, so failures are swallowed.
    const token = await config.getKeycloakToken?.();
    const roles = extractKeycloakRoles(token);
    if (!roles.length) return;
    const { error } = await supabase.rpc("sync_my_access_roles", {
      new_roles: roles,
    });
    if (error) console.warn("[kb-react] entitlement sync failed:", error.message);
  }
  const ready = () => (readyPromise ??= doReady());

  // All queries force published + non-trashed so the embed never surfaces
  // drafts/trash even if the host user happens to be editorial staff.
  async function listArticles(): Promise<ArticleMeta[]> {
    await ready();
    const { data, error } = await supabase
      .from("articles")
      .select(ARTICLE_LIST_COLUMNS)
      .eq("published", true)
      .is("deleted_at", null)
      .order("folder", { ascending: true })
      .order("title", { ascending: true });
    if (error) throw error;
    return (data ?? []) as ArticleMeta[];
  }

  async function listFolders(): Promise<string[]> {
    const articles = await listArticles();
    return [...new Set(articles.map((a) => a.folder).filter(Boolean))].sort();
  }

  async function getArticleBySlug(slug: string): Promise<Article | null> {
    await ready();
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .eq("slug", slug)
      .eq("published", true)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    return (data as Article) ?? null;
  }

  async function searchArticles(query: string): Promise<ArticleMeta[]> {
    const q = query.trim();
    if (q.length < 2) return [];
    await ready();
    const { data, error } = await supabase
      .from("articles")
      .select(ARTICLE_LIST_COLUMNS)
      .eq("published", true)
      .is("deleted_at", null)
      .textSearch("search_tsv", q, { type: "websearch", config: "english" })
      .limit(20);
    if (error) throw error;
    return (data ?? []) as ArticleMeta[];
  }

  // Articles tagged with any of the given context keys — the host passes a
  // stable screen identifier (e.g. "intervention.shipment-detail") to surface
  // the docs relevant to where the widget is shown. RLS still applies.
  async function relatedArticles(
    contextKeys: string[],
    limit = 8,
  ): Promise<ArticleMeta[]> {
    const keys = contextKeys.filter(Boolean);
    if (keys.length === 0) return [];
    await ready();
    const { data, error } = await supabase
      .from("articles")
      .select(ARTICLE_LIST_COLUMNS)
      .eq("published", true)
      .is("deleted_at", null)
      .overlaps("context_keys", keys)
      .order("updated_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as ArticleMeta[];
  }

  return {
    supabase,
    ready,
    listArticles,
    listFolders,
    getArticleBySlug,
    searchArticles,
    relatedArticles,
  };
}
