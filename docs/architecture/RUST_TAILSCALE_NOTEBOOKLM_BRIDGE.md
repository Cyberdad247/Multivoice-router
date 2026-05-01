# Rust Tailscale NotebookLM Bridge

Multivoice Router | Camelot-OS | Tailscale | NotebookLM Cloud Brain

## Purpose

Wrap NotebookLM Cloud Brain behind a private Rust bridge that is reachable only through the Tailnet.

```text
Anya / Camelot Runtime
  -> Rust Tailscale Bridge
  -> NotebookLM MCP CLI or Python worker
  -> NotebookLM Platform
```

## Why This Exists

NotebookLM integrations use unofficial/internal APIs and browser cookies. They should not be exposed directly to public clients or random agents.

The bridge gives Camelot:

- private Tailnet-only access,
- stable HTTP API around NotebookLM tools,
- command validation,
- auth health checks,
- rate limits,
- retries,
- local cache fallback,
- ledger-friendly request IDs,
- clean separation between runtime and NotebookLM credentials.

## Final Topology

```text
Local/Cloud Brain Node
  ├─ tailscaled
  ├─ rust-notebooklm-bridge :8787
  ├─ nlm / notebooklm-mcp-cli
  ├─ optional notebooklm-py worker
  └─ local cache / logs

Anya Interphase / Multivoice Router
  ├─ calls http://notebooklm-brain.tailnet:8787
  ├─ sends signed Camelot requests
  ├─ receives source-grounded answers/artifact refs
  └─ writes Ouroboros + ledger events
```

## Bridge Responsibilities

### Allowed

- health check NotebookLM auth,
- list notebooks,
- create notebook,
- add text/URL/file source,
- query notebook,
- create private audio/report/studio artifacts,
- download artifacts to a safe path,
- return source refs and confidence labels.

### Blocked or HITL-Required

- public sharing,
- inviting users,
- deleting notebooks/sources,
- cross-client synthesis,
- importing sensitive client docs,
- publishing audio/video/slides,
- paid/quota-heavy studio generation.

## HTTP API

```text
GET  /health
POST /notebooks/list
POST /notebooks/create
POST /sources/add-text
POST /sources/add-url
POST /query
POST /studio/audio
POST /artifacts/download
POST /auth/check
```

## Request Envelope

```json
{
  "request_id": "cmd_123",
  "org_id": "org_abc",
  "actor": "sir_mnemo",
  "action": "query",
  "risk_class": "L1_DRAFT",
  "payload": {},
  "signature": "hmac_or_future_ed25519"
}
```

## Response Envelope

```json
{
  "ok": true,
  "request_id": "cmd_123",
  "status": "complete",
  "data": {},
  "confidence": "source_grounded",
  "memory_refs": [],
  "error": null
}
```

## Tailscale Security Pattern

Recommended:

```text
Bind bridge to 100.x tailnet address or localhost behind Tailscale Serve/Funnel disabled.
Use ACLs so only Anya/Camelot nodes can call the bridge.
Do not expose through public internet.
```

ACL sketch:

```json
{
  "acls": [
    {
      "action": "accept",
      "src": ["tag:anya", "tag:camelot"],
      "dst": ["tag:notebooklm-brain:8787"]
    }
  ]
}
```

## Runtime Flow

```text
Ouroboros wants to store memory
  -> Multivoice creates signed bridge request
  -> Rust bridge validates request
  -> Bridge invokes nlm or Python worker
  -> NotebookLM stores/query/generates
  -> Bridge returns structured result
  -> Camelot writes local UKG receipt
```

## Bridge Implementation Options

### Option A: Rust calls `nlm` CLI

Best for MVP.

Pros:

- fastest to implement,
- uses notebooklm-mcp-cli directly,
- easy to deploy on same machine.

Cons:

- parse CLI output,
- subprocess management.

### Option B: Rust proxies to Python FastAPI worker

Best for deeper workflows with `notebooklm-py`.

Pros:

- cleaner structured API,
- async NotebookLM workflows,
- advanced artifact/export support.

Cons:

- extra service to run.

### Option C: Rust MCP client/server bridge

Best later.

Pros:

- tool-native,
- clean Sir Link/Aether integration.

Cons:

- more moving parts.

## Recommended MVP

```text
Rust Bridge -> nlm CLI for list/create/source/query/health
Rust Bridge -> Python worker later for deep artifact workflows
```

## Golden Rule

NotebookLM is the cloud brain. Rust Tailscale Bridge is the skull. Tailscale is the private nervous system. Camelot remains the judge of what the brain is allowed to remember, retrieve, or publish.
