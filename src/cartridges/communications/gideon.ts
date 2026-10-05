/**
 * VOICE-004 — Gideon independent verification + tamper-evident receipt chain.
 *
 * Gideon re-derives every binding from source artifacts; it never trusts the
 * dispatch path's intermediate conclusions:
 *   manifest digest   <- recomputed from canonical bytes
 *   approval binding  <- digest equality re-checked
 *   lease validity    <- as-of-dispatch re-checked (digest, tenant, expiry, revocation)
 *   policy            <- re-evaluated from raw inputs
 *   event signatures  <- re-verified with the HMAC secret
 *   evidence refs     <- cross-checked against actual events
 *   outcome           <- recomputed from events, compared to the receipt's claim
 *
 * Terminal receipts exist only after a Gideon pass. A failed verification
 * leaves the receipt at 'pending' and names the failed checks.
 */
import {
  canonicalJson,
  computeManifestDigest,
  sha256Hex,
  type CallEffectManifest,
  type TurnLease,
  type ProviderVoiceEvent,
  type CallReceipt,
  type ReceiptOutcome,
  type ConsentRecord,
} from './contracts';
import {
  evaluateManifestPolicy,
  type ApprovalGrant,
} from './policy';
import { verifySimulatorEvent } from './simulator';

export interface GideonCheck {
  name: string;
  pass: boolean;
  detail: string;
}

export interface GideonInput {
  manifest: CallEffectManifest;
  approval: ApprovalGrant;
  /** The lease as it was at dispatch (consumed copy is expected). */
  lease: TurnLease;
  consent: ConsentRecord;
  events: ProviderVoiceEvent[];
  /** Pending receipt from dispatch. */
  receipt: CallReceipt;
  sessionTenantId: string;
  hmacSecret: string;
  seenReceiptIds?: Set<string>;
  nowIso?: string;
}

export interface GideonVerdict {
  verdict: 'pass' | 'fail';
  checks: GideonCheck[];
  /** On pass: receipt with gideon_verdict 'pass'. On fail: unchanged (still pending). */
  receipt: CallReceipt;
}

function check(name: string, pass: boolean, detail: string): GideonCheck {
  return { name, pass, detail };
}

export async function gideonVerify(input: GideonInput): Promise<GideonVerdict> {
  const {
    manifest,
    approval,
    lease,
    consent,
    events,
    receipt,
    sessionTenantId,
    hmacSecret,
    seenReceiptIds,
  } = input;
  const nowIso = input.nowIso ?? new Date().toISOString();
  const checks: GideonCheck[] = [];

  // 1. Manifest digest: recompute from canonical bytes.
  const recomputed = await computeManifestDigest(manifest);
  checks.push(
    check(
      'manifest-digest',
      recomputed === manifest.canonical_digest && recomputed === receipt.manifest_digest,
      recomputed === manifest.canonical_digest
        ? 'Digest recomputed from canonical bytes; matches manifest and receipt.'
        : 'Digest mismatch: manifest or receipt digest does not match recomputation.',
    ),
  );

  // 2. Approval binding.
  const approvalOk =
    approval.manifest_digest === manifest.canonical_digest && approval.expires_at > nowIso;
  checks.push(
    check(
      'approval-binding',
      approvalOk,
      approvalOk
        ? `Approval ${approval.approval_id} bound to digest by ${approval.approver}.`
        : 'Approval not bound to manifest digest or expired.',
    ),
  );

  // 3. Lease validity as of dispatch.
  const leaseOk =
    lease.manifest_digest === manifest.canonical_digest &&
    lease.tenant_id === manifest.tenant_id &&
    lease.issued_at < lease.expires_at &&
    !lease.revoked;
  checks.push(
    check(
      'lease-binding',
      leaseOk,
      leaseOk
        ? `Lease ${lease.lease_id} bound, tenant-matched, unrevoked, sane window.`
        : 'Lease invalid as of dispatch: digest/tenant/expiry/revocation failure.',
    ),
  );

  // 4. Policy re-evaluation from raw inputs.
  const policy = await evaluateManifestPolicy({
    manifest,
    consent,
    sessionTenantId,
    nowIso,
  });
  checks.push(
    check(
      'policy-reeval',
      policy.decision === 'approval_required',
      `Policy re-evaluated: ${policy.decision}. ${policy.reasons.join(' ')}`,
    ),
  );

  // 5. Event signatures re-verified.
  const sigResults = await Promise.all(events.map((e) => verifySimulatorEvent(e, hmacSecret)));
  const badSigs = sigResults.filter((v) => !v).length;
  checks.push(
    check(
      'event-signatures',
      badSigs === 0,
      badSigs === 0
        ? `All ${events.length} event signatures re-verified.`
        : `${badSigs} event signature(s) failed re-verification.`,
    ),
  );

  // 6. Tenant consistency across every artifact.
  const tenants = new Set([
    manifest.tenant_id,
    lease.tenant_id,
    receipt.tenant_id,
    ...events.map((e) => e.tenant_id),
  ]);
  checks.push(
    check(
      'tenant-consistency',
      tenants.size === 1 && tenants.has(sessionTenantId),
      tenants.size === 1
        ? `Single tenant across all artifacts: ${[...tenants][0]}.`
        : `Tenant divergence detected: ${[...tenants].join(', ')}.`,
    ),
  );

  // 7. Evidence refs cross-checked against actual events.
  const actualRefs = new Set(events.map((e) => `${e.provider_call_id}:${e.event_sequence}`));
  const missingRefs = receipt.provider_evidence_refs.filter((r) => !actualRefs.has(r));
  checks.push(
    check(
      'evidence-refs',
      missingRefs.length === 0,
      missingRefs.length === 0
        ? 'All receipt evidence refs resolve to real events.'
        : `Dangling evidence refs: ${missingRefs.join(', ')}.`,
    ),
  );

  // 8. Receipt id uniqueness.
  const duplicateReceipt = seenReceiptIds?.has(receipt.receipt_id) ?? false;
  checks.push(
    check(
      'receipt-unique',
      !duplicateReceipt,
      duplicateReceipt ? `Duplicate receipt id: ${receipt.receipt_id}.` : 'Receipt id unique.',
    ),
  );

  // 9. Outcome recomputed from events vs. the receipt's claim.
  const verifiedEnded = events.some(
    (e) => e.event_type === 'ended' && e.signature_valid === 'verified',
  );
  const verifiedError = events.some((e) => e.event_type === 'error' && e.signature_valid === 'verified');
  const expected: ReceiptOutcome =
    !verifiedEnded || verifiedError ? 'reconciliation_required' : 'completed';
  checks.push(
    check(
      'outcome-consistent',
      receipt.outcome === expected,
      `Recomputed outcome '${expected}'; receipt claims '${receipt.outcome}'.`,
    ),
  );

  const failed = checks.filter((c) => !c.pass);
  if (failed.length > 0) {
    return { verdict: 'fail', checks, receipt }; // stays 'pending'
  }
  seenReceiptIds?.add(receipt.receipt_id);
  return { verdict: 'pass', checks, receipt: { ...receipt, gideon_verdict: 'pass' } };
}

// --- Tamper-evident receipt chain ---

/** Chain digest covers the receipt minus its own chain fields. */
export async function receiptChainDigest(receipt: CallReceipt): Promise<string> {
  const { prev_receipt_digest: _o, ...body } = receipt;
  return sha256Hex(canonicalJson(body));
}

export interface ChainLinkInput {
  receipt: CallReceipt;
  /** Digest of the previous receipt in the chain; null for the head. */
  prevDigest: string | null;
}

/**
 * Verifies a hash-chained receipt sequence: each receipt's prev_receipt_digest
 * must equal the chain digest of its predecessor. Returns the indexes where
 * the chain breaks.
 */
export async function verifyReceiptChain(
  links: ChainLinkInput[],
): Promise<{ ok: boolean; breaks: number[] }> {
  const breaks: number[] = [];
  for (let i = 0; i < links.length; i++) {
    const { receipt, prevDigest } = links[i];
    if ((receipt.prev_receipt_digest ?? null) !== prevDigest) {
      breaks.push(i);
      continue;
    }
    if (i > 0) {
      const expectedPrev = await receiptChainDigest(links[i - 1].receipt);
      if (prevDigest !== expectedPrev) breaks.push(i);
    }
  }
  return { ok: breaks.length === 0, breaks };
}
