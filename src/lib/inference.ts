// Provider-agnostic inference for "Ask the KB". Targets any OpenAI-compatible
// endpoint — Azure AI Foundry (`/openai/v1`), Ollama (`/v1`), vLLM, LocalAI, or
// an internal SkyCell gateway. Configure via env:
//
//   EMBEDDINGS_URL   e.g. https://<resource>.openai.azure.com/openai/v1
//   EMBEDDINGS_MODEL e.g. text-embedding-3-large   (must yield 768 dims)
//   EMBEDDINGS_DIMENSIONS  e.g. 768  -> sent as `dimensions` (text-embedding-3-*
//                          supports Matryoshka truncation, keeping vector(768))
//
// Chat (LLM) — either the SkyCell Azure AI Foundry hub:
//   KB_AZURE_OPENAI=true
//   KB_AZURE_OPENAI_ENDPOINT=https://<resource>.openai.azure.com/openai/v1
//   KB_AZURE_OPENAI_KEY=...        (sent as the `api-key` header)
//   KB_AZURE_OPENAI_DEPLOYMENT=... (deployment/model name)
// …or a generic OpenAI-compatible endpoint:
//   LLM_URL          e.g. http://ollama:11434/v1
//   LLM_MODEL        e.g. llama3.1:8b
//   INFERENCE_API_KEY / INFERENCE_AUTH_STYLE ("bearer" default | "api-key")
//   KB_DEV_EMBEDDINGS=true  -> deterministic offline embeddings (DEV ONLY)
//
// The embedding column is vector(768); keep the model's dim at 768 (use
// EMBEDDINGS_DIMENSIONS) or change both (schema + re-embed).

export const EMBEDDING_DIM = 768;

const EMBEDDINGS_URL = process.env.EMBEDDINGS_URL;
const EMBEDDINGS_MODEL = process.env.EMBEDDINGS_MODEL ?? "nomic-embed-text";
const EMBEDDINGS_DIMENSIONS = process.env.EMBEDDINGS_DIMENSIONS
  ? Number(process.env.EMBEDDINGS_DIMENSIONS)
  : undefined;
const API_KEY = process.env.INFERENCE_API_KEY;
const AUTH_STYLE = process.env.INFERENCE_AUTH_STYLE ?? "bearer";
const DEV_EMBEDDINGS =
  process.env.KB_DEV_EMBEDDINGS === "true" &&
  process.env.NODE_ENV !== "production";

// Chat (LLM) target. The SkyCell Azure AI Foundry hub uses its own env scheme:
//   KB_AZURE_OPENAI=true              -> route chat to Foundry
//   KB_AZURE_OPENAI_ENDPOINT=.../openai/v1
//   KB_AZURE_OPENAI_KEY=...           (sent as the `api-key` header)
//   KB_AZURE_OPENAI_DEPLOYMENT=...    (the model/deployment name)
// Otherwise fall back to the generic OpenAI-compatible LLM_URL/LLM_MODEL
// (Ollama, a gateway, etc.). Embeddings are configured separately (EMBEDDINGS_*)
// since the Foundry hub serves chat only.
const AZURE_CHAT = process.env.KB_AZURE_OPENAI === "true";
const AZURE_ENDPOINT = process.env.KB_AZURE_OPENAI_ENDPOINT;
const AZURE_KEY = process.env.KB_AZURE_OPENAI_KEY;
const AZURE_DEPLOYMENT = process.env.KB_AZURE_OPENAI_DEPLOYMENT;

const LLM_URL = AZURE_CHAT ? AZURE_ENDPOINT : process.env.LLM_URL;
const LLM_MODEL = AZURE_CHAT
  ? (AZURE_DEPLOYMENT ?? "")
  : (process.env.LLM_MODEL ?? "llama3.1:8b");

/** Auth headers for embeddings (generic EMBEDDINGS_* endpoint). */
function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { "content-type": "application/json" };
  if (API_KEY) {
    // Azure key auth uses the `api-key` header; gateways/Entra use Bearer.
    if (AUTH_STYLE === "api-key") h["api-key"] = API_KEY;
    else h.authorization = `Bearer ${API_KEY}`;
  }
  return h;
}

/**
 * Deterministic, dependency-free embedding for offline dev/CI. Hashes tokens
 * into a fixed vector so the *plumbing* (chunk -> store -> vector match -> RLS)
 * is testable without a model. NOT semantic — gated behind KB_DEV_EMBEDDINGS
 * and disabled in production.
 */
function devEmbed(text: string): number[] {
  const v = Array.from<number>({ length: EMBEDDING_DIM }).fill(0);
  const tokens = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  for (const tok of tokens) {
    let h = 2166136261;
    for (let i = 0; i < tok.length; i++) {
      h ^= tok.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    v[Math.abs(h) % EMBEDDING_DIM] += 1;
  }
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / norm);
}

export function embeddingsConfigured(): boolean {
  return Boolean(EMBEDDINGS_URL) || DEV_EMBEDDINGS;
}

export function llmConfigured(): boolean {
  return AZURE_CHAT ? Boolean(AZURE_ENDPOINT && AZURE_DEPLOYMENT) : Boolean(LLM_URL);
}

/** Auth headers for the chat endpoint (Azure Foundry key, else gateway bearer). */
function chatAuthHeaders(): Record<string, string> {
  if (AZURE_CHAT) {
    return {
      "content-type": "application/json",
      ...(AZURE_KEY ? { "api-key": AZURE_KEY } : {}),
    };
  }
  return authHeaders();
}

/** Embed a batch of texts -> vectors (length EMBEDDING_DIM). */
export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  if (!EMBEDDINGS_URL) {
    if (DEV_EMBEDDINGS) return texts.map(devEmbed);
    throw new Error("EMBEDDINGS_URL is not configured");
  }
  const res = await fetch(`${EMBEDDINGS_URL.replace(/\/$/, "")}/embeddings`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      model: EMBEDDINGS_MODEL,
      input: texts,
      ...(EMBEDDINGS_DIMENSIONS ? { dimensions: EMBEDDINGS_DIMENSIONS } : {}),
    }),
  });
  if (!res.ok) throw new Error(`embeddings ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const vectors = (json.data as { embedding: number[] }[]).map((d) => d.embedding);
  // Guard against a model/dimensions mismatch with the vector(768) column.
  if (vectors[0] && vectors[0].length !== EMBEDDING_DIM) {
    throw new Error(
      `embeddings returned dim ${vectors[0].length}, expected ${EMBEDDING_DIM} ` +
        `(set EMBEDDINGS_DIMENSIONS=${EMBEDDING_DIM} for text-embedding-3-*)`,
    );
  }
  return vectors;
}

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

/** Chat completion. Returns null if no LLM is configured (caller degrades to
 *  a sources-only answer). */
export async function chat(messages: ChatMessage[]): Promise<string | null> {
  if (!LLM_URL) return null;
  const res = await fetch(`${LLM_URL.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: chatAuthHeaders(),
    body: JSON.stringify({ model: LLM_MODEL, messages, temperature: 0.2, stream: false }),
  });
  if (!res.ok) throw new Error(`chat ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? null;
}
