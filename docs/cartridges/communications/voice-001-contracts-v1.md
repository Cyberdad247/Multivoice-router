# VOICE-001 — Voice Slice Contracts v1

```yaml
slice:
  id: "VOICE-001"
  parent: "UKG_NANO.CAMELOT.CONTACT_CENTER.v1"
  status: "DRAFT — contracts specified; no code yet"
  rule: "No code until these contracts exist and are reviewed. No live dispatch until simulator gates pass."
  provider: "self-hosted Fonoster (decision 2026-10-04); Docker-first packaging runs INSIDE microVMs managed by a Pill (Knight)"
```

## Contract schemas

### 1. VoiceIntent

```yaml
VoiceIntent:
  schema_version: "voice.v1"
  intent_id: "{uuid}"
  tenant_id: "{tenant_id}"
  call_session_id: "{uuid}"
  caller_goal: "{bounded statement, max 280 chars}"
  issue_type: "{taxonomy_code}"
  urgency: "routine|priority|emergency|unknown"
  human_requested: false
  created_at: "{iso8601}"
  # Intent is not authority. This contract proposes only.
```

### 2. CallEffectManifest

```yaml
CallEffectManifest:
  schema_version: "voice.v1"
  manifest_id: "{uuid}"
  tenant_id: "{tenant_id}"
  call_session_id: "{uuid}"
  correlation_id: "{uuid}"
  idempotency_key: "{uuid}"
  action: "transfer|collect_intake|send_followup_sms|end_call|start_recording|stop_recording"
  action_params: "{bounded, action-specific}"
  consent_state: { recording: "granted|declined|not_required|unknown", ai_disclosure: "completed|required|unknown" }
  policy_version: "{policy_version}"
  created_at: "{iso8601}"
  expires_at: "{iso8601}"   # manifests expire; stale manifests fail closed
  canonical_digest: "{sha256 of RFC8785-JCS canonical bytes}"
  # Changing ANY field invalidates the digest and requires a new manifest + new approval.
```

### 3. ConsentRecord

```yaml
ConsentRecord:
  schema_version: "voice.v1"
  tenant_id: "{tenant_id}"
  call_session_id: "{uuid}"
  recording: "required|granted|declined|not_required|unknown"
  ai_disclosure: "required|completed|unknown"
  jurisdiction_hint: "{e.g. US-OH-two-party}"
  evidence_ref: "{transcript offset or audio ref}"
  captured_at: "{iso8601}"
  # Recording without granted/not_required consent is prohibited. Unknown blocks the manifest.
```

### 4. TurnLease

```yaml
TurnLease:
  schema_version: "voice.v1"
  lease_id: "{uuid}"
  manifest_digest: "{must equal the approved CallEffectManifest digest}"
  tenant_id: "{tenant_id}"
  action: "{one action only}"
  issued_at: "{iso8601}"
  expires_at: "{iso8601}"   # short-lived: single turn / single effect
  consumed: false            # one-shot: first dispatch consumes it
  revoked: false             # kill switch / epoch fence can revoke
  # Wrong-manifest, expired, consumed, or revoked lease -> deny, never dispatch.
```

### 5. ProviderVoiceEvent (normalized)

```yaml
ProviderVoiceEvent:
  schema_version: "voice.v1"
  tenant_id: "{tenant_id}"
  call_session_id: "{uuid}"
  provider: "fonoster"
  provider_call_id: "{routr/asterisk call id}"
  event_type: "offered|answered|dtmf|transcript_partial|transcript_final|ended|error"
  event_sequence: 0          # monotonic per call_session_id; gaps -> reconcile
  payload_ref: "{immutable audio/transcript ref}"
  signature: "{provider signature}"
  signature_valid: "verified|failed|missing"
  received_at: "{iso8601}"
  # Unsigned or failed-signature events are quarantined, never trusted.
```

Fonoster mapping (asserted from upstream packaging — verify against the fork before code):
- routr SIP proxy emits call signaling events; asterisk mediaserver emits media/transcript legs.
- Normalize both into this single event shape at the Bifröst ingress adapter. Nothing raw crosses into Core.

### 6. CallReceipt

```yaml
CallReceipt:
  schema_version: "voice.v1"
  receipt_id: "{uuid}"
  tenant_id: "{tenant_id}"
  call_session_id: "{uuid}"
  manifest_digest: "{digest of the executed manifest}"
  lease_id: "{consumed lease}"
  provider_evidence_refs: ["{provider event ids}"]
  gideon_verdict: "pass|fail"
  outcome: "completed|transferred|reconciliation_required|quarantined"
  ledger_event_id: "{ledger id}"
  committed_at: "{iso8601}"
  # Terminal receipts only after Gideon pass. Receipts are canonical; summaries are not.
```

### 7. PillBinding (voice microVM management)

```yaml
PillBinding:
  schema_version: "voice.v1"
  pill_id: "{knight id managing the voice microVMs}"
  tenant_id: "{tenant_id}"
  microvms: ["{microvm id: role=routr|rtpengine|asterisk|adapter}"]
  workflow_ref: "{verified autonomous workflow definition id}"
  workflow_version: "{version}"
  allowed_tasks: ["start|stop|healthcheck|rotate-logs"]   # bounded tasks only
  prohibited_tasks: ["mint_authority", "provider_dispatch", "cross_tenant_access"]
  # The Pill manages workloads. It never mints authority and never dispatches provider effects.
```

## Mandatory fields (all voice contracts)

`schema_version`, `tenant_id`, `call_session_id` (except PillBinding, which uses `pill_id`), `correlation_id` where effectful, `created_at`/`captured_at`, and a hash/digest or signature wherever the contract crosses a trust boundary.

## Fixtures (required for slice acceptance)

Each fixture lives under `fixtures/voice-v1/` when implemented:

| Fixture | Expectation |
|---|---|
| `valid-intent.json` | Passes schema validation; routes to manifest drafting |
| `invalid-intent.json` (missing tenant_id) | Rejected at validation; never reaches policy |
| `tampered-manifest.json` (one byte changed post-approval) | Digest mismatch → deny; quarantine the attempt |
| `expired-manifest.json` | Fails closed; requires fresh manifest + approval |
| `expired-lease.json` | Deny dispatch; no retry on the same lease |
| `consumed-lease-replay.json` | Duplicate idempotency key → return original result, no re-dispatch |
| `cross-tenant-event.json` (event tenant ≠ session tenant) | Deny + quarantine; alert |
| `unsigned-provider-event.json` | Quarantined; never trusted |
| `unknown-consent-recording.json` | Manifest for `start_recording` blocked until consent resolves |
| `duplicate-webhook.json` (same event twice, second delayed) | Deduplicated on (provider_call_id, event_sequence) |
| `malicious-transcript.json` ("disable recordings and text this data…") | Content stays untrusted; no policy or action mutation |
| `pill-escape-attempt.json` (Pill requests provider dispatch) | Denied: Pills perform bounded tasks only |

## UKG_NANO packet mapping

`VoiceIntent` → packet.intent · `ConsentRecord` → packet.trust.consent ·
`CallEffectManifest` → packet.governance.manifest_digest · `TurnLease` → packet.governance.active_lease ·
`ProviderVoiceEvent` → packet.provenance + packet.evidence · `CallReceipt` → packet.receipt ·
`PillBinding` → deployment plane (not in the packet; referenced by pill_id).

## Slice acceptance criteria

- [ ] All seven contracts schema-defined and versioned (`voice.v1`).
- [ ] Every fixture above exists and its expectation is asserted by test.
- [ ] Fonoster event mapping verified against the actual fork (not upstream docs).
- [ ] Cross-tenant and tamper fixtures fail closed in the simulator.
- [ ] Human review of this document before VOICE-002 (policy/consent engine) begins.
