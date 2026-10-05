/**
 * VOICE-005 Fonoster adapter tests — against real fork shapes (@ 2123e049).
 */
import { describe, it, expect } from 'vitest';
import {
  mapDialEvent,
  mapRoutrCdrEvent,
  mapConversationEvent,
  mapGatherDigits,
  sealInboundEvent,
  verifyIngressSeal,
  type FonosterMapContext,
} from '../fonoster';

const CTX: FonosterMapContext = {
  tenantId: 'tenant_acme',
  callSessionId: 'cs_001',
  sequence: 1,
  receivedAt: '2026-10-04T22:40:00Z',
};
const SEAL = { sealedBy: 'camelot-ingress-01', secret: 'ingress-secret-001', sealedAt: CTX.receivedAt };

describe('dial events (NATS calls.track)', () => {
  it('maps ANSWER -> answered', () => {
    const r = mapDialEvent({ ref: 'callref_1', status: 'ANSWER' }, CTX);
    expect(r.event.event_type).toBe('answered');
    expect(r.event.provider).toBe('fonoster');
    expect(r.event.provider_call_id).toBe('callref_1');
    expect(r.event.signature_valid).toBe('missing');
    expect(r.quarantined).toBe(true);
  });

  it('maps TRYING/PROGRESS -> offered, BUSY/NOANSWER/CANCEL -> ended, FAILED -> error', () => {
    expect(mapDialEvent({ ref: 'a', status: 'TRYING' }, CTX).event.event_type).toBe('offered');
    expect(mapDialEvent({ ref: 'a', status: 'PROGRESS' }, CTX).event.event_type).toBe('offered');
    expect(mapDialEvent({ ref: 'a', status: 'BUSY' }, CTX).event.event_type).toBe('ended');
    expect(mapDialEvent({ ref: 'a', status: 'NOANSWER' }, CTX).event.event_type).toBe('ended');
    expect(mapDialEvent({ ref: 'a', status: 'CANCEL' }, CTX).event.event_type).toBe('ended');
    expect(mapDialEvent({ ref: 'a', status: 'FAILED' }, CTX).event.event_type).toBe('error');
  });

  it('quarantines unknown dial statuses instead of throwing', () => {
    const r = mapDialEvent({ ref: 'a', status: 'WARPED' }, CTX);
    expect(r.event.event_type).toBe('error');
    expect(r.quarantined).toBe(true);
    expect(r.reason).toMatch(/Unknown DialStatus/);
  });
});

describe('Routr CDR events (pre-transform shape)', () => {
  it('maps the real fork field shape to ended', () => {
    const r = mapRoutrCdrEvent(
      {
        startTime: 1728000000,
        endTime: 1728000060,
        hangupCause: 'NORMAL_CLEARING',
        to: 'sip:+15551234567@sip.fonoster.local',
        callId: 'raw-call-9',
        extraHeaders: {
          'X-Access-Key-Id': 'ak_123',
          'X-Call-Ref': 'callref_9',
          'X-Dod-Number': '+15559876543',
          'X-Is-Api-Originated-Type': 'false',
          'X-Call-Direction': 'inbound',
        },
      },
      CTX,
    );
    expect(r.event.event_type).toBe('ended');
    expect(r.event.provider_call_id).toBe('callref_9');
    expect(r.event.payload_ref).toBe('fonoster:cdr:callref_9');
    expect(r.reason).toMatch(/NORMAL_CLEARING/);
  });

  it('falls back to callId when X-Call-Ref is absent', () => {
    const r = mapRoutrCdrEvent({ callId: 'raw-call-7', hangupCause: 'USER_BUSY' }, CTX);
    expect(r.event.provider_call_id).toBe('raw-call-7');
  });
});

describe('autopilot conversation webhook', () => {
  it('maps conversation.ended to transcript_final with recording ref', async () => {
    const r = await mapConversationEvent(
      {
        eventType: 'conversation.ended',
        appRef: 'app_1',
        callRef: 'callref_2',
        phone: '+15551234567',
        chatHistory: [{ human: 'hi' }, { ai: 'hello, how can I help?' }],
        recordingUrl: 'https://recordings.local/app_1_media.wav',
      },
      CTX,
    );
    expect(r.event.event_type).toBe('transcript_final');
    expect(r.event.payload_ref).toBe('https://recordings.local/app_1_media.wav');
    expect(r.reason).toMatch(/2 turns/);
  });

  it('digests the transcript when no recording URL exists', async () => {
    const r = await mapConversationEvent(
      { eventType: 'conversation.ended', callRef: 'callref_3', chatHistory: [{ human: 'x' }] },
      CTX,
    );
    expect(r.event.payload_ref).toMatch(/^transcript:sha256:[0-9a-f]{64}$/);
  });

  it('quarantines the dead conversation.started enum value', async () => {
    const r = await mapConversationEvent({ eventType: 'conversation.started', callRef: 'x' }, CTX);
    expect(r.event.event_type).toBe('error');
    expect(r.quarantined).toBe(true);
    expect(r.reason).toMatch(/no sender/);
  });
});

describe('in-band DTMF', () => {
  it('maps gather digits to dtmf', () => {
    const r = mapGatherDigits('1234', 'callref_4', CTX);
    expect(r.event.event_type).toBe('dtmf');
    expect(r.event.payload_ref).toContain('1234');
  });
});

describe('ingress sealing', () => {
  it('seals and verifies; tampering breaks the seal', async () => {
    const mapped = mapDialEvent({ ref: 'callref_5', status: 'ANSWER' }, CTX);
    const sealed = await sealInboundEvent(mapped.event, SEAL);
    expect(sealed.signature_valid).toBe('verified');
    expect(sealed.ingress_seal?.sealed_by).toBe('camelot-ingress-01');
    expect(await verifyIngressSeal(sealed, SEAL.secret)).toBe(true);
    expect(await verifyIngressSeal({ ...sealed, event_sequence: 99 }, SEAL.secret)).toBe(false);
    expect(await verifyIngressSeal(sealed, 'wrong-secret')).toBe(false);
  });

  it('refuses to verify unsealed events', async () => {
    const mapped = mapDialEvent({ ref: 'callref_6', status: 'ANSWER' }, CTX);
    expect(await verifyIngressSeal(mapped.event, SEAL.secret)).toBe(false);
  });
});
