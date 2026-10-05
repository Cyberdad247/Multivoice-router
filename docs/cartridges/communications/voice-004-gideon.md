# VOICE-004 — Gideon Verification

```yaml
slice:
  id: "VOICE-004"
  parent: "UKG_NANO.CAMELOT.CONTACT_CENTER.v1"
  status: "IMPLEMENTED — 13 tests green"
  rule: "Terminal receipts exist only after a Gideon pass. Gideon re-derives; it never trusts."
```

## The independence rule

Gideon (`src/cartridges/communications/gideon.ts`) is the independent verifier.
It receives the *source artifacts* (manifest, approval, lease, consent, events,
pending receipt) and re-derives every binding from scratch. It does not read the
dispatch path's intermediate conclusions — same pure functions, raw inputs.

Nine checks, all must pass:

| # | Check | What it re-derives |
|---|---|---|
| 1 | `manifest-digest` | Digest recomputed from canonical bytes; must equal manifest + receipt digests |
| 2 | `approval-binding` | Grant bound to digest; unexpired |
| 3 | `lease-binding` | Digest, tenant, sane window, unrevoked — as of dispatch |
| 4 | `policy-reeval` | Policy re-run from raw inputs → must be `approval_required` |
| 5 | `event-signatures` | Every event signature re-verified with the HMAC secret |
| 6 | `tenant-consistency` | Exactly one tenant across all artifacts, matching the session |
| 7 | `evidence-refs` | Every receipt evidence ref resolves to a real event |
| 8 | `receipt-unique` | Receipt id not seen before (anti-replay within the chain) |
| 9 | `outcome-consistent` | Outcome recomputed from events vs. the receipt's claim |

On pass: the receipt is returned with `gideon_verdict: 'pass'`.
On fail: the receipt stays `'pending'`; failed checks name exactly what broke.

## Tamper-evident receipt chain

Each receipt carries `prev_receipt_digest` (SHA-256 of the canonical previous
receipt, `null` for the chain head). `verifyReceiptChain` walks the sequence and
reports the indexes where the chain breaks — a tampered middle receipt breaks
its successor's link, which cannot be repaired without re-hashing everything
after it.

## What Gideon does NOT do

- It does not re-run the provider (no live contact, no re-dispatch).
- It does not approve anything — approval is a human act (VOICE-002).
- It does not fix failures — failures route to reconciliation.
