# NotebookLM Cloud Brain Architecture

Multivoice Router | Anya Interphase | AionUI | Camelot-OS

## Purpose

NotebookLM becomes the stable cloud brain for long-term research memory, source-grounded recall, audio briefings, study artifacts, and cross-notebook synthesis.

```text
Local Machine = hands
Anya Interphase = cockpit
AionUI = desktop workbench
NotebookLM = cloud brain
Camelot-OS = governed orchestration and memory policy
```

## Source Projects

### notebooklm-mcp-cli

Best role:

```text
MCP/CLI bridge for AI tools and automation.
```

Use for:

- `nlm` command-line automation,
- `notebooklm-mcp` MCP server,
- Gemini/Cursor/Claude/Antigravity setup,
- Notebook list/create/query,
- source add/sync,
- studio content creation,
- artifact download,
- sharing,
- cross-notebook query,
- pipelines,
- tagging and smart select.

### notebooklm-py

Best role:

```text
Python application adapter for deeper programmable workflows.
```

Use for:

- async app integration,
- source import,
- notebook chat,
- web/Drive research,
- full artifact generation,
- batch download,
- mind-map JSON,
- data-table CSV,
- slide deck PPTX/PDF,
- source fulltext access.

## Stability Warning

Both projects use unofficial/undocumented NotebookLM APIs.

Production wrapper must include:

- health checks,
- auth check,
- cookie expiration detection,
- retry/backoff,
- graceful degradation,
- local cache fallback,
- Appwrite/OpenNotebook backup,
- Veritas confidence flags.

## Memory Tiering

```text
L0 Local UKG Snapshot
  -> compact summary, always local

L1 NotebookLM Cloud Brain
  -> source-grounded notebook memory and generated artifacts

L2 Appwrite/OpenNotebook Backup
  -> long-term durable fallback and exported artifacts

L3 Qdrant/Neo4j Future
  -> vector/graph memory for advanced retrieval
```

## Notebook Taxonomy

Recommended notebook layout:

```text
camelot-system-memory
invisioned-marketing-os
client-{org_slug}-brand-memory
client-{org_slug}-campaigns
client-{org_slug}-reports
knight-roster-and-personas
voice-and-podcast-archive
research-intelligence-vault
```

## Cloud Brain Operations

### Store Memory

```text
Ouroboros event
  -> convert to UKG/Markdown
  -> add as NotebookLM text source
  -> tag notebook/source
  -> persist source ref locally
```

### Retrieve Memory

```text
Query
  -> Sir Mnemo classifies ST/LT need
  -> query relevant NotebookLM notebook
  -> return answer + sources + confidence
  -> Veritas validates before action
```

### Generate Briefing

```text
Notebook sources
  -> NotebookLM audio/report/mind-map/slides
  -> download artifact
  -> store artifact ref
  -> surface in Anya UI
```

### Cross-Notebook Synthesis

```text
Use notebooklm-mcp-cli cross query
  -> ask across client/system/research notebooks
  -> convert answer into UKG
  -> attach provenance refs
```

## Runtime Placement

```text
src/memory/notebooklm-cloud-brain.ts
  TypeScript command adapter for CLI/MCP style calls

apps/api or Modal worker
  Python notebooklm-py integration for deep workflows

Anya Interphase Archives tab
  browse notebooks, sources, artifacts, memory refs

AionUI Workbench
  inspect source fulltext, artifacts, mind maps, reports
```

## Authentication Model

Preferred:

```text
Dedicated Google account for Camelot Cloud Brain.
```

Rules:

- do not use personal primary account for automation if avoidable,
- store auth outside repo,
- check auth before jobs,
- alert user when cookies expire,
- never commit cookies/tokens,
- support multiple profiles later: personal, business, client.

## Safety and Governance

NotebookLM may be used autonomously for:

- adding internal notes,
- querying existing notebooks,
- generating private summaries,
- generating local/private audio drafts.

HITL required for:

- public sharing,
- inviting users,
- deleting notebooks/sources,
- publishing audio/video/slides,
- importing sensitive client docs,
- cross-client synthesis.

## Integration with Existing Components

```text
Ouroboros
  -> writes UKG memory to NotebookLM

Veritas
  -> labels NotebookLM answers as source-grounded or uncertain

OmniVoice
  -> can route podcast drafts to NotebookLM Audio only with approval if quota-sensitive

Anya Interphase
  -> Cloud Brain panel under Archives

AionUI
  -> source/artifact inspection workbench

Project Crusade
  -> only receives approved reports/assets, never raw Cloud Brain access
```

## Golden Rule

NotebookLM is the cloud brain, not the whole mind. Camelot keeps local UKG receipts so the system survives NotebookLM API drift, auth expiry, or quota limits.
