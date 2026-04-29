# AIOS Agent Concurrency Kernel

Camelot-OS | Scheduler, Parallelism, and Context Interruption

The AIOS Kernel architecture provides the concurrency model for running multiple agents without treating each agent as a monolithic blocking task.

## Efficient Placement

```text
L3 Neural / Merlin
  -> decomposes high-level intent into system calls
L2 Kinetic / Scheduler
  -> dispatches tool, memory, and execution calls
L1 Substrate
  -> manages runtime queues and resource pressure
```

## Core Mechanisms

### 1. Query Decomposition

High-level tasks are decomposed into atomic system calls:

```text
llm_generate
mem_read
mem_write
tool_run
file_read
file_write
vision_encode
audio_compile
```

### 2. Agent Scheduler

The scheduler manages centralized queues for:

- LLM Core
- Memory Manager
- Storage Manager
- Tool Manager
- Edge Execution

Supported policies:

- FIFO
- Round Robin
- priority queue
- budget-aware scheduling

### 3. Context Interruption

For long-running LLM tasks, the kernel should support snapshot/restore semantics where available.

Camelot practical interpretation:

- Store intermediate state in OUROBOROS/OpenViking.
- Resume via context relay or hydration refs.
- Do not assume all providers expose KV-cache snapshots.

### 4. Modular Parallelism

Non-conflicting work should run in parallel:

```text
Agent A waits for LLM
Agent B runs tool call
Agent C reads memory
Agent D executes browser action
```

## Runtime Flow

```text
Titan Prompt
  -> Merlin decomposes into calls
  -> Scheduler queues calls by resource class
  -> Worker executes bounded call
  -> Result returns to reducer
  -> Veritas audits
  -> Ouroboros stores trace
```

## Scheduler Contract

```json
{
  "call_id": "sys_001",
  "agent_id": "lady_apis",
  "resource_class": "tool_run",
  "priority": 5,
  "time_quantum_ms": 500,
  "budget_tokens": 300,
  "can_interrupt": true,
  "state_ref": "viking://camelot/context/l1/sys_001"
}
```

## Golden Rule

Agents do not monopolize the kernel. Work is decomposed, queued, time-bounded, and resumable through memory refs.
