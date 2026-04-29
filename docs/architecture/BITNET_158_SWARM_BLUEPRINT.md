# 1.58-Bit Multi-Agent Swarm Blueprint

Camelot-OS | Local-First Swarm Execution Path

The 1.58-bit swarm architecture is a future implementation path for running large numbers of local agents on consumer hardware without requiring expensive GPUs.

## Source Anchors

Primary references:

- Microsoft BitNet repository: `https://github.com/microsoft/BitNet`
- BitNet paper: `https://arxiv.org/pdf/2310.11453`

The BitNet paper introduces a scalable 1-bit Transformer architecture for LLMs and proposes BitLinear as a drop-in replacement for `nn.Linear`, trained from scratch with 1-bit weights. It reports competitive language-modeling performance while reducing memory footprint and energy consumption compared with FP16 baselines and 8-bit quantization approaches.

Important terminology note:

```text
BitNet paper -> 1-bit Transformer / BitLinear
Camelot blueprint -> 1.58-bit / ternary local-swarm implementation path
```

Camelot's 1.58-bit swarm design should be treated as an implementation blueprint inspired by low-bit inference research, not as a claim that any arbitrary model automatically runs at the estimated footprint.

## 1. Role

```text
1.58-Bit Swarm
= ultra-light local sub-agent execution layer
```

This layer is intended to support high-volume local tasks while respecting the 8GB Titanium Law.

## 2. Mathematical Foundation

The design is based on BitNet-style low-bit model execution and a ternary-weight target:

```text
weights ∈ {-1, 0, 1}
```

Instead of heavy floating-point multiplication, inference aims to rely primarily on addition/subtraction style operations. This makes CPU-native inference more feasible on x86 and ARM devices when paired with a compatible runtime.

Implementation reality:

- Microsoft BitNet provides the official source anchor.
- BitLinear is the core architectural substitution described in the paper.
- Runtime memory depends on KV cache, tokenizer, sequence length, batching, framework overhead, and implementation details.

## 3. Titanium Law Fit

Traditional multi-agent swarms can exceed local RAM limits quickly. The 1.58-bit blueprint mitigates this through:

- reduced model weight footprint,
- CPU-oriented inference,
- temporary worker spawning,
- immediate worker dissolution,
- compressed Symbolect/TOON communication,
- Rotel memory sentry enforcement.

Approximate design target:

```text
2B parameter 1.58-bit model ≈ ~0.4 GB RAM footprint for weights-only estimate
```

This is a blueprint target, not a guaranteed runtime metric. Actual memory depends on implementation, runtime, tokenizer, KV cache, batching, and inference engine.

## 4. Spawn-and-Report Topology

```text
Sir Boris / Parent Orchestrator
  -> spawn temporary local workers
  -> assign bounded microtasks
  -> collect structured results
  -> dissolve workers
  -> reduce findings
  -> write OUROBOROS memory event
```

## 5. Worker Lifecycle

### Spawn

A worker is created only for a bounded task.

### Execute

The worker receives:

- task id,
- compressed context,
- token budget,
- input slice,
- output schema.

### Report

The worker returns a small structured result.

### Dissolve

The worker exits immediately and frees memory.

## 6. Nano-Knight Contract

Every local worker must obey:

```json
{
  "worker_id": "nk_001",
  "task_id": "task_123",
  "budget_tokens": 150,
  "input_ref": "viking://camelot/context/l1/...",
  "output_schema": "summary|patch|finding|score",
  "must_exit": true
}
```

## 7. Symbolect v2.0 Communication

Workers should communicate using compressed symbolic packets, not full prose.

Example:

```text
FIND|file=src/api.ts|risk=high|issue=unvalidated_input|fix=guard_schema
```

This reduces token and memory pressure across parallel agents.

## 8. Sir Boris Execution Leadership

Sir Boris acts as the parent local orchestrator.

Responsibilities:

- split batch jobs,
- assign microtasks,
- enforce token and memory caps,
- collect worker reports,
- reduce outputs,
- trigger Veritas/Gideon validation,
- submit final state to OUROBOROS.

## 9. Candidate Local Tasks

Good fits:

- codebase scanning,
- file classification,
- lint result summarization,
- email triage,
- duplicate detection,
- simple refactor suggestions,
- local metadata extraction,
- batch validation.

Poor fits:

- deep creative reasoning,
- large multimodal generation,
- long-context synthesis,
- high-risk shell execution,
- tasks requiring fresh web facts.

## 10. Safety and Governance

The 1.58-bit swarm is not allowed to write files directly.

All writes route through:

```text
Worker -> Sir Boris reduce -> Antigravity -> Iron Gate if needed -> write
```

Human approval is required for:

- file patches over 10 lines,
- deletion over 50MB,
- shell commands,
- irreversible account actions,
- publishing or payments.

## 11. Runtime Sketch

```text
Merlin creates plan
  -> Sir Boris selects local swarm mode
  -> Rotel checks RAM
  -> Boris spawns N workers
  -> workers process slices
  -> workers report and dissolve
  -> Boris reduces
  -> Veritas audits
  -> Antigravity gates writes
  -> Ouroboros stores UKG event
```

## 12. Implementation Path

Phase 1:

- Add worker contract.
- Add local spawn manager.
- Add memory cap guard.
- Use simulated workers.

Phase 2:

- Connect to a local lightweight inference runtime.
- Add Symbolect packet format.
- Add result reducer.

Phase 3:

- Integrate Microsoft BitNet runtime research path.
- Add Rotel memory sentry integration.
- Add dashboard metrics.
- Benchmark real RSS memory, throughput, and context-length behavior.

## 13. Benchmark Requirements

Before enabling this as production local swarm execution, measure:

- model load memory,
- KV cache growth by context length,
- per-worker RSS,
- max concurrent workers under 8GB,
- tokens/sec on CPU,
- worker spawn/dissolve latency,
- accuracy vs. full precision or cloud model baseline.

## 14. Golden Rule

Spawn many, think small, report tight, dissolve fast.

The local swarm must never threaten the Titanium Law.
