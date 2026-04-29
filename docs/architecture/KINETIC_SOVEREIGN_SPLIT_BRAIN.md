# Camelot-OS Kinetic Sovereign Split-Brain Architecture

Camelot-OS operates as a split-brain autonomous architecture that divides work between the Cloud Brain and the Local Hands.

## 1. Core Principle

```text
Cloud Brain = reasoning, planning, synthesis, heavy compute
Local Hands = governed execution, file operations, desktop/phone/browser control
```

No heavy neural workload should run locally if it threatens the 8GB RAM Titanium Law.

## 2. Septem Regna Split Topology

```text
L7 Ethereal     -> Anya / Multivoice Router / Voice / UI
L6 Governance   -> Policy, Veritas, Gideon, Iron Gate
L5 Agentic      -> Knights, Nano-Knights, MCP/A2A swarm
L4 Semantic     -> OpenViking, UKG, Appwrite/OpenNotebook, NotebookLM, Qdrant, Neo4j
L3 Neural       -> Merlin, Videneptus, OmniRoute, Modal/cloud reasoning
L2 Kinetic      -> Lukas, Aether, Antigravity, PhoneClaw, RustDesk, Chrome, Termux
L1 Substrate    -> Local machine, Tailscale mesh, Modal, Vercel, containers/microVMs
```

## 3. Kinetic Polyglot Stack

Camelot avoids monolithic Python-only execution for the hot path.

Preferred runtime responsibilities:

```text
Rust -> safety, compression, telemetry, atomic I/O
Go   -> fast routing gateways and MCP dispatch
Python -> neural orchestration, LangGraph, research workflows
TypeScript -> web UI, voice router, dashboard, integration shell
```

Named components:

- Saltare: Go-based semantic/MCP routing gateway.
- Cribo: Rust context compressor/bundler.
- Rotel: Rust telemetry and resource sentry.
- Antigravity: Rust/PyO3 safety and I/O middleware.

## 4. Titanium Law: 8GB RAM Constraint

The local machine must stay below the 8GB RAM operating limit.

### Enforcement tactics

1. Cloud offloading for heavy reasoning and batch processing.
2. Binary-first execution for hot-path tools.
3. Context sharding through OpenViking L0/L1/L2 memory tiers.
4. Symbolect/TOON compression for swarm communication.
5. Rotel Memory Sentry for process monitoring and kill-switch control.
6. Optional 1.58-bit local model blueprint for low-memory local sub-agents.

## 5. Routing Rules

### Local First

Use local execution when:

- task is small,
- command is deterministic,
- no heavy model inference is needed,
- memory pressure is safe,
- action is device-specific.

Examples:

- open app,
- browser action,
- file read,
- screenshot,
- status check.

### Cloud First

Use cloud execution when:

- task requires heavy reasoning,
- multimodal batch processing is needed,
- large files or video/audio generation are involved,
- local RAM pressure is high,
- multiple agents must run in parallel.

Examples:

- deep research,
- codebase audit,
- video/audio generation,
- large RAG indexing,
- swarm debate.

### Hybrid

Use hybrid execution when:

- cloud plans,
- local executes,
- cloud verifies,
- local reports results.

This is the default Camelot strategy.

## 6. Map-Reduce Swarm Execution

Complex tasks should be shattered into bounded micro-operations.

```text
Task -> split into Nano-Knights -> execute in parallel -> reduce -> verify -> memory write
```

Nano-Knight rules:

- strict token budget,
- narrow role,
- bounded output,
- no raw execution rights,
- must return structured result.

Example roles:

- Formica: rapid code patch ants.
- Pongid: heavy API integration gorillas.
- Castor: container and sandbox builders.
- Arachne: browser/doc foragers.
- Simian: chaos/recovery testers.

## 7. Governance

### Iron Gate

Requires HITL approval when:

- code diff exceeds 10 lines,
- delete exceeds 50MB,
- high-risk shell command is requested,
- external publishing or payment is involved.

### Gideon Crucible

Rejects work that fails strict project metrics and forces a rebuild or `//REZERO` flow.

## 8. Memory Strategy

Use OpenViking/UKG 2.0 tiered context loading:

```text
L0 Abstract -> <100 tokens
L1 Overview -> <2k tokens
L2 Full Content -> mounted only when needed
```

OUROBOROS writes compressed UKG events and hydration references.

## 9. Resource Sentry Contract

Rotel/Sir Alex should continuously track:

- process RSS memory,
- CPU pressure,
- active agent count,
- model load state,
- queue depth,
- runaway process patterns.

Hard response:

```text
warning -> degrade -> offload -> kill -> ledger event
```

## 10. Golden Rule

Local hardware is sacred. If a task risks the 8GB Titanium Law, Camelot routes upward to cloud or downward into smaller spawned-and-reported microtasks.
