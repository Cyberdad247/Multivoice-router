# OmniRoute Integration Spec

OmniRoute is the universal AI gateway and model-routing layer for Camelot-OS. It exposes an OpenAI-compatible endpoint and routes requests across subscriptions, API keys, cheap backups, and free-provider pools.

## Role

```text
OmniRoute
= model gateway + quota router + cost governor + context relay
```

Default local endpoint:

```text
http://localhost:20128/v1
```

Camelot tools such as Multivoice Router, Merlin, Knights, Claude Code, Cursor, Gemini CLI, and other coding agents should target OmniRoute instead of directly calling providers.

## Core Concepts

### Combo

A combo is a named chain of providers/models governed by a routing strategy.

```json
{
  "id": "camelot_reasoning_default",
  "strategy": "auto_combo",
  "models": [
    { "provider": "anthropic", "model": "claude-sonnet", "tier": 1 },
    { "provider": "openai", "model": "gpt-reasoning", "tier": 2 },
    { "provider": "deepseek", "model": "deepseek-r1", "tier": 2 },
    { "provider": "pollinations", "model": "free-gpt", "tier": 4 }
  ]
}
```

## 13 Routing Strategies

- auto_combo
- context_relay
- fill_first
- cost_optimized
- least_used
- p2c
- random
- latency_optimized
- quota_aware
- stability_first
- task_fit
- budget_guarded
- local_first

## Auto-Combo Scoring

```text
score = health*0.25 + quota*0.20 + cost_inverse*0.20 + latency_inverse*0.15 + task_fit*0.10 + stability*0.10
```

Provider failures should trigger self-healing exclusion windows between 5 and 30 minutes.

## Four-Tier Fallback Tree

1. Subscription providers
2. API-key providers
3. Cheap backup providers
4. Free-provider pool

## Context Relay

When a route switch occurs mid-session, OmniRoute should generate a compact handoff summary and inject it into the next provider as system context.

Context Relay payload:

```json
{
  "session_id": "sess_123",
  "previous_provider": "anthropic",
  "next_provider": "deepseek",
  "handoff_summary": "User is building Camelot-OS model gateway...",
  "active_constraints": ["preserve citations", "respect approval gates"],
  "memory_refs": ["viking://camelot/context/l1/latest"]
}
```

## MCP Tools

OmniRoute should expose MCP tools for self-management:

- omniroute_switch_combo
- omniroute_check_quota
- omniroute_cost_report
- omniroute_simulate_route
- omniroute_set_budget_guard
- omniroute_list_models
- omniroute_health
- omniroute_context_relay

## Camelot Integration

### APEE
Uses OmniRoute model detection for prompting inversion.

### VIDENEPTUS
Uses OmniRoute provider hints for reasoning provider selection.

### AETHER
Treats OmniRoute as a model MCP gateway.

### VERITAS
Can force citation-safe models or block unsourced claims.

### OUROBOROS
Stores context relay summaries as UKG memory events.

## Golden Rule

Camelot engines do not hardcode provider keys. They ask OmniRoute for the best route under policy, budget, task fit, and context continuity.
