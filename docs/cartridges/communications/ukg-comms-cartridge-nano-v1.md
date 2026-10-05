# `[UKG: ⚜️ CAMELOT_COMMS_CARTRIDGE_NANO_v1]`

```yaml
id: "ukg.camelot.comms-cartridge.nano.v1"
status: "ARCHITECTURE_COMPLETE; IMPLEMENTATION_IN_PROGRESS; NOT_PRODUCTION_READY"
purpose: >
  A signed, hot-swappable Camelot-OS Communications Cartridge for governed
  executive communications. It may draft and dispatch narrowly approved messages;
  it never owns sovereignty, policy, identity, keys, receipts, or promotion.

north_star:
  product: "Camelot-OS: local-first, multi-tenant, zero-trust universal workspace"
  first_vertical_slice: "Workspace + Anya Interphase + Communications/Ravenry + Sentinel + Excalibur + Gideon + Ledger"
  priority_order: ["safety", "tenancy", "correctness", "speed", "reuse", "delight"]

constitutional_invariants:
  - "Core governs; cartridges provide bounded capability; Pills perform bounded tasks."
  - "Intent is not authority."
  - "No external effect without exact immutable manifest, policy pass, and valid one-shot lease."
  - "Human approval binds to canonical manifest bytes, not a mutable UI draft."
  - "Tenant isolation is server-enforced; UI isolation is never sufficient."
  - "Every effect is idempotent, independently verified, and receipted."
  - "Ambiguous external outcomes reconcile; they never blindly resend."
  - "Offline/degraded mode may present cached state but cannot mint authority or create new external effects."
  - "Cartridges/Pills/Knight/Avatar/Shadow Brain are non-sovereign; Core remains the authority and evidence plane."
  - "Agents cannot self-approve, self-merge, self-promote, self-deploy, or access unrestricted provider secrets."

core_authority_plane:
  identity: "OIDC/SSO + MFA + RBAC + tenant/workspace/service claims"
  sentinel: "policy decision: allow | deny | approval_required"
  excalibur: "short-lived, manifest-bound, tenant-bound, one-shot capability lease"
  bifrost: "authenticated event transport; correlation, idempotency, replay resistance"
  gideon: "independent verifier of bindings, evidence, signatures, policies, and state"
  ledger: "append-only, tamper-evident, durable evidence receipts"
  registry: "signed cartridge/Pill admission, activation, rollback, revocation"
  gateway: "least-privileged connector/provider boundary"
  epoch_fencer: "revocation/freshness authority; stale grants fail closed"

communications_cartridge:
  cartridge_id: "camelot.communications"
  initial_scope:
    channels: ["email"]
    audience: "synthetic/internal-consented recipients only"
    approval: "explicit human approval per manifest"
    provider: "simulator first; Novu only behind feature-flagged canary"
  prohibited_until_release_gate:
    - "autonomous send"
    - "bulk audience export"
    - "unbounded CRM/contact access"
    - "unrestricted external network"
    - "production credentials in source or agent context"
    - "automatic resend on uncertain provider state"
    - "policy, lease, or ledger bypass"

effect_protocol:
  flow:
    - "Draft Intent"
    - "Consent + suppression + tenant + budget/rate checks"
    - "Build immutable Effect Manifest"
    - "Human approves exact manifest"
    - "Sentinel policy decision"
    - "Excalibur issues one-shot lease"
    - "Bifröst dispatches idempotent request"
    - "Provider emits signed normalized event"
    - "Gideon independently verifies full chain"
    - "Ledger stores durable Receipt"
    - "Console exposes evidence timeline"
  canonical_binding: >
    Normalize artifact -> RFC 8785 JCS canonical UTF-8 bytes -> domain-separated
    SHA-256 digest -> Ed25519 signature/verification. Changing recipient, content,
    provider, sender, template, schedule, policy, adapter, retry mode, tenant, or
    capability requires a new manifest and new approval/lease.
  formula: >
    EnvelopeDigest = SHA256(
      DomainPrefix || UTF8(JCS(Normalize(ExecutionEnvelope)))
    )

v1_contracts:
  - "Intent"
  - "EffectManifest"
  - "PolicyDecision"
  - "ApprovalGrant"
  - "CapabilityLease"
  - "BifrostEvent"
  - "DispatchAttempt"
  - "ProviderEvent"
  - "GideonVerdict"
  - "Receipt"
mandatory_fields:
  - "schema_version"
  - "artifact_id"
  - "tenant_id"
  - "workspace_id where applicable"
  - "actor/service identity"
  - "correlation_id"
  - "idempotency_key where effectful"
  - "issued_at / expires_at where authoritative"
  - "canonical digest"
  - "signature/key identifier where signed"

state_machine:
  states:
    - "draft"
    - "approval_required"
    - "authorized"
    - "dispatched"
    - "verifying"
    - "completed"
    - "failed"
    - "reconciliation_required"
    - "quarantined"
    - "cancelled"
  rules:
    - "Terminal receipts only after Gideon pass."
    - "Timeout or unknown provider result -> reconciliation_required."
    - "Duplicate same idempotency key -> return original result."
    - "Conflicting replay -> deny/quarantine."
    - "Lease revoke or kill switch -> no new dispatch."

swarm_delivery_model:
  model: "Plan -> Execute -> Independent Review -> Human Promotion"
  guardrails:
    - "One branch/worktree per work packet."
    - "Exclusive path ownership for each swarm."
    - "Contract changes owned only by Contracts swarm."
    - "No self-review or self-merge."
    - "Two approvals for control-plane/security changes: Gideon verifier + human code owner."
    - "Every change carries tests, threat-model delta, SBOM/security evidence, and rollback note."
  slices_in_order:
    - "COMMS-001: contracts/v1 and valid/invalid/tampered/expired/cross-tenant fixtures"
    - "COMMS-009: CI, CODEOWNERS, lint/type/test, secret/dependency/CodeQL scans, SBOM"
    - "COMMS-002: policy, consent, suppression, approval binding, lease expiry/revocation"
    - "COMMS-003: tenant-scoped persistence, migrations, transactional outbox, idempotency, reconciliation store"
    - "COMMS-004: dispatch state machine and duplicate-safe retry rules"
    - "COMMS-005: deterministic signed provider simulator and webhook normalizer"
    - "COMMS-006: Gideon verification and tamper-evident receipt chain"
    - "COMMS-007: authenticated API; server-side authorization independent of UI"
    - "COMMS-008: operator console for draft/approval/status/evidence/reconciliation"
    - "COMMS-010: E2E, adversarial, concurrency, chaos, recovery, restore, rollback harness"
    - "COMMS-011: feature-flagged Novu canary adapter after simulator gates pass"

required_denial_tests:
  - "Wrong tenant / cross-tenant read, write, lease, provider event, or receipt"
  - "Recipient missing consent or suppressed"
  - "Content, audience, sender, provider, policy, or schedule mutation after approval"
  - "Expired, revoked, consumed, forged, stale-epoch, or wrong-manifest lease"
  - "Duplicate or conflicting idempotency replay"
  - "Duplicate, delayed, reordered, malformed, or unsigned provider event"
  - "Provider timeout after possible acceptance"
  - "Outbox replay, process crash, broker partition, database restart"
  - "Offline new-send attempt"
  - "Receipt mutation or evidence-chain break"
  - "Kill-switch activation and lease revocation"
  - "Unauthorized secret, connector, filesystem, or network egress access"

production_release_gate:
  required:
    - "All contracts versioned and compatibility-tested"
    - "No unresolved critical/high security findings"
    - "Simulator workflow passes from approved intent to verified receipt"
    - "All denial/adversarial suites pass"
    - "Idempotency, reconciliation, and tenant isolation proven"
    - "Signed provider webhooks verified and quarantined on failure"
    - "Encrypted backup/restore, rollback, key rotation, revocation drills succeed"
    - "Monitoring, alerting, SLOs, dashboards, runbooks, on-call, and release ownership active"
    - "Emergency stop blocks sends and revokes live leases"
    - "Canary only: internal recipients, low rate/audience/spend caps, per-send human approval"
  declaration: >
    Production-ready means every external message has an immutable, tenant-scoped,
    consent-checked, human-approved effect manifest; an unexpired manifest-bound
    lease; a uniquely idempotent provider request; independently verified provider
    evidence; and a durable, tamper-evident receipt.

current_state:
  repository: "Cyberdad247/Camelot-OS-communication-cartridge-"
  observed_baseline: "Public repository initially contained README only."
  confirmed_implemented: "Not independently verified."
  immediate_next_action: >
    Implement COMMS-001, then COMMS-009, then COMMS-002. Do not activate live
    provider dispatch until COMMS-003 through COMMS-010 pass and release evidence
    is reviewed by a human owner.
```

---

*The thread's durable conclusion: Camelot is not an unrestricted autonomous agent platform — it is a governed execution fabric in which Cartridges and Pills remain replaceable, while tenancy, policy, authorization, verification, and evidence remain permanent Core responsibilities. The Communications Cartridge is the correct first production vertical slice: a narrow, auditable, human-governed effect workflow that proves the authority chain before the system expands into broader autonomous capabilities.*
