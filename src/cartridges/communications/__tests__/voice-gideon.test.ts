/**
 * VOICE-004 Gideon verification + receipt chain tests.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  gideonVerify,
  receiptChainDigest,
  verifyReceiptChain,
  type GideonInput,
} from '../gideon';
import { dispatch, signSimulatorEvent, type DispatchInput } from '../simulator';
import { bindApproval, issueLease, revokeLease } from '../policy';
import type {
  CallEffectManifest,
  TurnLease,
  ConsentRecord,
  CallReceipt,
  ProviderVoiceEvent,
} from '../contracts';
import type { ApprovalGrant } from '../policy';

const FIX = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'voice-v1');
const load = (name: string) => JSON.parse(readFileSync(join(FIX, name), 'utf8'));
const NOW = '2026-10-04T22:30:00Z';
const SECRET = 'test-secret-001';

async function pipeline(scenario: DispatchInput['scenario'], secret: string = SECRET) {
  const manifest = load('valid-manifest.json') as CallEffectManifest;
  const consent = load('granted-consent.json') as ConsentRecord;
  const { approval } = await bindApproval(manifest, 'op_human_01', { nowIso: NOW });
  const { lease } = issueLease(manifest, approval as ApprovalGrant, { nowIso: NOW });
  const result = await dispatch({
    manifest,
    lease: lease as TurnLease,
    approval: approval as ApprovalGrant,
    consent,
    sessionTenantId: 'tenant_acme',
    scenario,
    config: { hmacSecret: secret, nowIso: NOW },
    idempotencyStore: new Map(),
    nowIso: NOW,
  });
  if (result.status !== 'dispatched') throw new Error('setup dispatch failed');
  return { manifest, consent, approval: approval as ApprovalGrant, result };
}

function gideonInput(p: Awaited<ReturnType<typeof pipeline>>, overrides: Partial<GideonInput> = {}): GideonInput {
  return {
    manifest: p.manifest,
    approval: p.approval,
    lease: p.result.lease as TurnLease,
    consent: p.consent,
    events: p.result.events as ProviderVoiceEvent[],
    receipt: p.result.receipt as CallReceipt,
    sessionTenantId: 'tenant_acme',
    hmacSecret: SECRET,
    nowIso: NOW,
    ...overrides,
  };
}

describe('Gideon pass', () => {
  it('passes a clean happy-path dispatch and finalizes the receipt', async () => {
    const p = await pipeline('happy_path');
    const v = await gideonVerify(gideonInput(p));
    expect(v.verdict).toBe('pass');
    expect(v.checks.every((c) => c.pass)).toBe(true);
    expect(v.checks.length).toBe(9);
    expect(v.receipt.gideon_verdict).toBe('pass');
  });

  it('passes a reconciliation receipt (timeout) as internally consistent', async () => {
    const p = await pipeline('timeout_after_accept');
    const v = await gideonVerify(gideonInput(p));
    expect(v.verdict).toBe('pass');
    expect(v.receipt.outcome).toBe('reconciliation_required');
    expect(v.receipt.gideon_verdict).toBe('pass');
  });

  it('fails a dispatch whose unsigned event slipped through (Gideon re-verifies)', async () => {
    const p = await pipeline('unsigned_event');
    const v = await gideonVerify(gideonInput(p));
    expect(v.verdict).toBe('fail');
    expect(v.checks.find((c) => c.name === 'event-signatures')?.pass).toBe(false);
    expect(v.receipt.gideon_verdict).toBe('pending'); // never finalized on fail
  });
});

describe('Gideon failures', () => {
  it('fails on post-dispatch manifest mutation', async () => {
    const p = await pipeline('happy_path');
    const mutated = { ...p.manifest, action: 'send_followup_sms' } as CallEffectManifest;
    const v = await gideonVerify(gideonInput(p, { manifest: mutated }));
    expect(v.verdict).toBe('fail');
    expect(v.checks.find((c) => c.name === 'manifest-digest')?.pass).toBe(false);
  });

  it('fails on a tampered event signature', async () => {
    const p = await pipeline('happy_path');
    const events = [...(p.result.events as ProviderVoiceEvent[])];
    events[2] = { ...events[2], event_sequence: 99 }; // signature no longer matches
    const v = await gideonVerify(gideonInput(p, { events }));
    expect(v.verdict).toBe('fail');
    expect(v.checks.find((c) => c.name === 'event-signatures')?.pass).toBe(false);
  });

  it('fails on a cross-tenant event (re-signed, so signatures pass)', async () => {
    const p = await pipeline('happy_path');
    const events = [...(p.result.events as ProviderVoiceEvent[])];
    const rogue = { ...events[1], tenant_id: 'tenant_evil', signature: '', signature_valid: 'missing' as const };
    events[1] = await signSimulatorEvent(rogue, SECRET);
    const v = await gideonVerify(gideonInput(p, { events }));
    expect(v.verdict).toBe('fail');
    expect(v.checks.find((c) => c.name === 'event-signatures')?.pass).toBe(true);
    expect(v.checks.find((c) => c.name === 'tenant-consistency')?.pass).toBe(false);
  });

  it('fails on a revoked lease', async () => {
    const p = await pipeline('happy_path');
    const killed = revokeLease(p.result.lease as TurnLease);
    const v = await gideonVerify(gideonInput(p, { lease: killed }));
    expect(v.verdict).toBe('fail');
    expect(v.checks.find((c) => c.name === 'lease-binding')?.pass).toBe(false);
  });

  it('fails when approval binds another digest', async () => {
    const p = await pipeline('happy_path');
    const v = await gideonVerify(
      gideonInput(p, { approval: { ...p.approval, manifest_digest: '00'.repeat(32) } }),
    );
    expect(v.verdict).toBe('fail');
    expect(v.checks.find((c) => c.name === 'approval-binding')?.pass).toBe(false);
  });

  it('fails on a duplicate receipt id', async () => {
    const p = await pipeline('happy_path');
    const seen = new Set([(p.result.receipt as CallReceipt).receipt_id]);
    const v = await gideonVerify(gideonInput(p, { seenReceiptIds: seen }));
    expect(v.verdict).toBe('fail');
    expect(v.checks.find((c) => c.name === 'receipt-unique')?.pass).toBe(false);
  });

  it('fails when the receipt outcome contradicts the events', async () => {
    const p = await pipeline('happy_path');
    const receipt = { ...(p.result.receipt as CallReceipt), outcome: 'reconciliation_required' as const };
    const v = await gideonVerify(gideonInput(p, { receipt }));
    expect(v.verdict).toBe('fail');
    expect(v.checks.find((c) => c.name === 'outcome-consistent')?.pass).toBe(false);
  });

  it('fails on dangling evidence refs', async () => {
    const p = await pipeline('happy_path');
    const receipt = {
      ...(p.result.receipt as CallReceipt),
      provider_evidence_refs: [...(p.result.receipt as CallReceipt).provider_evidence_refs, 'pc_x:99'],
    };
    const v = await gideonVerify(gideonInput(p, { receipt }));
    expect(v.verdict).toBe('fail');
    expect(v.checks.find((c) => c.name === 'evidence-refs')?.pass).toBe(false);
  });
});

describe('tamper-evident receipt chain', () => {
  async function linkedReceipts(): Promise<CallReceipt[]> {
    const p = await pipeline('happy_path');
    const base = p.result.receipt as CallReceipt;
    const r1: CallReceipt = { ...base, receipt_id: 'rcpt_chain_1', prev_receipt_digest: null };
    const r2: CallReceipt = {
      ...base,
      receipt_id: 'rcpt_chain_2',
      prev_receipt_digest: await receiptChainDigest(r1),
    };
    const r3: CallReceipt = {
      ...base,
      receipt_id: 'rcpt_chain_3',
      prev_receipt_digest: await receiptChainDigest(r2),
    };
    return [r1, r2, r3];
  }

  it('verifies an intact chain', async () => {
    const [r1, r2, r3] = await linkedReceipts();
    const d1 = await receiptChainDigest(r1);
    const d2 = await receiptChainDigest(r2);
    const v = await verifyReceiptChain([
      { receipt: r1, prevDigest: null },
      { receipt: r2, prevDigest: d1 },
      { receipt: r3, prevDigest: d2 },
    ]);
    expect(v.ok).toBe(true);
    expect(v.breaks).toEqual([]);
  });

  it('detects a tampered middle receipt', async () => {
    const [r1, r2, r3] = await linkedReceipts();
    const tamperedR2 = { ...r2, outcome: 'quarantined' as const }; // digest changes
    const d1 = await receiptChainDigest(r1);
    const d2 = await receiptChainDigest(r2); // original digest r3 was linked to
    const v = await verifyReceiptChain([
      { receipt: r1, prevDigest: null },
      { receipt: tamperedR2, prevDigest: d1 },
      { receipt: r3, prevDigest: d2 },
    ]);
    expect(v.ok).toBe(false);
    expect(v.breaks).toContain(2); // r3's link no longer matches tampered r2
  });
});
