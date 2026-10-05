# VOICE-005 — Fonoster Adapter

```yaml
slice:
  id: "VOICE-005"
  parent: "UKG_NANO.CAMELOT.CONTACT_CENTER.v1"
  status: "IMPLEMENTED — 11 tests green"
  rule: "The adapter maps what the fork actually emits. Asserted-but-unverified claims are refuted below, not carried forward."
```

## Recon (Cyberdad247/fonoster @ 2123e049, 2026-10-04)

Event transport in this fork:

| Source | Transport | Shape |
|---|---|---|
| Dial progress | NATS `calls.track` | `{ ref, status }`, status ∈ TRYING/CANCEL/ANSWER/BUSY/PROGRESS/NOANSWER/FAILED |
| Raw CDR | NATS `routr.call.*` | `{ startTime, endTime, hangupCause, to, callId, extraHeaders{...} }` |
| Conversation end | Autopilot webhook (fire-and-forget) | `{ eventType: 'conversation.ended', appRef, callRef, phone, chatHistory[], recordingUrl? }` |
| DTMF / recording | In-band per-call gRPC (`GatherResponse`, `RecordResponse`) | No global feed |

## Refuted claims

- **"Routr's SIP MESSAGE with signed event envelopes" — FALSE.** No SIP MESSAGE
  handling exists in `mods/sipnet/` or anywhere in the fork; Routr communicates
  via NATS. A repo-wide search for `hmac`, `x-signature`, webhook signing
  returned **zero hits**. Nothing inbound is signed, by anyone.
- **`conversation.started` is a dead enum value** — declared in
  `eventsHookSchema.ts` but never sent. Only `conversation.ended` fires.

## Trust model

Because Fonoster signs nothing, every mapped event enters with
`signature_valid: 'missing'` (quarantined per policy). The adapter's answer is
**ingestion-boundary sealing**: our receiver — an authenticated NATS subscriber
or a webhook endpoint that checks the static secret header we configure in
`eventsHook.headers` — HMAC-seals each event on receipt (`sealInboundEvent`).

The seal attests *"our ingress received this"*, never *"the provider signed
this"*, recorded explicitly in `ingress_seal`. It is exactly as trustworthy as
the ingress transport. Gideon verification of ingress-sealed events against the
ingress key is future work (the current Gideon path covers simulator-signed
events).

## Mapping

| Fonoster | ProviderVoiceEvent |
|---|---|
| Dial TRYING/PROGRESS | `offered` |
| Dial ANSWER | `answered` |
| Dial BUSY/NOANSWER/CANCEL | `ended` |
| Dial FAILED / unknown status | `error` (unknown → quarantined, never throws) |
| Routr CDR (hangupCause) | `ended`, `payload_ref: fonoster:cdr:<ref>` |
| `conversation.ended` | `transcript_final`, recording URL or transcript digest as ref |
| `conversation.started` | `error` — quarantined, documented dead value |
| Gather digits (in-band) | `dtmf` |

## Not in scope

- Live NATS subscription / webhook receiver deployment (needs the microVM
  packaging decision — Fonoster is Docker-first, Camelot-OS runs microcubicvm).
- No live provider contact has occurred; the adapter maps shapes, it does not call Fonoster.
