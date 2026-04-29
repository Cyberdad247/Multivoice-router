# Camelot Multivoice Router Integration Blueprint

Multivoice Router is the L7 voice and persona control surface for Camelot-OS. It converts speech into governed Titan Prompts, routes those prompts through the Camelot engine pipeline, and dispatches approved commands to edge nodes.

## System Role

```text
Voice Orb / Web UI
  -> Anya Sovereign Compiler
  -> Titan Prompt
  -> Camelot Engine Orchestrator
  -> AETHER Router
  -> ANTIGRAVITY Gate
  -> Edge Nodes
  -> OUROBOROS Memory + Ledger
```

## Core Layers

### L7: Anya / Multivoice Router
- Gemini Live voice interface
- Persona switching
- Titan Prompt compilation
- AgentArmor security scan
- Skill loading via progressive disclosure

### L6: Governance
- Policy engine
- Approval gates
- Blocked action enforcement
- Ledger-ready compile events

### L5-L3: Engines
- APEE: input compiler
- GENESIS: persona shaping
- VIDENEPTUS: reasoning planner
- VERITAS: truth and policy verification
- AETHER: tool and edge-node router
- ANTIGRAVITY: execution envelope
- OUROBOROS: UKG memory compression
- AURORA: vision normalization
- LYRICUS: voice/audio prompt compilation

### L4: Memory
- Supabase: transactional command state, approvals, device registry
- Appwrite/OpenNotebook: sovereign long-term memory
- NotebookLM: research and synthesis brain
- Qdrant: vector index
- Neo4j: GraphRAG relationships

### L2-L1: Execution + Compute
- PhoneClaw: Android edge node
- superpowers-chrome: browser/CDP edge node
- Termux: mobile CLI edge node
- RustDesk Agent: desktop edge node and rescue bridge
- Tailscale: private neural mesh
- Modal: heavy compute cortex

## Golden Rule

No command reaches execution without a Titan Prompt, policy decision, command id, and ledger-ready event.

## Near-Term Build Targets

1. Wire `runAnyaCompiler()` into `use-gemini-live.ts`.
2. Route Titan Prompts into `runCamelotPipeline()`.
3. Replace in-memory approvals with Supabase persistence.
4. Add node pull endpoints for PhoneClaw, Chrome, Termux, and RustDesk.
5. Add Approval Dashboard UI.
6. Connect OUROBOROS to OpenNotebook/Appwrite and NotebookLM summaries.
