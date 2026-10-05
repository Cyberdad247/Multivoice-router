import type { CartridgeManifest } from '../types';

/**
 * Communications cartridge manifest — derived from the forged UKG nanos:
 * - ukg-comms-cartridge-nano-v1 (authority plane, effect protocol, v1 contracts)
 * - ukg-nano-contact-center-amendment-v1 (voice governance, invariants I1–I12)
 * - ukg-nano-comms-console-aspect-v1 (htmx operator console aspect)
 * - voice-001-contracts-v1 (voice slice contracts)
 *
 * Full specs live in docs/cartridges/communications/.
 */
export const COMMUNICATIONS_CARTRIDGE_MANIFEST: CartridgeManifest = {
  id: 'camelot.communications',
  name: 'Communications Cartridge',
  version: '0.1.0',
  description:
    'Governed executive communications: drafts and dispatches narrowly approved messages. Never owns sovereignty, policy, identity, keys, receipts, or promotion.',
  status: 'not_production_ready',
  features: [
    {
      id: 'effect-protocol',
      title: 'Effect Protocol',
      description:
        '11-step governed dispatch flow: Draft Intent → checks → immutable Effect Manifest → human approval → Sentinel policy → Excalibur one-shot lease → Bifröst dispatch → signed provider event → Gideon verification → Ledger receipt → console evidence timeline.',
      status: 'specified',
      docsRef: 'docs/cartridges/communications/ukg-comms-cartridge-nano-v1.md',
    },
    {
      id: 'v1-contracts',
      title: 'v1 Contracts',
      description:
        'Intent, EffectManifest, PolicyDecision, ApprovalGrant, CapabilityLease, BifrostEvent, DispatchAttempt, ProviderEvent, GideonVerdict, Receipt — with mandatory tenant, correlation, idempotency, and digest fields.',
      status: 'specified',
      docsRef: 'docs/cartridges/communications/ukg-comms-cartridge-nano-v1.md',
    },
    {
      id: 'dispatch-state-machine',
      title: 'Dispatch State Machine',
      description:
        'draft → approval_required → authorized → dispatched → verifying → completed, with failed, reconciliation_required, quarantined, and cancelled terminals. Ambiguous outcomes reconcile; they never blindly resend.',
      status: 'specified',
      docsRef: 'docs/cartridges/communications/ukg-comms-cartridge-nano-v1.md',
    },
    {
      id: 'console-aspect',
      title: 'Operator Console Aspect',
      description:
        'htmx + Go fragment console (camelot.communications.console): draft, approval, status, evidence, and reconciliation fragments. Views only — approvals bind to manifest bytes, never rendered HTML; no ambient browser authority.',
      status: 'specified',
      docsRef: 'docs/cartridges/communications/ukg-nano-comms-console-aspect-v1.md',
    },
    {
      id: 'voice-contracts',
      title: 'VOICE-001 Voice Contracts',
      description:
        'VoiceIntent, CallEffectManifest, ConsentRecord, TurnLease, ProviderVoiceEvent, CallReceipt, PillBinding — plus 12 fixtures (tamper, expiry, cross-tenant, consent, malicious transcript, pill escape) and acceptance criteria.',
      status: 'specified',
      docsRef: 'docs/cartridges/communications/voice-001-contracts-v1.md',
    },
    {
      id: 'contact-center-governance',
      title: 'Contact Center Governance',
      description:
        'Invariants I1–I12: knowledge proposes / policy authorizes, compression preserves provenance, no model-minted authority, mandatory human transfer under uncertainty, ledger records verified outcomes only. Promotion gates from dev through production.',
      status: 'specified',
      docsRef: 'docs/cartridges/communications/ukg-nano-contact-center-amendment-v1.md',
    },
    {
      id: 'telephony-provider',
      title: 'Telephony Provider',
      description:
        'Self-hosted Fonoster (github.com/Cyberdad247/fonoster): Docker-first images run INSIDE microVMs, managed by a Pill (Knight) running verified autonomous workflows. SIP trunk + DID still required for PSTN.',
      status: 'decided',
      docsRef: 'docs/cartridges/communications/ukg-nano-contact-center-amendment-v1.md',
    },
    {
      id: 'release-gate',
      title: 'Production Release Gate',
      description:
        '10 gate requirements including versioned contracts, denial suites green, idempotency/reconciliation/tenant-isolation proven, and canary-only sends with per-send human approval. Blocked until evidence is human-reviewed.',
      status: 'blocked',
      docsRef: 'docs/cartridges/communications/ukg-comms-cartridge-nano-v1.md',
    },
  ],
  contracts: [
    { name: 'VoiceIntent', version: 'voice.v1', summary: 'Bounded caller goal proposal; not authority.' },
    { name: 'CallEffectManifest', version: 'voice.v1', summary: 'Immutable, digest-bound, expiring effect manifest.' },
    { name: 'ConsentRecord', version: 'voice.v1', summary: 'Recording + AI disclosure consent evidence.' },
    { name: 'TurnLease', version: 'voice.v1', summary: 'One-shot, manifest-bound, revocable capability lease.' },
    { name: 'ProviderVoiceEvent', version: 'voice.v1', summary: 'Normalized, sequenced, signature-checked provider event.' },
    { name: 'CallReceipt', version: 'voice.v1', summary: 'Gideon-verified terminal receipt; canonical evidence.' },
    { name: 'PillBinding', version: 'voice.v1', summary: 'Pill (Knight) managing voice microVMs; bounded tasks only.' },
  ],
  invariants: [
    'Knowledge may propose; policy authorizes.',
    'Compression may remove redundancy; it may not erase source provenance.',
    'A summary cannot upgrade trust classification.',
    'A model cannot mint authority.',
    'Provider reachability is not permission.',
    'No cross-tenant retrieval, projection, action, or receipt access.',
    'No consequential effect without manifest, policy decision, and one-shot lease.',
    'Unknown provider result means reconciliation, never blind retry.',
    'Human transfer is mandatory under request, uncertainty, sensitivity, distress, or safety threshold.',
    'The Ledger records verified outcomes; it does not treat intent as completion.',
    'The UI may request and explain; it cannot hold ambient provider authority.',
    'Learning is offline-evaluated and canary-promoted; raw call data never self-trains production behavior.',
  ],
  source: {
    repoUrl: 'https://github.com/Cyberdad247/Camelot-OS-communication-cartridge-',
    docsPath: 'docs/cartridges/communications/',
    upstreamUrl: 'https://github.com/fonoster/fonoster',
  },
};
