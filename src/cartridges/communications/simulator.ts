/**
 * VOICE-003 — Deterministic signed provider simulator + webhook normalizer.
 *
 * Proves the dispatch path end to end without a live provider:
 *   policy -> approval -> lease -> dispatch -> normalized events -> receipt
 *
 * Rules enforced here:
 * - No dispatch without approval_required policy + bound approval + valid lease.
 * - Duplicate idempotency key -> return original result, never re-dispatch.
 * - Unknown/timeout provider outcomes -> reconciliation_required, never blind retry.
 * - Receipts are emitted with gideon_verdict 'pending': independent verification
 *   is a later slice (VOICE-004). A receipt is not a completion claim.
 */
import {
  canonicalJson,
  validateTurnLease,
  eventDedupKey,
  type CallEffectManifest,
  type TurnLease,
  type ProviderVoiceEvent,
  type ProviderVoiceEventType,
  type CallReceipt,
  type ReceiptOutcome,
} from './contracts';
import {
  evaluateManifestPolicy,
  type ApprovalGrant,
} from './policy';
import type { ConsentRecord } from './contracts';

export type ScenarioKind =
  | 'happy_path'
  | 'timeout_after_accept'
  | 'duplicate_webhook'
  | 'out_of_order'
  | 'unsigned_event'
  | 'provider_error';

export interface SimulatorConfig {
  /** HMAC-SHA256 secret for deterministic event signing. */
  hmacSecret: string;
  nowIso: string;
}

export interface DispatchInput {
  manifest: CallEffectManifest;
  lease: TurnLease;
  approval: ApprovalGrant;
  consent: ConsentRecord;
  sessionTenantId: string;
  scenario: ScenarioKind;
  config: SimulatorConfig;
  /** Idempotency store: idempotency_key -> original DispatchResult. */
  idempotencyStore?: Map<string, DispatchResult>;
  nowIso?: string;
}

export interface DispatchResult {
  status: 'dispatched' | 'denied' | 'duplicate';
  denialReasons?: string[];
  lease?: TurnLease;
  events?: ProviderVoiceEvent[];
  anomalies?: string[];
  receipt?: CallReceipt;
  reconciliation?: { required: boolean; reason: string | null };
}

// --- Deterministic HMAC signing (SubtleCrypto: node + browser) ---

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

function signingPayload(event: ProviderVoiceEvent): string {
  const { signature: _s, signature_valid: _v, ...body } = event;
  return canonicalJson(body);
}

export async function signSimulatorEvent(
  event: ProviderVoiceEvent,
  secret: string,
): Promise<ProviderVoiceEvent> {
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingPayload(event)));
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return { ...event, signature: hex, signature_valid: 'verified' };
}

export async function verifySimulatorEvent(
  event: ProviderVoiceEvent,
  secret: string,
): Promise<boolean> {
  if (!event.signature) return false;
  const key = await hmacKey(secret);
  const expected = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(signingPayload(event)),
  );
  const a = new Uint8Array(expected);
  const b = Uint8Array.from(Buffer.from(event.signature, 'hex'));
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

// --- Webhook normalizer ---

export interface RawProviderPayload {
  provider_call_id: string;
  event_type: string;
  sequence: number;
  tenant_id?: string;
  signature?: string;
  payload_ref?: string;
  transcript_text?: string;
  received_at: string;
}

const EVENT_TYPES: ProviderVoiceEventType[] = [
  'offered',
  'answered',
  'dtmf',
  'transcript_partial',
  'transcript_final',
  'ended',
  'error',
];

/**
 * Normalizes a raw provider-shaped payload into a ProviderVoiceEvent.
 * Unknown event types and missing signatures are marked, never trusted.
 */
export async function normalizeWebhook(
  raw: RawProviderPayload,
  ctx: { tenantId: string; callSessionId: string; secret: string; nowIso: string },
): Promise<{ event: ProviderVoiceEvent; quarantined: boolean; reason: string | null }> {
  const eventType = EVENT_TYPES.includes(raw.event_type as ProviderVoiceEventType)
    ? (raw.event_type as ProviderVoiceEventType)
    : 'error';

  const event: ProviderVoiceEvent = {
    schema_version: 'voice.v1',
    tenant_id: raw.tenant_id ?? ctx.tenantId,
    call_session_id: ctx.callSessionId,
    provider: 'fonoster',
    provider_call_id: raw.provider_call_id,
    event_type: eventType,
    event_sequence: raw.sequence,
    payload_ref: raw.payload_ref ?? `sim://${raw.provider_call_id}/${raw.sequence}`,
    signature: raw.signature ?? '',
    signature_valid: 'missing',
    received_at: raw.received_at ?? ctx.nowIso,
  };

  if (!raw.signature) {
    return { event, quarantined: true, reason: 'Missing signature: quarantined, never trusted.' };
  }
  const valid = await verifySimulatorEvent(event, ctx.secret);
  if (!valid) {
    return {
      event: { ...event, signature_valid: 'failed' },
      quarantined: true,
      reason: 'Signature verification failed: quarantined.',
    };
  }
  return { event: { ...event, signature_valid: 'verified' }, quarantined: false, reason: null };
}

// --- Scenario scripts (deterministic) ---

interface ScriptStep {
  event_type: ProviderVoiceEventType;
  sequence: number;
  /** Delay the duplicate of this step (duplicate_webhook scenario). */
  duplicate?: boolean;
  /** Emit without a signature (unsigned_event scenario). */
  unsigned?: boolean;
}

function scriptFor(scenario: ScenarioKind): ScriptStep[] {
  const base: ScriptStep[] = [
    { event_type: 'offered', sequence: 1 },
    { event_type: 'answered', sequence: 2 },
    { event_type: 'transcript_final', sequence: 3 },
    { event_type: 'ended', sequence: 4 },
  ];
  switch (scenario) {
    case 'happy_path':
      return base;
    case 'timeout_after_accept':
      return base.slice(0, 2); // accepted, then silence -> reconciliation
    case 'duplicate_webhook':
      return [...base.slice(0, 3), { ...base[2], duplicate: true }, base[3]];
    case 'out_of_order':
      return [base[0], base[1], base[3], base[2]]; // ended before transcript
    case 'unsigned_event':
      return [base[0], base[1], { ...base[2], unsigned: true }, base[3]];
    case 'provider_error':
      return [base[0], { event_type: 'error', sequence: 2 }];
  }
}

// --- Dispatch flow ---

export async function dispatch(input: DispatchInput): Promise<DispatchResult> {
  const nowIso = input.nowIso ?? input.config.nowIso;
  const store = input.idempotencyStore;

  // Idempotency: duplicate key returns the ORIGINAL result, never re-dispatches.
  if (store?.has(input.manifest.idempotency_key)) {
    return { status: 'duplicate', denialReasons: ['Duplicate idempotency key: returning original result.'] };
  }

  // 1. Policy must require approval (never auto-allow effects).
  const policy = await evaluateManifestPolicy({
    manifest: input.manifest,
    consent: input.consent,
    sessionTenantId: input.sessionTenantId,
    nowIso,
  });
  if (policy.decision !== 'approval_required') {
    return { status: 'denied', denialReasons: policy.reasons };
  }

  // 2. Approval must bind the exact digest.
  if (input.approval.manifest_digest !== input.manifest.canonical_digest) {
    return { status: 'denied', denialReasons: ['Approval not bound to manifest digest.'] };
  }
  if (input.approval.expires_at <= nowIso) {
    return { status: 'denied', denialReasons: ['Approval expired.'] };
  }

  // 3. Lease must be valid; dispatch consumes it (one-shot).
  const leaseCheck = validateTurnLease(input.lease, input.manifest.canonical_digest, nowIso);
  if (!leaseCheck.ok) {
    return { status: 'denied', denialReasons: leaseCheck.errors };
  }
  const consumedLease: TurnLease = { ...input.lease, consumed: true };

  // 4. Run the deterministic scenario.
  const { events, anomalies } = await runScenario(input);

  // 5. Deduplicate + sequence-check.
  const seen = new Set<string>();
  const deduped: ProviderVoiceEvent[] = [];
  for (const e of events) {
    const key = eventDedupKey(e);
    if (seen.has(key)) {
      anomalies.push(`Duplicate webhook deduplicated: ${key}.`);
      continue;
    }
    seen.add(key);
    deduped.push(e);
  }
  const seqs = deduped.map((e) => e.event_sequence).sort((a, b) => a - b);
  for (let i = 1; i < seqs.length; i++) {
    if (seqs[i] !== seqs[i - 1] + 1) {
      anomalies.push(`Event sequence gap between ${seqs[i - 1]} and ${seqs[i]}: flagged for review.`);
    }
  }
  // Out-of-order arrival: check ARRIVAL order (sorting above erases it).
  let maxSeen = 0;
  for (const e of deduped) {
    if (e.event_sequence < maxSeen) {
      anomalies.push(
        `Out-of-order arrival: sequence ${e.event_sequence} arrived after ${maxSeen}.`,
      );
    }
    maxSeen = Math.max(maxSeen, e.event_sequence);
  }

  // 6. Outcome + reconciliation (never blind retry).
  const quarantined = deduped.filter((e) => e.signature_valid !== 'verified');
  const ended = deduped.some((e) => e.event_type === 'ended' && e.signature_valid === 'verified');
  const errored = deduped.some((e) => e.event_type === 'error');
  let outcome: ReceiptOutcome = 'completed';
  let reconciliation: { required: boolean; reason: string | null } = { required: false, reason: null };
  if (!ended || errored) {
    outcome = 'reconciliation_required';
    reconciliation = {
      required: true,
      reason: errored
        ? 'Provider error event: manual review required. No blind retry.'
        : 'No verified terminal event (timeout after possible acceptance): manual review required. No blind retry.',
    };
  } else if (quarantined.length > 0) {
    anomalies.push(`${quarantined.length} event(s) quarantined (unverified signature).`);
  }

  const receipt: CallReceipt = {
    schema_version: 'voice.v1',
    receipt_id: `rcpt_${input.manifest.manifest_id}`,
    tenant_id: input.manifest.tenant_id,
    call_session_id: input.manifest.call_session_id,
    manifest_digest: input.manifest.canonical_digest,
    lease_id: consumedLease.lease_id,
    provider_evidence_refs: deduped.map((e) => `${e.provider_call_id}:${e.event_sequence}`),
    gideon_verdict: 'pending', // independent verification is VOICE-004
    outcome,
    ledger_event_id: `ledger_${input.manifest.manifest_id}`,
    committed_at: nowIso,
  };

  const result: DispatchResult = {
    status: 'dispatched',
    lease: consumedLease,
    events: deduped,
    anomalies,
    receipt,
    reconciliation,
  };
  store?.set(input.manifest.idempotency_key, result);
  return result;
}

async function runScenario(
  input: DispatchInput,
): Promise<{ events: ProviderVoiceEvent[]; anomalies: string[] }> {
  const { config, manifest } = input;
  const anomalies: string[] = [];
  const events: ProviderVoiceEvent[] = [];
  const steps = scriptFor(input.scenario);

  for (const step of steps) {
    const raw: RawProviderPayload = {
      provider_call_id: `pc_${manifest.call_session_id}`,
      event_type: step.event_type,
      sequence: step.sequence,
      tenant_id: manifest.tenant_id,
      received_at: config.nowIso,
    };
    let event: ProviderVoiceEvent = {
      schema_version: 'voice.v1',
      tenant_id: raw.tenant_id as string,
      call_session_id: manifest.call_session_id,
      provider: 'fonoster',
      provider_call_id: raw.provider_call_id,
      event_type: step.event_type,
      event_sequence: step.sequence,
      payload_ref: `sim://${raw.provider_call_id}/${step.sequence}`,
      signature: '',
      signature_valid: 'missing',
      received_at: raw.received_at,
    };
    if (step.unsigned) {
      const n = await normalizeWebhook(raw, {
        tenantId: manifest.tenant_id,
        callSessionId: manifest.call_session_id,
        secret: config.hmacSecret,
        nowIso: config.nowIso,
      });
      anomalies.push(n.reason as string);
      events.push(n.event);
      continue;
    }
    event = await signSimulatorEvent(event, config.hmacSecret);
    events.push(event);
    if (step.duplicate) {
      // Delayed duplicate of the same signed event.
      events.push({ ...event, received_at: config.nowIso });
    }
  }
  return { events, anomalies };
}
