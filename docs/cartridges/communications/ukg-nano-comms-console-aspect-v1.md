# `[UKG_NANO: ⚜️ COMMS_CONSOLE_ASPECT_v1]`

```yaml
UKG_NANO:
  id: "UKG_NANO.CAMELOT.COMMS_CONSOLE_ASPECT.v1"
  protocol: "ALPHA_OMEGA_DISTILLER.v1"
  status: "FORGED — architecture spec; implementation NOT started"
  compression_role: "Task-ready operational context; never a source of authority"
  decision: "The htmx-docs project is reforged as an ASPECT of the communications cartridge (not a standalone cartridge): the operator console aspect."
  canonical_sources:
    - "https://htmx-docs.vercel.app/ (verified live 2026-10-04: 'Camelot-OS · Invisioned Agentic Systems', htmx + Go fragment server)"
    - "ukg.camelot.comms-cartridge.nano.v1 (COMMS-008: operator console slice)"
    - "UKG_NANO.CAMELOT.CONTACT_CENTER.v1 (invariant I11)"
  source_integrity:
    mode: "provenance-preserved"
    summary_is_canonical: false
    receipts_are_canonical: true
```

## ALPHA — Preserve truth

```yaml
ALPHA:
  raw_inputs:
    - "Landing page of htmx-docs.vercel.app (6 lines): title, 'Initialization Complete', 'Backend Core and Frontend Shell are successfully linked', sidebar document list, htmx fetches HTML fragments from Go server and swaps into pane."
    - "User directive 2026-10-04: reforge the project as a cartridge or aspect of the communication cartridge."
  classification:
    default: "untrusted"
    exception: "First-party observations (page fetched live this session) and user directives"
  verified:
    - "The site is an htmx frontend backed by a Go server rendering HTML fragments."
    - "It presents itself as Camelot-OS / Invisioned Agentic Systems documentation."
  asserted:
    - "Repo location, route inventory, auth model, and data sources of the Go backend (not inspected)."
    - "Whether the sidebar documents include cartridge specs or are generic docs."
  unknowns:
    - "Current deployment ownership and whether the Go server enforces tenant scoping."
```

## DISTILL — Extract structure

```yaml
DISTILL:
  operational_facts:
    - "COMMS-008 already names the operator console (draft/approval/status/evidence/reconciliation) as a slice of the communications cartridge."
    - "Invariant I11: UI may request and explain; it cannot hold ambient provider authority."
    - "An htmx+Go fragment architecture is a natural fit for the console: server-rendered, no client-side state to subvert, every interaction a server round-trip."
  pending_decisions:
    - "Repo location and deployment ownership of the Go backend."
    - "Whether the console aspect also serves the contact-center supervisor views or comms-only."
  allowed_actions:
    - "Spec and forge (this file)."
    - "Read-only fragment rendering against Core APIs."
  prohibited_actions:
    - "Console-initiated provider dispatch bypassing manifest/lease."
    - "Client-side authority: no tokens, leases, or signing keys in the browser."
    - "Cross-tenant fragment rendering."
```

## The reforge: console aspect spec

```yaml
CARTRIDGE_ASPECT:
  aspect_id: "camelot.communications.console"
  parent_cartridge: "camelot.communications"
  kind: "aspect"  # not a standalone cartridge: it has no independent capability boundary
  purpose: >
    The human-facing surface of the communications cartridge: operator console
    for draft / approval / status / evidence / reconciliation, plus cartridge
    documentation. It requests; Core authorizes.

  stack:
    frontend: "htmx — server-rendered HTML fragments swapped into the pane; zero client-side authority"
    backend: "Go server — renders fragments, calls Core APIs with server-held credentials only"
    reference_implementation: "https://htmx-docs.vercel.app/ — user-confirmed as his architecture 2026-10-04 (deployment unremembered, not disputed)"

  authority_binding:
    - "Every mutating console action builds an Effect Manifest and enters approval_required; the console never dispatches."
    - "Approval binds to canonical manifest bytes, not the rendered fragment (fragments are views, not authority)."
    - "Leases are issued to Core services, never to the browser session."
    - "Evidence timeline and receipts are read projections of the Ledger; the console cannot mint or mutate them."

  fragment_contract:
    fragments:
      - "draft/:intent_id — renders the immutable manifest for human approval"
      - "approval/:manifest_digest — approve/deny binds to the digest, fails closed on mismatch"
      - "status/:correlation_id — state machine position (draft → … → completed/reconciliation_required)"
      - "evidence/:receipt_id — verified receipt + Gideon verdict timeline"
      - "reconcile/:correlation_id — ambiguous outcomes queued for human decision, never auto-retry"
    rules:
      - "Fragments are tenant-scoped server-side; tenant context is derived, never taken from the request."
      - "No fragment performs an external effect on GET; all effects are POST-bound to a manifest + lease."
      - "HTMX swaps are idempotent reads; re-requesting a fragment never re-dispatches."

  prohibited:
    - "ambient provider authority in the browser"
    - "raw secrets, lease tokens, or signing keys in fragments"
    - "autonomous send / bulk export from the console"
    - "bypassing Sentinel policy evaluation"
    - "treating a rendered fragment as an approval artifact"

  non_goals:
    - "The console does not replace the comms cartridge's API or event contracts."
    - "The console does not host the contact-center agent desktop (separate aspect if needed)."
```

## OMEGA — Bound execution

```text
Human opens console (htmx)
  → Go server renders fragment from Core read APIs (tenant-scoped)
  → Human proposes action → Draft Intent → Effect Manifest (immutable bytes)
  → Human approves EXACT manifest digest
  → Sentinel policy decision → Excalibur one-shot lease → Bifröst dispatch
  → Gideon verifies → Ledger receipt → console fragment refreshes to evidence
```

## Invariants (carried)

```yaml
INVARIANTS:
  I11: "The UI and Avatar Knight may request and explain; they cannot hold ambient provider authority."
  C1: "A fragment is a view, never an authority."
  C2: "Approval binds to manifest bytes, not rendered HTML."
  C3: "No secret material crosses into the browser, ever."
```

## TOON runtime projection

```text
con/v1
t={tenant}; view={fragment}; st={cartridge_state}
m={manifest_digest_or_null}; a={approval_state}
r={receipt_id:verdict}; x={prohibited_attempts:0}
```

## What "implement" means from here (gated)

1. Inventory the Go backend: repo, routes, auth model, tenant scoping (read-only recon first).
2. Map existing fragments/routes onto the fragment contract above; list gaps.
3. Bring the deployment under the cartridge's signed admission (registry) — no unsigned console serves approvals.
4. Wire the approval fragment to real manifest bytes (COMMS-002/003/004 contracts).
5. Each step needs explicit approval before the next begins (iron gate holds).
```

---

*2026-10-04: the htmx-docs site is live (htmx + Go fragment-swapping frontend) and user-confirmed as his architecture — he does not remember deploying it, but recognizes it as definitely his. An earlier same-day note briefly misrecorded this as disputed ownership; corrected. Backend internals (repo, routes, auth, tenant scoping) remain asserted/unknown until inventoried.* — the user does not believe he set it up. It must not be treated as his canonical infrastructure or as the reference implementation for this aspect until ownership is verified. Backend internals (repo, routes, auth, tenant scoping) are asserted/unknown until inventoried.*
