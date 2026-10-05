/**
 * VOICE-003 simulator tests: dispatch flow, signing, scenarios, normalizer.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  dispatch,
  signSimulatorEvent,
  verifySimulatorEvent,
  normalizeWebhook,
  type DispatchInput,
  type SimulatorConfig,
} from '../simulator';
import { bindApproval, issueLease } from '../policy';
import type {
  CallEffectManifest,
  TurnLease,
  ConsentRecord,
  ProviderVoiceEvent,
} from '../contracts';
import type { ApprovalGrant } from '../policy';

const FIX = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'voice-v1');
const load = (name: string) => JSON.parse(readFileSync(join(FIX, name), 'utf8'));
const NOW = '2026-10-04T22:20:00Z';
const CONFIG: SimulatorConfig = { hmacSecret: 'test-secret-001', nowIso: NOW };

async function approvedDispatchInput(
  scenario: DispatchInput['scenario'],
  overrides: Partial<DispatchInput> = {},
): Promise<DispatchInput> {
  const manifest = load('valid-manifest.json') as CallEffectManifest;
  const { approval } = await bindApproval(manifest, 'op_human_01', { nowIso: NOW });
  const { lease } = issueLease(manifest, approval as ApprovalGrant, { nowIso: NOW });
  return {
    manifest,
    lease: lease as TurnLease,
    approval: approval as ApprovalGrant,
    consent: load('granted-consent.json') as ConsentRecord,
    sessionTenantId: 'tenant_acme',
    scenario,
    config: CONFIG,
    idempotencyStore: new Map(),
    nowIso: NOW,
    ...overrides,
  };
}

describe('happy path dispatch', () => {
  it('dispatches policy -> approval -> lease -> events -> receipt', async () => {
    const r = await dispatch(await approvedDispatchInput('happy_path'));
    expect(r.status).toBe('dispatched');
    expect(r.lease?.consumed).toBe(true);
    expect(r.events?.map((e) => e.event_type)).toEqual([
      'offered',
      'answered',
      'transcript_final',
      'ended',
    ]);
    expect(r.events?.every((e) => e.signature_valid === 'verified')).toBe(true);
    expect(r.receipt?.outcome).toBe('completed');
    expect(r.receipt?.gideon_verdict).toBe('pending');
    expect(r.receipt?.manifest_digest).toBe((load('valid-manifest.json') as CallEffectManifest).canonical_digest);
    expect(r.reconciliation?.required).toBe(false);
  });

  it('is deterministic: same inputs produce identical digests and signatures', async () => {
    const a = await dispatch(await approvedDispatchInput('happy_path'));
    const b = await dispatch(await approvedDispatchInput('happy_path'));
    expect(a.events?.map((e) => e.signature)).toEqual(b.events?.map((e) => e.signature));
  });
});

describe('denials', () => {
  it('denies dispatch for a tampered manifest', async () => {
    const input = await approvedDispatchInput('happy_path', {
      manifest: load('tampered-manifest.json') as CallEffectManifest,
    });
    const r = await dispatch(input);
    expect(r.status).toBe('denied');
  });

  it('denies dispatch on a consumed lease (no re-dispatch)', async () => {
    const input = await approvedDispatchInput('happy_path');
    input.lease = { ...input.lease, consumed: true };
    const r = await dispatch(input);
    expect(r.status).toBe('denied');
    expect(r.denialReasons?.join(' ')).toMatch(/consumed/);
  });

  it('denies dispatch when approval binds another digest', async () => {
    const input = await approvedDispatchInput('happy_path');
    input.approval = { ...input.approval, manifest_digest: '00'.repeat(32) };
    const r = await dispatch(input);
    expect(r.status).toBe('denied');
  });
});

describe('idempotency', () => {
  it('returns the original result on duplicate idempotency key', async () => {
    const store = new Map();
    const first = await dispatch(await approvedDispatchInput('happy_path', { idempotencyStore: store }));
    expect(first.status).toBe('dispatched');
    const second = await dispatch(await approvedDispatchInput('happy_path', { idempotencyStore: store }));
    expect(second.status).toBe('duplicate');
    expect(second.events).toBeUndefined();
  });
});

describe('failure scenarios -> reconciliation, never blind retry', () => {
  it('timeout after accept -> reconciliation_required', async () => {
    const r = await dispatch(await approvedDispatchInput('timeout_after_accept'));
    expect(r.status).toBe('dispatched');
    expect(r.receipt?.outcome).toBe('reconciliation_required');
    expect(r.reconciliation?.required).toBe(true);
    expect(r.reconciliation?.reason).toMatch(/No blind retry/);
  });

  it('provider error -> reconciliation_required', async () => {
    const r = await dispatch(await approvedDispatchInput('provider_error'));
    expect(r.receipt?.outcome).toBe('reconciliation_required');
    expect(r.reconciliation?.required).toBe(true);
  });

  it('duplicate webhook is deduplicated', async () => {
    const r = await dispatch(await approvedDispatchInput('duplicate_webhook'));
    expect(r.events?.length).toBe(4);
    expect(r.anomalies?.join(' ')).toMatch(/deduplicated/);
    expect(r.receipt?.outcome).toBe('completed');
  });

  it('out-of-order events are flagged but the call completes', async () => {
    const r = await dispatch(await approvedDispatchInput('out_of_order'));
    expect(r.anomalies?.join(' ')).toMatch(/Out-of-order arrival/);
    expect(r.receipt?.outcome).toBe('completed');
  });

  it('unsigned event is quarantined', async () => {
    const r = await dispatch(await approvedDispatchInput('unsigned_event'));
    const quarantined = r.events?.filter((e) => e.signature_valid !== 'verified');
    expect(quarantined?.length).toBe(1);
    expect(r.anomalies?.join(' ')).toMatch(/quarantined/i);
  });
});

describe('HMAC signing', () => {
  it('signs and verifies; tampering breaks verification', async () => {
    const base = load('valid-event.json') as ProviderVoiceEvent;
    const signed = await signSimulatorEvent({ ...base, signature: '', signature_valid: 'missing' }, CONFIG.hmacSecret);
    expect(await verifySimulatorEvent(signed, CONFIG.hmacSecret)).toBe(true);
    expect(await verifySimulatorEvent({ ...signed, event_sequence: 999 }, CONFIG.hmacSecret)).toBe(false);
    expect(await verifySimulatorEvent(signed, 'wrong-secret')).toBe(false);
  });
});

describe('webhook normalizer', () => {
  it('normalizes a signed payload', async () => {
    const base = load('valid-event.json') as ProviderVoiceEvent;
    const signed = await signSimulatorEvent({ ...base, signature: '', signature_valid: 'missing' }, CONFIG.hmacSecret);
    const n = await normalizeWebhook(
      {
        provider_call_id: signed.provider_call_id,
        event_type: signed.event_type,
        sequence: signed.event_sequence,
        tenant_id: signed.tenant_id,
        signature: signed.signature,
        payload_ref: signed.payload_ref,
        received_at: signed.received_at,
      },
      { tenantId: 'tenant_acme', callSessionId: 'cs_001', secret: CONFIG.hmacSecret, nowIso: NOW },
    );
    expect(n.quarantined).toBe(false);
    expect(n.event.signature_valid).toBe('verified');
  });

  it('quarantines a payload with no signature', async () => {
    const n = await normalizeWebhook(
      { provider_call_id: 'pc_x', event_type: 'offered', sequence: 1, received_at: NOW },
      { tenantId: 'tenant_acme', callSessionId: 'cs_001', secret: CONFIG.hmacSecret, nowIso: NOW },
    );
    expect(n.quarantined).toBe(true);
    expect(n.reason).toMatch(/Missing signature/);
  });

  it('maps unknown event types to error', async () => {
    const n = await normalizeWebhook(
      { provider_call_id: 'pc_x', event_type: 'teleport', sequence: 1, signature: 'x', received_at: NOW },
      { tenantId: 'tenant_acme', callSessionId: 'cs_001', secret: CONFIG.hmacSecret, nowIso: NOW },
    );
    expect(n.event.event_type).toBe('error');
    expect(n.quarantined).toBe(true);
  });
});
