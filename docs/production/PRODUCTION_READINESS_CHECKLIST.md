# Camelot-OS Production Readiness Checklist

This checklist tracks the minimum conditions required before Camelot-OS should be considered production-ready.

## 1. Runtime Spine

- [x] `src/runtime/camelot-runtime.ts` exists.
- [x] Runtime calls Anya/APEE.
- [x] Runtime applies AgentArmor before sensitive sinks.
- [x] Runtime calls Merlin/Videneptus.
- [x] Runtime signs DAGs.
- [x] Runtime creates provenance attestation.
- [x] Runtime calls Veritas.
- [x] Runtime calls Aether.
- [x] Runtime calls Antigravity.
- [x] Runtime writes OUROBOROS memory objects.
- [x] Runtime builds ledger event.

## 2. Command Queue

- [x] Command lifecycle types exist.
- [ ] Supabase tables exist.
- [ ] Worker polling exists.
- [ ] Dead-letter queue exists.
- [ ] Retry/backoff exists.

## 3. HITL Gateway

- [x] HITL rules documented.
- [x] Antigravity pauses high-risk execution.
- [ ] Approval dashboard exists.
- [ ] Approval API exists.
- [ ] Diff/rollback preview exists.

## 4. Security

- [x] AgentArmor PDG scaffold exists.
- [x] HMAC DAG signing exists.
- [x] Provenance attestation object exists.
- [ ] Secrets manager configured.
- [ ] Rate limiting configured.
- [ ] Tenant auth configured.
- [ ] Rotel verification adapter implemented.
- [ ] Optional Polygon anchoring implemented.

## 5. Memory

- [x] OUROBOROS JSON-LD UKG generation exists.
- [x] Hydration refs exist.
- [ ] Supabase ledger persistence exists.
- [ ] OpenViking file writes exist.
- [ ] Appwrite/OpenNotebook adapter exists.
- [ ] Qdrant/Neo4j adapters exist.

## 6. Edge Agents

- [ ] RustDesk desktop agent implemented.
- [ ] PhoneClaw Android agent implemented.
- [ ] Chrome/WebMCP agent implemented.
- [ ] Termux CLI agent implemented.
- [ ] Tailscale identity checks implemented.
- [ ] Device heartbeat implemented.

## 7. Cartridges and Knights

- [x] v400 Knight roster exists.
- [x] Bio-Kinetic cartridge registry exists.
- [x] MMAP Knight cognition adapter exists.
- [ ] Runtime fully enforces allowed tools per cartridge.
- [ ] GENESIS consumes MMAP output directly.

## 8. Observability

- [ ] Health endpoint exists.
- [ ] Metrics endpoint exists.
- [ ] Command trace dashboard exists.
- [ ] Rotel telemetry connected.
- [ ] RAM sentry kill/degrade/offload behavior implemented.

## 9. Tests

- [ ] Typecheck passes.
- [ ] Unit tests exist for Anya compiler.
- [ ] Unit tests exist for AgentArmor.
- [ ] Unit tests exist for Antigravity.
- [ ] Unit tests exist for DAG signer.
- [ ] Unit tests exist for runtime.
- [ ] CI workflow exists.

## 10. Production Definition

Camelot is production-ready only when:

```text
A real user command can flow through:
Anya -> AgentArmor -> Merlin -> signed DAG -> Veritas -> Aether -> Antigravity/HITL -> execution -> Ouroboros -> ledger
```

and high-risk actions pause for human approval every time.

## Current Status

```text
Status: production spine scaffolded, persistence and real edge execution pending.
```
