/**
 * VOICE-005 — Fonoster adapter.
 *
 * Verified against Cyberdad247/fonoster @ 2123e049 (depth-1 recon, 2026-10-04).
 *
 * Findings that shape this adapter:
 * - Call events travel NATS (`calls.track` dial statuses; `routr.call.*` raw
 *   CDR events), Asterisk ARI, and gRPC voice-protocol streams. There is NO
 *   SIP MESSAGE event transport in this fork.
 * - NOTHING is signed: repo-wide search for hmac/x-signature/webhook signing
 *   returned zero hits. Every inbound event therefore enters with
 *   signature_valid 'missing' (quarantined) until sealed at OUR ingestion
 *   boundary via sealInboundEvent.
 * - `conversation.started` exists in the webhook enum but has no sender;
 *   only `conversation.ended` is emitted (dead enum value).
 * - DTMF (`GatherResponse.digits`) and recording live in-band on per-call
 *   gRPC streams — there is no global DTMF event feed to subscribe to.
 */
import {
  canonicalJson,
  sha256Hex,
  type ProviderVoiceEvent,
  type ProviderVoiceEventType,
} from './contracts';

export interface FonosterMapContext {
  tenantId: string;
  callSessionId: string;
  /** Assigned by the ingestion boundary (per-call monotonic). */
  sequence: number;
  receivedAt: string;
}

export interface MappedEvent {
  event: ProviderVoiceEvent;
  quarantined: boolean;
  reason: string | null;
}

const UNSIGNED_REASON =
  'Fonoster emits no signatures; seal at the ingestion boundary.';

function baseEvent(ctx: FonosterMapContext, providerCallId: string): Omit<
  ProviderVoiceEvent,
  'event_type' | 'payload_ref'
> {
  return {
    schema_version: 'voice.v1',
    tenant_id: ctx.tenantId,
    call_session_id: ctx.callSessionId,
    provider: 'fonoster',
    provider_call_id: providerCallId,
    event_sequence: ctx.sequence,
    signature: '',
    signature_valid: 'missing',
    received_at: ctx.receivedAt,
    ingress_seal: null,
  };
}

function unsigned(
  event: ProviderVoiceEvent,
  reason: string = UNSIGNED_REASON,
): MappedEvent {
  return { event, quarantined: true, reason };
}

// --- A. NATS `calls.track` dial events -------------------------------------
// Shape: { ref: string; status: DialStatus }
// DialStatus: TRYING | CANCEL | ANSWER | BUSY | PROGRESS | NOANSWER | FAILED
// (mods/apiserver/src/utils/createHandleDialEventsWithNats.ts:28-33,
//  mods/common/src/voice/Dial.ts:27-35)

export interface FonosterDialPayload {
  ref: string;
  status: string;
}

const DIAL_STATUS_MAP: Record<string, ProviderVoiceEventType> = {
  TRYING: 'offered',
  PROGRESS: 'offered',
  ANSWER: 'answered',
  BUSY: 'ended',
  NOANSWER: 'ended',
  CANCEL: 'ended',
  FAILED: 'error',
};

export function mapDialEvent(
  raw: FonosterDialPayload,
  ctx: FonosterMapContext,
): MappedEvent {
  const eventType = DIAL_STATUS_MAP[raw.status];
  const event: ProviderVoiceEvent = {
    ...baseEvent(ctx, raw.ref || 'unknown'),
    event_type: eventType ?? 'error',
    payload_ref: `fonoster:dial:${raw.ref || 'unknown'}:${raw.status}`,
  };
  if (!eventType) {
    return unsigned(event, `Unknown DialStatus '${raw.status}': quarantined. ${UNSIGNED_REASON}`);
  }
  return unsigned(event);
}

// --- B. Routr `routr.call.*` raw CDR events --------------------------------
// Pre-transform shape (defined by its consumer,
// mods/apiserver/src/events/transformEvent.ts:38-88):
// { startTime, endTime, hangupCause, to, callId,
//   extraHeaders: { 'X-Access-Key-Id', 'X-Call-Ref', 'X-Dod-Number',
//                  'X-Is-Api-Originated-Type', 'X-Call-Direction' } }

export interface FonosterRoutrPayload {
  startTime?: number;
  endTime?: number;
  hangupCause?: string;
  to?: string;
  callId?: string;
  extraHeaders?: Record<string, string>;
}

export function mapRoutrCdrEvent(
  raw: FonosterRoutrPayload,
  ctx: FonosterMapContext,
): MappedEvent {
  const headers = raw.extraHeaders ?? {};
  const providerCallId = headers['X-Call-Ref'] || raw.callId || 'unknown';
  const event: ProviderVoiceEvent = {
    ...baseEvent(ctx, providerCallId),
    event_type: 'ended',
    payload_ref: `fonoster:cdr:${providerCallId}`,
  };
  return unsigned(
    event,
    `CDR summary (hangupCause=${raw.hangupCause ?? 'unknown'}). ${UNSIGNED_REASON}`,
  );
}

// --- C. Autopilot `conversation.ended` webhook ------------------------------
// Shape (mods/autopilot/src/sendConversationEndedEvent.ts:51-57):
// { eventType: 'conversation.ended', appRef, callRef, phone,
//   chatHistory: [{human}|{ai}][], recordingUrl? }
// NOTE: 'conversation.started' is in the enum but has no sender (dead value).

export interface FonosterConversationEndedPayload {
  eventType: string;
  appRef?: string;
  callRef?: string;
  phone?: string;
  chatHistory?: Array<{ human?: string; ai?: string }>;
  recordingUrl?: string;
}

export async function mapConversationEvent(
  raw: FonosterConversationEndedPayload,
  ctx: FonosterMapContext,
): Promise<MappedEvent> {
  if (raw.eventType === 'conversation.started') {
    const event: ProviderVoiceEvent = {
      ...baseEvent(ctx, raw.callRef || 'unknown'),
      event_type: 'error',
      payload_ref: 'fonoster:conversation.started',
    };
    return unsigned(
      event,
      `'conversation.started' has no sender in the fork (dead enum value): quarantined. ${UNSIGNED_REASON}`,
    );
  }
  if (raw.eventType !== 'conversation.ended') {
    const event: ProviderVoiceEvent = {
      ...baseEvent(ctx, raw.callRef || 'unknown'),
      event_type: 'error',
      payload_ref: `fonoster:${raw.eventType}`,
    };
    return unsigned(event, `Unknown conversation eventType '${raw.eventType}': quarantined. ${UNSIGNED_REASON}`);
  }
  const transcriptDigest = await sha256Hex(canonicalJson(raw.chatHistory ?? []));
  const event: ProviderVoiceEvent = {
    ...baseEvent(ctx, raw.callRef || 'unknown'),
    event_type: 'transcript_final',
    payload_ref: raw.recordingUrl ?? `transcript:sha256:${transcriptDigest}`,
  };
  return unsigned(
    event,
    `Transcript digest ${transcriptDigest.slice(0, 16)}… (${(raw.chatHistory ?? []).length} turns). ${UNSIGNED_REASON}`,
  );
}

// --- D. In-band DTMF (per-call gRPC GatherResponse — no global feed) ---------
// Shape: GatherResponse = VerbResponse & { speech?, digits?, responseTime }
// (mods/common/src/voice/Gather.ts:36-40)

export function mapGatherDigits(
  digits: string,
  providerCallId: string,
  ctx: FonosterMapContext,
): MappedEvent {
  const event: ProviderVoiceEvent = {
    ...baseEvent(ctx, providerCallId),
    event_type: 'dtmf',
    payload_ref: `fonoster:dtmf:${providerCallId}:${digits}`,
  };
  return unsigned(event, `In-band DTMF digits='${digits}'. ${UNSIGNED_REASON}`);
}

// --- Ingestion-boundary sealing --------------------------------------------
// Our receiver (authenticated NATS subscriber / header-checked webhook
// endpoint) seals each event on receipt with OUR HMAC key. The seal attests
// receipt, not provider origin.

export interface IngressSealConfig {
  sealedBy: string;
  secret: string;
  sealedAt: string;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

function sealPayload(event: ProviderVoiceEvent): string {
  const { signature: _s, signature_valid: _v, ingress_seal: _i, ...body } = event;
  return canonicalJson(body);
}

export async function sealInboundEvent(
  event: ProviderVoiceEvent,
  seal: IngressSealConfig,
): Promise<ProviderVoiceEvent> {
  const sealed: ProviderVoiceEvent = {
    ...event,
    ingress_seal: { sealed_by: seal.sealedBy, sealed_at: seal.sealedAt },
  };
  const key = await hmacKey(seal.secret);
  const payload = sealPayload(sealed) + canonicalJson(sealed.ingress_seal);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return { ...sealed, signature: hex, signature_valid: 'verified' };
}

export async function verifyIngressSeal(
  event: ProviderVoiceEvent,
  secret: string,
): Promise<boolean> {
  if (!event.signature || !event.ingress_seal) return false;
  const key = await hmacKey(secret);
  const payload = sealPayload(event) + canonicalJson(event.ingress_seal);
  const expected = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const a = new Uint8Array(expected);
  const b = Uint8Array.from(Buffer.from(event.signature, 'hex'));
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
