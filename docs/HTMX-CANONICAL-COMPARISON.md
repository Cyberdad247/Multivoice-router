# HTMX Canonical vs Current Camelot — Compare & Contrast

**Canonical source:** https://htmx-docs.vercel.app/ — read live 2026-10-29 (shell v3.4.1; documents dated 2026-10-04).
**Current source of truth:** live VPS verification 2026-10-22 → 2026-10-29 (Multivoice-router `ecc85ca`, knight roster checks, Heimdall memory fix) + local repo inventory.
**Ledger sync:** `PROVENANCE_LEDGER.md` §4 in `Cyberdad247/Multivoice-router` now carries the Oct 22–29 landed entries.

---

## 1. What the canonical site actually contains

Four sidebar documents under INFRASTRUCTURE; three readable, one broken:

| Doc | ID / Date | Role |
|---|---|---|
| Brand Architecture | BRAND-001, 2026-10-04 | Three-tier lineage: **Invisioned Marketing Inc.** (sovereign anchor, IP owner) → **Agentic Systems** (multi-agent standard: Symbollect, "Anya First, Anya Last" I/O protocol, WebMCP manifests) → **Camelot-OS** (kernel/runtime/UX plane) |
| Getting Started | DOC-001, 2026-10-04 | Docs-engine smoke test; names the **Wave 0 Interface Freeze** (Go validates doc ID + title before rendering a fragment) |
| DAG Architecture | DOC-002, v3.1.0-PROD-CONFORMED, baseline SHA-256 `9cc4de4e`/`7b00fffa` | The master full-stack specification (detail in §2) |
| Wave 0 Interfaces | — | **Orphaned: sidebar entry exists, backing markdown missing.** Engine returns its document-not-found fragment; absent from the agent dump. The freeze's own spec document is the broken one. |

Mechanics (verified live): shell at `/`, fragments are server-rendered HTML from the **same** `/docs/<slug>` URL (no shell when fetched directly), sourced from `<slug>.md` files via a Go Markdown Content Engine. Agent-native surfaces are live too: `/.well-known/mcp.json` (tools: search_docs, get_doc, verify_doc_hash, search_cloudbrain, cloudbrain_status) and `/api/agent/dump` streaming the whole corpus.

## 2. The canonical architecture (DOC-002, condensed)

- **Pipeline:** Intent → Typed Proposal (Anya) → Policy Decision (Sentinel) → Immutable Effect Manifest → Human Approval (Excalibur) → **Capability Lease** → Bounded native/WASM execution → Independent Verification (Gideon) → SHA-256 hash-chain Ledger → Verified UI Projection (HTMX).
- **Stack law:** No Docker/Kubernetes; signed native micro-binaries under systemd + cgroup v2 (<350MB RSS); **Rust control plane, Go transport/doc engines, Wasmtime/WASI sandboxing — explicitly not a Python monolith.**
- **Global Law 03:** memory ceilings — node ≤4,096 MB, sovereign server ≤8,192 MB. **Global Law 04:** Warp Gate Keypasses cryptographically bound to canonical Spark IDs; failures logged permanently.
- **Authority:** no perpetual credentials; every operational write needs a signed capability lease. R0–R1 auto-lease; R2–R4 Excalibur HITL. Leases pin task, node, VFS sandbox scope, hardware ceilings, monotonic epoch timeout. "Agents propose; Sentinel authorizes; Excalibur approves; Gideon verifies; Ledger proves."
- **Transport:** Bifrost with Tailscale mTLS + ed25519 envelope signatures, replay mitigation, zero implicit network authority.
- **Data:** PostgreSQL with Row-Level Security, SQLite-VSS, MemCastle sqlite-vec KNN partitions per knight, Graphiti bi-temporal graphs, NotebookLM UUIDs — the WorldTree CloudBrain. Evidence plane: append-only SHA-256 receipt chains (`verification_ledger.jsonl`), VCL proof-of-state.
- **Voice:** SanoTTS — sovereign local neural TTS (24kHz mono WAV, ~50ms CPU, zero cloud egress).
- **Edge quantization:** BitNet b1.58, SpinQuant, KIVI 2-bit KV, SnapKV under a 512MB ceiling.
- **Knights:** a **38-Knight** Sovereign Round Table; Reya fabric for persona channeling; Alpha Omega knights execute autonomously within leases, novices need HITL.
- **Watchtower (canonical):** samples RAM/CPU every 30s, recursive NUL scans, compiles a dashboard HTML.
- **Not stated anywhere in the readable docs:** any numeric service port, and any multi-tenancy model (closest: per-knight partitions, Postgres RLS, VFS confinement, lease scoping).

## 3. Where current Camelot AGREES with canonical

| Canonical | Current (verified) |
|---|---|
| No Docker/Kubernetes | User law + Camelot-OS design agree: microVM model, no Docker in the Camelot start path. (The Hermes *app* runs in a host container as packaging — known and distinguished, Oct 28 drill.) |
| Agents propose, humans dispose | Mesh law ("knights propose, never mint authority") + the iron gate (explicit approval for significant diffs / protected infra) are the operating form of the same rule. Anya Omega's authorize/grant/mint verbs are quarantined. |
| Approval → Sentinel → Excalibur lease → Bifrost dispatch → signed event → Gideon verify → ledger receipt | The comms cartridge manifest implements this exact ordering at spec level; Excalibur's gate in Multivoice is fail-closed (invalid crossings return BLOCKED). |
| Approvals bind to manifest bytes; views hold no authority (I11) | Stated verbatim in the comms manifest + console aspect spec; the Multivoice UI holds no provider credentials. |
| Global Law 03 server ceiling 8,192 MB | The Hermes VPS *is* 8GB (7,941 MB observed) — aligned by hardware; Qdrant's 2.5GB budget / 2GB alert is the same discipline applied per-store. |
| Bifrost + Tailscale as trust/transport | Live: Bifrost :8180, RoundTable :8182, tailnet spine with Tailscale SSH proven from the user's phone. |
| HTMX fragment consoles | The Go operator console in Camelot-VPS (`apps/operator-console`, :3004) implements the canonical pattern faithfully: server fragments, hx-get polling, tenant in template data. |
| Local-first voice | Kokoro TTS/STT runs fully on-box (the sovereign half of the voice stack). |
| Evidence before claims | Verify-before-reporting discipline + the provenance ledger itself (updated this session). |

## 4. Where current Camelot DIVERGES from canonical

Ranked by structural weight:

1. **Runtime language/shape.** Canonical: Rust control plane + Go engines + WASM sandboxes, no Python monolith. Current: a **Python stdlib fleet** (knight_runtime, Watchtower, mesh broker, Anya, BoB gateway) supervised as plain processes — no Wasmtime, no cgroup ceilings enforced, no signed micro-binaries. This is the deepest gap; everything else is smaller.
2. **UI projection.** Canonical: verified UI projection = HTMX fragments. Current root: a **React SPA** (Multivoice-router) consuming JSON APIs — a deliberate user ruling (Oct 22: Multivoice UI/UX leads). The canonical-pattern Go console exists but serves **mock data** (its handlers say so in comments) and a hardcoded `ROOT_TENANT`. CAMELOT_OS's HtmxCommandCenterView is a React *simulation* of an htmx console. Net: the canonical surface pattern survives as demos; the working surface is the SPA.
3. **Capability leases.** Canonical: cryptographic, signed, pinning task/node/sandbox/epoch; no perpetual credentials. Current: no lease machinery in production. The human analog — task-scoped Hermes passwords, used once, never stored — honors the *spirit* (no standing credentials for the operator agent) but knights/services hold ordinary API keys and a session secret.
4. **Ledger.** Canonical: append-only SHA-256 hash-chained `verification_ledger.jsonl` + VCL. Current: a markdown provenance ledger + JSONL service logs (BoB live-chat, mesh). No hash chain exists on the box. The ledger proves by *record*, not by *chain*.
5. **Envelope signing.** Canonical: ed25519-signed Bifrost envelopes with replay mitigation. Current: Bifrost routes by API key; no envelope signatures.
6. **Voice egress.** Canonical: SanoTTS, zero cloud egress. Current: Kokoro local **plus Mistral Voxtral cloud** TTS/STT for Heimdall/Hermes (user-approved Oct 22, paid, `confirmPaid`-gated). A named, deliberate divergence.
7. **Data plane.** Canonical: PostgreSQL RLS + SQLite-VSS. Current: SurrealDB behind Open Notebook, Redis, Qdrant. No RLS or tenant enforcement anywhere live — and canonical itself never states a tenancy model, so this is a shared blank, not a one-sided miss.
8. **Roster counts.** Canonical claims **38 knights**. Live truth: **4 runtime knights** (+ Hermes control). Paper truth: 46 persona knights seated (Oct 29 seat map), 71 Pill files. Three numbers, none equal — canonical drift in the brand doc, not in the runtime.
9. **MemCastle & Graphiti.** BRAND-001 presents both as WorldTree mesh components. Live truth (Excalibur registry, verified): MemCastle **design-only**, Graphiti **adapter stub** (quarantined, zero nodes). The canonical doc states as built what the registry honestly states as planned.
10. **Watchtower.** Canonical: 30s sampling, NUL scans, compiled HTML dashboard. Current Watchtower v1.2: process supervision + JSON health (:8099) + ntfy alerts + triage flow. Same name and duty family; different instrument set.
11. **Warp Gate Keypasses (Law 04).** Spark IDs exist in the Pill architecture; keypass-gated ingress is **not implemented** — ingress control today is Tailscale + Hermes session auth.
12. **Agent surface.** The canonical *docs site itself* ships WebMCP (`/.well-known/mcp.json`, `/api/agent/dump`, `verify_doc_hash`). No Camelot production service exposes an MCP manifest today; the knights speak OpenAI-compatible APIs via RoundTable.

## 5. Canonical's own rot (said plainly)

- **Wave 0 Interfaces is a dead sidebar entry** on the canonical surface — the document that would specify the interface freeze is missing from the deployment, and the freeze rule survives only as a mention inside DOC-001.
- **The Go backend repo is still unlocated** (blocked since 2026-10-04: likely repo names checked, web searched). Without it, the baseline hash `9cc4de4e`/`7b00fffa` cannot be re-verified and routes/auth/tenant scoping cannot be audited. The site is canonical by the user's confirmation, not by source inspection.
- Canonical numbers (38 knights, MemCastle/Graphiti as mesh, 3.25x speculative speedup, kurtosis figures) are **assertions in a living-baseline document**, several contradicted by live checks. Treat DOC-002 as the *target constitution*, and the Excalibur registry + ledger as the *census of what exists*.

## 6. The one-sentence contrast

Canonical Camelot is a **Rust/Go/WASM, lease-driven, hash-chained** constitution whose UI is a verified HTMX projection; the Camelot that actually runs today is a **Python, Watchtower-supervised, human-gated** fleet with a React command surface — the two agree on the *authority pipeline and the laws* (propose → approve → verify → record; no Docker; memory ceilings; no ambient browser authority) and diverge on the *machinery* (leases, chains, sandboxes, fragments) that the constitution specifies.

**Natural reforge seam (already specced):** the `camelot.communications.console` aspect — real HTMX fragments over live comms data, views only — is where canonical pattern and live data can meet first, ahead of any Rust/Go rewrite.
