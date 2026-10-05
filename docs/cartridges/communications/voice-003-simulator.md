# VOICE-003 — Provider Simulator

```yaml
slice:
  id: "VOICE-003"
  parent: "UKG_NANO.CAMELOT.CONTACT_CENTER.v1"
  status: "IMPLEMENTED — 15 tests green"
  rule: "The simulator proves the dispatch path without a live provider. It never touches real telephony."
```

## What it proves

```
policy -> approval -> lease -> dispatch -> normalized events -> receipt
```

`dispatch()` in `src/cartridges/communications/simulator.ts` enforces, in order:

1. **Policy gate** — `evaluateManifestPolicy` must return `approval_required`. Anything else denies.
2. **Approval binding** — the grant's digest must equal the manifest's canonical digest; expired grants refused.
3. **Lease validation** — via `validateTurnLease`; dispatch consumes a copy (one-shot).
4. **Idempotency** — a duplicate `idempotency_key` returns the original result; never re-dispatches.
5. **Scenario run** — deterministic scripted provider behavior (below).
6. **Normalization + verification** — HMAC-SHA256 signatures verified; unsigned/failed quarantined.
7. **Dedup + sequence audit** — duplicates collapsed; gaps and out-of-order arrivals flagged.
8. **Receipt** — emitted with `gideon_verdict: 'pending'` (independent verification is VOICE-004, not claimed here).

## Scenarios

| Scenario | Behavior |
|---|---|
| `happy_path` | offered → answered → transcript_final → ended; receipt `completed` |
| `timeout_after_accept` | accepted, then silence → `reconciliation_required`, "No blind retry" |
| `duplicate_webhook` | delayed duplicate collapsed on `(provider_call_id, event_sequence)` |
| `out_of_order` | arrival-order anomaly flagged; call still completes |
| `unsigned_event` | event quarantined (never trusted) |
| `provider_error` | error event → `reconciliation_required` |

## Determinism

Same inputs → identical digests and signatures. The HMAC secret is injected via
`SimulatorConfig`, so test, staging, and (later) canary environments use distinct secrets.
Timestamps are injected (`nowIso`); nothing reads the wall clock implicitly.

## What it does NOT do

- No live provider contact (Fonoster deployment is a separate, gated step).
- No Gideon independent verification — receipts stay `pending` by design.
- The simulator's HMAC scheme models the *interface* the real Fonoster adapter must implement, not Fonoster's actual webhook signatures (verify against the fork before building the adapter).
