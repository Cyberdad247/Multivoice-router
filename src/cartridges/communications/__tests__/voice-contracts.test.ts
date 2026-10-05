/**
 * VOICE-001 contract + validator tests.
 * Each test maps to a fixture in fixtures/voice-v1/ per the VOICE-001 table.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  validateVoiceIntent,
  validateConsentForAction,
  validateTurnLease,
  validateManifestDigest,
  validateProviderEventCrossTenant,
  isPillTaskAllowed,
  isDuplicateEvent,
  computeManifestDigest,
  type VoiceIntent,
  type CallEffectManifest,
  type TurnLease,
  type ProviderVoiceEvent,
  type ConsentRecord,
  type PillBinding,
} from '../contracts';

const FIX = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'voice-v1');
const load = (name: string) => JSON.parse(readFileSync(join(FIX, name), 'utf8'));

describe('VoiceIntent', () => {
  it('accepts a valid intent', () => {
    const r = validateVoiceIntent(load('valid-intent.json') as VoiceIntent);
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it('rejects an intent missing tenant_id', () => {
    const r = validateVoiceIntent(load('invalid-intent.json') as VoiceIntent);
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/tenant_id/);
  });
});

describe('CallEffectManifest digest binding', () => {
  it('accepts a manifest whose digest matches its canonical bytes', async () => {
    const r = await validateManifestDigest(load('valid-manifest.json') as CallEffectManifest);
    expect(r.ok).toBe(true);
  });

  it('denies a tampered manifest (one byte changed post-approval)', async () => {
    const tampered = load('tampered-manifest.json') as CallEffectManifest;
    // sanity: the tampered doc really does differ from a freshly computed digest
    const recomputed = await computeManifestDigest(tampered);
    expect(recomputed).not.toBe(tampered.canonical_digest);
    const r = await validateManifestDigest(tampered);
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/Digest mismatch/);
  });

  it('fails closed on an expired manifest', async () => {
    const r = await validateManifestDigest(load('expired-manifest.json') as CallEffectManifest);
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/expired/);
  });
});

describe('TurnLease', () => {
  const digest = (load('valid-manifest.json') as CallEffectManifest).canonical_digest;

  it('accepts a valid lease bound to the approved digest', () => {
    const r = validateTurnLease(load('valid-lease.json') as TurnLease, digest, '2026-10-04T21:00:00Z');
    expect(r.ok).toBe(true);
  });

  it('denies an expired lease', () => {
    const r = validateTurnLease(load('expired-lease.json') as TurnLease, digest, '2026-10-04T21:00:00Z');
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/expired/);
  });

  it('denies a consumed lease (no re-dispatch)', () => {
    const r = validateTurnLease(load('consumed-lease.json') as TurnLease, digest, '2026-10-04T21:00:00Z');
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/consumed/);
  });

  it('denies a lease bound to the wrong manifest', () => {
    const r = validateTurnLease(load('wrong-manifest-lease.json') as TurnLease, digest, '2026-10-04T21:00:00Z');
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/not bound/);
  });

  it('denies a revoked lease', () => {
    const r = validateTurnLease(load('revoked-lease.json') as TurnLease, digest, '2026-10-04T21:00:00Z');
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/revoked/);
  });
});

describe('ProviderVoiceEvent trust', () => {
  it('accepts a verified same-tenant event', () => {
    const r = validateProviderEventCrossTenant(
      load('valid-event.json') as ProviderVoiceEvent,
      'tenant_acme',
    );
    expect(r.ok).toBe(true);
  });

  it('denies a cross-tenant event', () => {
    const r = validateProviderEventCrossTenant(
      load('cross-tenant-event.json') as ProviderVoiceEvent,
      'tenant_acme',
    );
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/Cross-tenant/);
  });

  it('quarantines an unsigned event', () => {
    const r = validateProviderEventCrossTenant(
      load('unsigned-event.json') as ProviderVoiceEvent,
      'tenant_acme',
    );
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/not signature-verified/);
  });

  it('deduplicates a delayed duplicate webhook', () => {
    const seen = new Set<string>();
    const a = load('duplicate-webhook-a.json') as ProviderVoiceEvent;
    const b = load('duplicate-webhook-b.json') as ProviderVoiceEvent;
    expect(isDuplicateEvent(seen, a).duplicate).toBe(false);
    const dup = isDuplicateEvent(seen, b);
    expect(dup.duplicate).toBe(true);
    expect(dup.key).toBe('pc_001:7');
  });
});

describe('Consent gating', () => {
  it('blocks start_recording when consent is unknown', () => {
    const r = validateConsentForAction(
      load('unknown-consent.json') as ConsentRecord,
      'start_recording',
    );
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/unknown/);
  });

  it('blocks start_recording when consent is declined', () => {
    const r = validateConsentForAction(
      load('declined-consent.json') as ConsentRecord,
      'start_recording',
    );
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/not consented/);
  });

  it('allows recording when granted', () => {
    const r = validateConsentForAction(
      load('granted-consent.json') as ConsentRecord,
      'start_recording',
    );
    expect(r.ok).toBe(true);
  });
});

describe('Adversarial: malicious transcript', () => {
  it('keeps injected instructions as untrusted content — they cannot mint a manifest', () => {
    const evil = load('malicious-transcript.json') as unknown as Record<string, unknown>;
    expect(evil.classification).toBe('untrusted_content');
    // Transcript text fed as an intent must fail validation (no authority fields).
    const r = validateVoiceIntent({
      schema_version: 'voice.v1',
      intent_id: '',
      tenant_id: '',
      call_session_id: '',
      caller_goal: evil.transcript_text as string,
      issue_type: '',
      urgency: 'unknown',
      human_requested: false,
      created_at: '',
    } as VoiceIntent);
    expect(r.ok).toBe(false);
  });
});

describe('Pill escape', () => {
  it('denies a Pill requesting provider_dispatch', () => {
    const binding = load('pill-binding.json') as PillBinding;
    const attempt = load('pill-escape-attempt.json') as { requested_task: string };
    expect(isPillTaskAllowed(binding, attempt.requested_task)).toBe(false);
  });

  it('allows bounded management tasks', () => {
    const binding = load('pill-binding.json') as PillBinding;
    expect(isPillTaskAllowed(binding, 'healthcheck')).toBe(true);
    expect(isPillTaskAllowed(binding, 'mint_authority')).toBe(false);
  });
});
