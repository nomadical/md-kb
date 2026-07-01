# Knowledge Base MCP Connector

A remote [MCP](https://modelcontextprotocol.io) server that lets **Claude** (via
a Claude.ai connector or Claude Code) search the KB and draft new articles. New
articles are always created as **drafts** — a human editor reviews and publishes
them through the normal mandatory-review gate; the connector can never publish
or expose content directly.

## Endpoint

Streamable-HTTP, served by the app at `${BASE_PATH}/api/mcp`:

```
https://<your-host><base-path>/api/mcp
```

(Local dev with the default base path: `http://localhost:8787/api/mcp`.)

## Tools

| Tool | Purpose |
| --- | --- |
| `search_kb_articles` | Full-text search over existing articles (incl. drafts) — call first to avoid duplicates. |
| `list_kb_folders` | Existing folder paths, to place a new article consistently. |
| `create_draft_article` | Create a draft (`title`, `content` markdown, optional `folder`, `tags`, `context_keys`). Returns the admin edit URL. |

## Auth

A static bearer token. Set a long random secret as `MCP_API_TOKEN` on the KB app
(server-only). Requests without `Authorization: Bearer <token>` get `401`; if the
var is unset the endpoint is closed.

The server writes with `SUPABASE_SERVICE_ROLE_KEY`, constrained in code to
`status='draft'`. Treat `MCP_API_TOKEN` as sensitive — it grants draft-create
and read access (including unpublished drafts).

## Connect from Claude

1. **Settings → Connectors → Add custom connector.**
2. URL: the endpoint above. Auth: **Bearer token** = your `MCP_API_TOKEN`.
3. In a chat, ask Claude to draft an article; it will `search_kb_articles`
   first, then `create_draft_article`, and return the review URL.
