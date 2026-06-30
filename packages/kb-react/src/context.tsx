import { createContext, useContext, useMemo, type ReactNode } from "react";
import { createKbClient, type KbClient, type KbClientConfig } from "./client";

type KbContextValue = {
  client: KbClient;
  /** Absolute KB origin for resolving `/kb-images/...` and internal links. */
  baseUrl: string;
  /** Host SPA navigation for internal `/kb/<slug>` links + result clicks. */
  onNavigate?: (slug: string) => void;
};

const KbContext = createContext<KbContextValue | null>(null);

export type KbProviderProps = {
  /** Pass a prebuilt client, or `config` to have one created. */
  client?: KbClient;
  config?: KbClientConfig;
  baseUrl?: string;
  onNavigate?: (slug: string) => void;
  children: ReactNode;
};

export function KbProvider({
  client,
  config,
  baseUrl = "",
  onNavigate,
  children,
}: KbProviderProps) {
  const value = useMemo<KbContextValue>(() => {
    const c = client ?? createKbClient(config!);
    return { client: c, baseUrl, onNavigate };
  }, [client, config, baseUrl, onNavigate]);

  if (!client && !config)
    throw new Error("KbProvider requires either `client` or `config`.");

  return <KbContext.Provider value={value}>{children}</KbContext.Provider>;
}

export function useKb(): KbContextValue {
  const ctx = useContext(KbContext);
  if (!ctx) throw new Error("useKb must be used within a <KbProvider>.");
  return ctx;
}
