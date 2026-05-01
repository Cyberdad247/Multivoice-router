# Camelot-OS 9 Core Cognitive & Utility Engines

**System:** Camelot-OS  
**Registry:** Ω_CORE_ENGINES_v700  
**Purpose:** Canonical engine map for memory, reasoning, safety, routing, persona forging, audio, truth verification, input compilation, and multimodal vision.

These 9 engines run in parallel to power Camelot-OS. They are not only metaphors; each one maps to runtime modules, UI panels, edge workers, and governance policies.

---

## 1. APEE — Anya Prompt Enhancement Engine

**Domain:** Input & Compilation  
**Layer:** L7 Ethereal  
**Primary Persona:** Anya_Ω  
**Role:** Input Compiler

APEE executes the Triple-QFT protocol to renormalize noise and compile raw user intent into high-density Titan Prompts.

### Core Functions

- parse raw user intent,
- strip noise,
- identify Anchor Tokens,
- detect ambiguity,
- apply Triple-QFT,
- produce Titan Prompt,
- route to Merlin / runtime.

### Runtime Mapping

```text
src/anya/anya-compiler.ts
src/runtime/camelot-runtime.ts
```

---

## 2. VIDENEPTUS — Logic Router

**Domain:** Logic & Reasoning  
**Layer:** L3 Neural  
**Primary Persona:** Merlin_Ω  
**Role:** Reasoning Engine

Videneptus navigates complex reasoning topologies such as Tree of Thoughts, Graph of Thoughts, and DAG planning. It applies Learning-at-Criticality to oscillate between precision and exploration modes.

### Core Functions

- Tree of Thoughts routing,
- Graph of Thoughts synthesis,
- Learning-at-Criticality,
- task decomposition,
- DAG generation,
- architecture planning,
- route recommendations.

### Runtime Mapping

```text
src/merlin/videneptus-engine.ts
src/runtime/camelot-runtime.ts
```

---

## 3. OUROBOROS — Infinite Memory

**Domain:** Memory & Truth  
**Layer:** L4 Semantic  
**Primary Persona:** Mnemosyne_Ω  
**Role:** Memory Engine

Ouroboros uses GraphRAG-style memory, Sentinel Compression, and Universal Knowledge Glyph generation to convert session states into durable, reconstructable memory.

### Core Functions

- Sentinel Compression,
- UKG generation,
- Anchor Token retention,
- memory refs,
- session snapshots,
- NotebookLM Cloud Brain export,
- local fallback receipts.

### Runtime Mapping

```text
src/memory/ouroboros-engine.ts
src/memory/ukg-hydration-engine.ts
src/memory/notebooklm-cloud-brain.ts
src/memory/tailscale-notebooklm-bridge-client.ts
```

---

## 4. ANTIGRAVITY — Safety / I/O Engine

**Domain:** Execution Safety  
**Layer:** L2 Kinetic + L6 Governance  
**Primary Personas:** Lukas, Sir Justicar, Sir Sentinel  
**Role:** Safety/I/O Middleware

Antigravity enforces the rule that every file-system or destructive action must pass through a governed safety layer. Its target production form is a Rust/PyO3 middleware, while the current TypeScript implementation defines the runtime contract.

### Core Functions

- no raw file writes,
- atomic write policy,
- approval gates,
- delete protection,
- shell-command risk detection,
- rollback metadata,
- Iron Gate enforcement.

### Runtime Mapping

```text
src/execution/antigravity-engine.ts
src/api/approval-contracts.ts
src/runtime/camelot-runtime.ts
```

---

## 5. AETHER — Connectivity Engine

**Domain:** Tools, MCP, Network Routing  
**Layer:** L2 Kinetic + L5 Agentic  
**Primary Persona:** Sir Link  
**Role:** Connectivity Gateway

Aether is the connectivity and tool routing engine. Its target production form is the Go-based Saltare gateway, using semantic vector routing to match natural language tasks to MCP tools, edge workers, browser tools, and cloud services.

### Core Functions

- tool discovery,
- MCP routing,
- edge worker routing,
- semantic route selection,
- provider fallback,
- Superpowers Chrome routing,
- NotebookLM bridge routing,
- Tailscale node routing.

### Runtime Mapping

```text
src/connectivity/aether-engine.ts
src/router/intent-router.ts
src/edge/edge-action-schema.ts
src/edge/qr-node-enrollment.ts
```

---

## 6. GENESIS — Persona Forge

**Domain:** Persona / Knight Creation  
**Layer:** L5 Agentic + L3 Neural  
**Primary Personas:** Merlin_Ω, Anya_Ω  
**Role:** Persona Forge

Genesis creates and evolves specialized Knights. Instead of relying on vague adjectives, it uses structured identity contracts, Proteus MPI-style vectors, mental model maps, SkillGraph tiers, voice profiles, and persona overrides.

### Core Functions

- Knight creation,
- persona override hydration,
- Soul Matrix mapping,
- mental model assignment,
- SkillGraph tiering,
- voice binding,
- dashboard binding,
- `//I_RECOGNIZE_YOU` identity sealing.

### Runtime Mapping

```text
src/agents/knight-roster-v400.ts
src/agents/persona-overrides.ts
docs/agents/KNIGHT_ROSTER.md
config/personas/knight-persona-overrides.example.json
```

---

## 7. VERITAS — Truth Verification

**Domain:** Audit & Verification  
**Layer:** L6 Governance  
**Primary Persona:** Lady Veritas  
**Role:** Truth Verification Engine

Veritas cross-checks logic, prevents hallucinations, enforces citation and source-grounding requirements, validates PRD alignment, and reports uncertainty before output is shipped or client-facing material is released.

### Core Functions

- factual audit,
- logic audit,
- citation enforcement,
- PRD alignment,
- hallucination detection,
- source confidence labeling,
- release blocking.

### Runtime Mapping

```text
src/verification/veritas-engine.ts
src/runtime/camelot-runtime.ts
```

---

## 8. AURORA — Multimodal Vision Engine

**Domain:** Vision / Multimodal Perception  
**Layer:** L7 Ethereal + L3 Neural  
**Primary Personas:** Anya_Ω, Sir Visage  
**Role:** Visual Processor

Aurora processes images and videos as high-fidelity visual embeddings rather than relying only on text descriptions. It supports screenshot analysis, remote desktop state, PhoneClaw visual state, Chrome visual context, and future vision-language-action workflows.

### Core Functions

- screenshot analysis,
- video/image tokenization,
- visual state extraction,
- UI grounding,
- remote control visual feedback,
- PhoneClaw/RustDesk/Chrome vision support,
- multimodal memory refs.

### Runtime Mapping

```text
docs/architecture/ANYA_EDGE_ASSISTANT_INTEGRATION.md
src/edge/edge-action-schema.ts
src/ui/anya-interphase-manifest.ts
```

---

## 9. LYRICUS — Audio / Voice Engine

**Domain:** Audio, Voice, Podcasting  
**Layer:** L7 Ethereal + L5 Agentic  
**Primary Persona:** Sir Sonus  
**Role:** Sonic Generator

Lyricus compiles text into voice, audio, and podcast-style outputs. It supports Knight voices, multivoice sessions, council mode, podcast mode, automation briefings, and OmniVoice bill-safe routing.

### Core Functions

- Knight voice profiles,
- single voice mode,
- council mode,
- podcast mode,
- voice automation,
- local-first TTS,
- OmniVoice routing,
- paid/audio generation HITL gates,
- transcript and audio artifact memory.

### Runtime Mapping

```text
src/voice/voice-profile-registry.ts
src/voice/multivoice-session.ts
src/voice/omnivoice-router.ts
src/automation/voice-automation.ts
docs/architecture/ANYA_MULTIVOICE_PODCAST_AUTOMATION.md
docs/architecture/OMNIVOICE_ROUTER_KNIGHT_VOICES.md
```

---

## Engine Interaction Map

```text
User Intent
  -> APEE
  -> VIDENEPTUS
  -> AETHER
  -> ANTIGRAVITY
  -> VERITAS
  -> OUROBOROS
  -> LYRICUS / AURORA / GENESIS as needed
```

## Engine-to-UI Map

| Engine | Anya UI Surface |
|---|---|
| APEE | Command bar / Voice Orb |
| VIDENEPTUS | DAG viewer / Plan panel |
| OUROBOROS | Archives / Cloud Brain panel |
| ANTIGRAVITY | Approval queue / Patch preview |
| AETHER | Omni panel / Node routing |
| GENESIS | Faction panel / Knight editor |
| VERITAS | Governance panel / Audit report |
| AURORA | OmniEye / Visual bridge |
| LYRICUS | Telephony / Podcast / Voice panel |

## Golden Rule

Each engine must expose a stable contract, a UI surface, a safety boundary, and a memory receipt. No engine may bypass governance to execute high-risk actions.
