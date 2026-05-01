# AionUI Assimilation Strategy

Source: `Cyberdad247/AionUi`  
Target System: Multivoice Router + Anya Interphase + Project Crusade + Camelot-OS

## Verdict

AionUI should be assimilated as the **desktop AI-agent workbench layer**.

It should not replace:

- `v0-project-crusade` as the public/client showroom,
- `anya-interphase` as the Anya edge cockpit/PWA,
- `Multivoice-router` as the runtime throat.

Instead, it should provide the rich local desktop workbench primitives that Anya/Camelot needs for code, documents, MCP tools, diff review, CLI AI, and local agent control.

## Why AionUI Matters

AionUI is described as a modern AI Chat interface for command-line AI agents. It is built around Electron and includes scripts for desktop packaging across macOS, Windows, and Linux. It also includes web UI modes and remote web UI modes.

Its package stack includes:

- Electron Forge / Electron Builder for desktop distribution,
- React 19,
- Arco Design UI,
- Monaco Editor,
- CodeMirror,
- diff2html,
- MCP SDK,
- better-sqlite3,
- Express and WebSocket tooling,
- document parsers for docx, pptx, xlsx, markdown, HTML-to-text,
- OpenAI and Google GenAI SDKs,
- Tree-sitter,
- markdown rendering with GFM/math/raw HTML support,
- tests, linting, formatting, and contract/integration test scripts.

This makes it ideal for the local desktop cockpit/workbench side of Camelot.

## Final UI Layer Separation

```text
Project Crusade
= public/client-facing landing + safe dashboard shell

Anya Interphase
= private Anya edge cockpit / PWA / voice / visual bridge

AionUI
= local desktop AI workbench / code-chat-diff-MCP-console layer

Multivoice-router
= voice/persona router + edge runtime contracts

Camelot-OS
= governed brain, memory, HITL, provenance, orchestration
```

## What to Assimilate from AionUI

### 1. Desktop Packaging

Use AionUI as inspiration or base for a desktop Anya/Camelot app.

Assimilate:

- Electron Forge packaging,
- mac/win/linux build scripts,
- auto-update strategy,
- local desktop app model,
- remote webui mode.

### 2. AI Chat Interface for CLI Agents

Assimilate:

- command-line agent chat interface concept,
- session management,
- terminal/agent bridge,
- stream rendering,
- message history.

This complements `SovereignConsole` in Anya Interphase.

### 3. Code and Diff Review

Assimilate:

- Monaco Editor,
- CodeMirror,
- diff2html,
- syntax-highlighting,
- markdown/code rendering.

Use for:

- Antigravity patch preview,
- Gideon audit result review,
- Hive IDE editor,
- BEAVER cartridge dashboard.

### 4. MCP Tooling

Assimilate:

- MCP SDK patterns,
- local tool bridge,
- remote tool discovery,
- tool invocation UI.

Use for:

- Superpowers Chrome tools,
- NotebookLM MCP,
- local filesystem tools,
- browser automation tools,
- Aether/Sir Link tool routing.

### 5. Local Persistence

Assimilate:

- better-sqlite3 local database pattern.

Use for:

- offline session cache,
- local command history,
- voice render cache,
- local UKG snapshots,
- edge worker events before cloud sync.

### 6. Document Parsing

Assimilate:

- docx parsing,
- xlsx parsing,
- pptx parsing,
- markdown/HTML conversion.

Use for:

- Lady Apis research ingestion,
- client deliverable intake,
- campaign asset ingestion,
- Notebook/OpenNotebook memory seeding.

## Where It Fits in Anya UI

AionUI aspects should feed these panels:

| Destination | AionUI Feature |
|---|---|
| Hive IDE tab | Monaco/CodeMirror editor, diff2html, terminal agent chat |
| Governance tab | diff review, audit reports, approval previews |
| Archives tab | document parsing, markdown rendering, local SQLite cache |
| Omni tab | MCP tool discovery and route visualization |
| System tab | local desktop packaging, webui remote mode |
| BEAVER dashboard | code editor, patch preview, build logs |
| SPIDER dashboard | MCP tool browser and API invocation panel |

## Assimilation Pattern

Do not copy the entire app directly into Multivoice-router.

Use this pattern:

```text
AionUI source concepts
  -> extracted contracts/components
  -> shared Anya UI primitives
  -> mounted in Anya Interphase or desktop app
```

Recommended future monorepo layout:

```text
apps/public-crusade          # Project Crusade public shell
apps/anya-interphase         # PWA/mobile/private cockpit
apps/anya-desktop            # AionUI-inspired Electron desktop workbench
packages/camelot-runtime     # Multivoice/Camelot runtime contracts
packages/anya-ui-kit         # shared cartridge dashboards, voice panels, diff panels
packages/aion-adapters       # MCP, local SQLite, doc parsing, editor bridges
```

## Production Priorities

### Phase 1: Contracts

- Add Aion capability manifest.
- Map features to Anya/Camelot panels.
- Define desktop workbench role.

### Phase 2: UI Primitives

- Add diff review panel contract.
- Add editor panel contract.
- Add MCP tool browser contract.
- Add local session cache contract.

### Phase 3: Desktop App

- Decide whether to fork AionUI as `anya-desktop` or keep it separate.
- Wire Multivoice-router API/SSE/WebSocket into AionUI shell.
- Add Camelot command queue panel.
- Add Antigravity patch review.

### Phase 4: Edge Integration

- Desktop app controls RustDesk/local terminal.
- PWA controls PhoneClaw/Superpowers Chrome.
- Both share Camelot runtime contracts.

## Safety Rules

- AionUI local tools must still obey Camelot HITL gates.
- No raw shell execution from UI without approval.
- No file write/delete outside Antigravity envelope.
- No MCP tool invocation that bypasses Aether/Sir Link.
- Local SQLite cache must not leak tenant data across orgs.
- Public Project Crusade must never expose AionUI local tooling.

## Golden Rule

AionUI is the workbench. Anya Interphase is the cockpit. Project Crusade is the showroom. Camelot is the engine room.
