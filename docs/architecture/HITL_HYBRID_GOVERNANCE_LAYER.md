# HITL Hybrid Governance Layer

Camelot-OS | Human/AI Hybrid Control Plane

Camelot-OS is not a fully autonomous runaway agent system. It is a human/AI hybrid operating system where autonomous execution is allowed only inside governed boundaries.

## Prime Law

```text
Autonomy is earned by risk class.
Human authority remains sovereign.
```

## Control Model

```text
AI may observe, plan, simulate, draft, route, and execute low-risk bounded tasks.
AI must request HITL approval for destructive, irreversible, financial, security-sensitive, publishing, or high-trust operations.
```

## HITL Gateway

The HITL Gateway is the decision barrier between AI planning and real-world impact.

```text
Titan Prompt
  -> Merlin Plan
  -> Veritas Audit
  -> Antigravity Safety Envelope
  -> HITL Gateway if required
  -> Edge Execution
  -> Ouroboros Ledger
```

## Risk Classes

### L0: Observe

Allowed autonomously.

Examples:

- read public docs,
- inspect logs,
- summarize files,
- check local status,
- generate plan.

### L1: Draft

Allowed autonomously, but not published or written permanently.

Examples:

- create draft text,
- generate patch proposal,
- produce test plan,
- simulate route.

### L2: Safe Execute

Allowed autonomously if scoped and reversible.

Examples:

- open app,
- capture screenshot,
- run read-only diagnostics,
- call low-risk MCP tools,
- enqueue task.

### L3: Guarded Write

Requires Antigravity envelope and may require approval depending on diff size.

Examples:

- write file,
- patch code,
- update config,
- modify persistent memory.

### L4: High-Risk Execute

Requires HITL approval.

Examples:

- shell command,
- file deletion,
- account change,
- credential handling,
- payment,
- publishing,
- external message send.

### L5: Forbidden / Blocked

Never allowed.

Examples:

- hacking back,
- credential theft,
- stealth persistence,
- destructive retaliation,
- unsafe exfiltration,
- bypassing governance.

## NanoKnights

NanoKnights are bounded micro-agents used for parallel local or cloud work.

They are not sovereign agents. They are disposable workers.

### NanoKnight Rules

```text
small context
single task
strict token budget
no direct writes
structured output
must report and dissolve
```

### Allowed NanoKnight Jobs

- classify files,
- scan code slices,
- extract entities,
- summarize chunks,
- score risks,
- verify formatting,
- produce candidate patches.

### Forbidden NanoKnight Jobs

- direct shell execution,
- raw filesystem writes,
- credential access,
- payment/publishing,
- irreversible changes.

## Execution Lanes

### Zero Lane

The Zero Lane is for ultra-light local execution and minimal-resource agents.

Use when:

- memory is constrained,
- task is small,
- local privacy is preferred,
- no heavy inference is required.

Expected engines:

- low-bit / BitNet-style workers,
- distilled local models,
- deterministic scripts,
- simulated workers during development.

### Rust Lane

The Rust Lane is for safe, high-performance local machinery.

Use when:

- filesystem safety matters,
- telemetry must be efficient,
- compression or bundling is required,
- process supervision is needed.

Expected engines:

- Antigravity,
- Rotel,
- Cribo,
- TurboQuant,
- memory sentry tooling.

### NVIDIA Claw Lane

The NVIDIA Claw Lane is for GPU-accelerated local or cloud compute.

Use when:

- CUDA acceleration is available,
- vision/audio/model processing is heavy,
- local GPU can outperform cloud round trips,
- Modal or remote GPU should be used as burst compute.

Expected uses:

- AURORA visual encoding,
- LYRICUS audio batch work,
- local multimodal inference,
- embedding generation,
- model quantization tests,
- high-throughput NanoKnight swarms.

## Governance Matrix

| Lane | Autonomy Level | HITL Trigger |
|---|---:|---|
| Zero | Medium | memory pressure, writes, uncertain output |
| Rust | Medium-High | file patch >10 lines, delete >50MB, shell |
| NVIDIA Claw | Medium | GPU cost, batch size, external upload, model change |
| Browser/WebMCP | Medium | form submission, account changes, purchases |
| RustDesk/Desktop | Low-Medium | shell, credentials, settings, destructive operations |
| PhoneClaw/Android | Low-Medium | messaging, purchases, app permissions, deletion |

## Autonomous Permission Standard

A task may run autonomously only if all are true:

```text
risk <= L2
scope is bounded
rollback is possible or unnecessary
no secrets are accessed
no irreversible external action occurs
Veritas does not flag uncertainty
Antigravity envelope allows execution
```

## Human Approval Standard

Human approval is required if any are true:

```text
risk >= L4
shell command
file deletion
credential access
financial operation
publishing/posting/sending
external account mutation
patch exceeds Iron Gate threshold
policy uncertainty
```

## Ledger Requirements

Every autonomous or approved action must produce:

```json
{
  "type": "HITL_GATEWAY_EVENT",
  "command_id": "cmd_123",
  "risk_class": "L3",
  "lane": "rust",
  "approved_by_human": false,
  "policy_reason": "safe reversible write under threshold",
  "result": "complete",
  "timestamp": "..."
}
```

## Golden Rule

Camelot may move fast, but it must never move secretly.

Every meaningful action is bounded, visible, auditable, and reversible whenever possible.
