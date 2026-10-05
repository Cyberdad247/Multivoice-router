/**
 * VOICE-002 policy / consent / approval / lease tests.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  evaluateIntentPolicy,
  evaluateManifestPolicy,
  bindApproval,
  issueLease,
  revokeLease,
  resolveConsent,
  disclosureRequired,
  type ApprovalGrant,
} from '../policy';
import {
  validateTurnLease,
  type VoiceIntent,
  type CallEffectManifest,
  type ConsentRecord,
  type TurnLease,
} from '../contracts';

const FIX = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'voice-v1');
const load = (name: string) => JSON.parse(readFileSync(join(FIX, name), 'utf8'));
const NOW = '2026-10-04T22:10:00Z';

describe('Intent policy', () => {
  it('allows a well-formed intent to proceed to drafting (proposes only)', () => {
    const r = evaluateIntentPolicy(load('valid-intent.json') as VoiceIntent);
    expect(r.decision).toBe('allow');
  });

  it('denies an intent missing tenant binding', () => {
    const r = evaluateIntentPolicy(load('invalid-intent.json') as VoiceIntent);
    expect(r.decision).toBe('deny');
  });
});

describe('Manifest policy', () => {
  const manifest = () => load('valid-manifest.json') as CallEffectManifest;
  const consent = () => load('granted-consent.json') as ConsentRecord;

  it('requires human approval for a valid external-effect manifest', async () => {
    const r = await evaluateManifestPolicy({
      manifest: manifest(),
      consent: consent(),
      sessionTenantId: 'tenant_acme',
      nowIso: NOW,
    });
    expect(r.decision).toBe('approval_required');
    expect(r.manifestDigest).toBe(manifest().canonical_digest);
  });

  it('denies recording without consent', async () => {
    const m = { ...manifest(), action: 'start_recording' } as CallEffectManifest;
    // recompute digest so the denial is purely about consent
    const { computeManifestDigest } = await import('../contracts');
    m.canonical_digest = await computeManifestDigest(m);
    const r = await evaluateManifestPolicy({
      manifest: m,
      consent: load('unknown-consent.json') as ConsentRecord,
      sessionTenantId: 'tenant_acme',
      nowIso: NOW,
    });
    expect(r.decision).toBe('deny');
    expect(r.reasons.join(' ')).toMatch(/consent/i);
  });

  it('denies prohibited actions unconditionally', async () => {
    const m = { ...manifest(), action: 'autonomous_dial' } as unknown as CallEffectManifest;
    const r = await evaluateManifestPolicy({
      manifest: m,
      consent: consent(),
      sessionTenantId: 'tenant_acme',
      nowIso: NOW,
    });
    expect(r.decision).toBe('deny');
    expect(r.reasons.join(' ')).toMatch(/Prohibited/);
  });

  it('denies unknown actions (closed set)', async () => {
    const m = { ...manifest(), action: 'launch_missiles' } as unknown as CallEffectManifest;
    const r = await evaluateManifestPolicy({
      manifest: m,
      consent: consent(),
      sessionTenantId: 'tenant_acme',
      nowIso: NOW,
    });
    expect(r.decision).toBe('deny');
    expect(r.reasons.join(' ')).toMatch(/Unknown action/);
  });

  it('denies cross-tenant manifests', async () => {
    const r = await evaluateManifestPolicy({
      manifest: manifest(),
      consent: consent(),
      sessionTenantId: 'tenant_evil',
      nowIso: NOW,
    });
    expect(r.decision).toBe('deny');
    expect(r.reasons.join(' ')).toMatch(/Cross-tenant/);
  });

  it('denies expired manifests', async () => {
    const r = await evaluateManifestPolicy({
      manifest: load('expired-manifest.json') as CallEffectManifest,
      consent: consent(),
      sessionTenantId: 'tenant_acme',
      nowIso: NOW,
    });
    expect(r.decision).toBe('deny');
    expect(r.reasons.join(' ')).toMatch(/expired/);
  });

  it('denies tampered manifests', async () => {
    const r = await evaluateManifestPolicy({
      manifest: load('tampered-manifest.json') as CallEffectManifest,
      consent: consent(),
      sessionTenantId: 'tenant_acme',
      nowIso: NOW,
    });
    expect(r.decision).toBe('deny');
    expect(r.reasons.join(' ')).toMatch(/Digest mismatch/);
  });

  it('denies when consent belongs to another session', async () => {
    const other = { ...(load('granted-consent.json') as ConsentRecord), call_session_id: 'cs_999' };
    const r = await evaluateManifestPolicy({
      manifest: manifest(),
      consent: other,
      sessionTenantId: 'tenant_acme',
      nowIso: NOW,
    });
    expect(r.decision).toBe('deny');
    expect(r.reasons.join(' ')).toMatch(/does not belong to this call session/);
  });
});

describe('Approval binding', () => {
  it('binds a human approver to the exact digest', async () => {
    const m = load('valid-manifest.json') as CallEffectManifest;
    const r = await bindApproval(m, 'op_human_01', { nowIso: NOW });
    expect(r.ok).toBe(true);
    expect(r.approval?.manifest_digest).toBe(m.canonical_digest);
    expect(r.approval?.approver).toBe('op_human_01');
  });

  it('refuses approval without an approver identity (no self-approval)', async () => {
    const r = await bindApproval(load('valid-manifest.json') as CallEffectManifest, '', { nowIso: NOW });
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/Approver identity/);
  });

  it('refuses approval of tampered bytes', async () => {
    const r = await bindApproval(load('tampered-manifest.json') as CallEffectManifest, 'op_human_01', { nowIso: NOW });
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/digest mismatch/i);
  });
});

describe('Lease issuance and revocation', () => {
  async function approvedSetup() {
    const m = load('valid-manifest.json') as CallEffectManifest;
    const { approval } = await bindApproval(m, 'op_human_01', { nowIso: NOW });
    return { m, approval: approval as ApprovalGrant };
  }

  it('issues a one-shot short-lived lease from a valid approval', async () => {
    const { m, approval } = await approvedSetup();
    const r = issueLease(m, approval, { nowIso: NOW });
    expect(r.ok).toBe(true);
    const lease = r.lease as TurnLease;
    expect(lease.manifest_digest).toBe(m.canonical_digest);
    expect(lease.consumed).toBe(false);
    expect(lease.revoked).toBe(false);
    // ~60s TTL
    const ttlMs = new Date(lease.expires_at).getTime() - new Date(lease.issued_at).getTime();
    expect(ttlMs).toBe(60_000);
    // and the lease validates
    const v = validateTurnLease(lease, m.canonical_digest, NOW);
    expect(v.ok).toBe(true);
  });

  it('refuses a lease when approval is bound to another digest', async () => {
    const { m } = await approvedSetup();
    const badApproval = { manifest_digest: '00'.repeat(32), expires_at: '2099-01-01T00:00:00Z' } as ApprovalGrant;
    const r = issueLease(m, badApproval, { nowIso: NOW });
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/not bound/);
  });

  it('refuses a lease from an expired approval', async () => {
    const { m, approval } = await approvedSetup();
    const expired = { ...approval, expires_at: '2020-01-01T00:00:00Z' };
    const r = issueLease(m, expired, { nowIso: NOW });
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/expired/);
  });

  it('revoked leases fail validation (kill switch)', async () => {
    const { m, approval } = await approvedSetup();
    const { lease } = issueLease(m, approval, { nowIso: NOW });
    const killed = revokeLease(lease as TurnLease);
    expect(killed.revoked).toBe(true);
    expect((lease as TurnLease).revoked).toBe(false); // original untouched
    const v = validateTurnLease(killed, m.canonical_digest, NOW);
    expect(v.ok).toBe(false);
  });
});

describe('Consent lifecycle', () => {
  it('resolves unknown consent with evidence', () => {
    const rec = load('unknown-consent.json') as ConsentRecord;
    const resolved = resolveConsent(rec, 'granted', 'transcript://cs_003#8', NOW);
    expect(resolved.recording).toBe('granted');
    expect(resolved.evidence_ref).toBe('transcript://cs_003#8');
    expect(resolved.captured_at).toBe(NOW);
  });

  it('requires disclosure in two-party jurisdictions', () => {
    expect(disclosureRequired('US-OH-two-party')).toBe(true);
    expect(disclosureRequired('US-NY-one-party')).toBe(false);
    expect(disclosureRequired(undefined)).toBe(false);
  });
});
