/**
 * VOICE-002 — Policy / consent / approval / lease engine.
 *
 * Decision model:
 * - VoiceIntent (proposes only)            -> allow | deny
 * - CallEffectManifest (external effect)   -> approval_required | deny
 *   (every external effect needs a human-approved exact digest; there is no
 *   auto-allow path for effects — "intent is not authority")
 * - ApprovalGrant binds a human approver to the manifest digest.
 * - TurnLease is issued only from a valid approval; one-shot, short-lived,
 *   revocable (kill switch / epoch fence).
 */
import {
  validateConsentForAction,
  computeManifestDigest,
  type VoiceIntent,
  type CallEffectManifest,
  type ConsentRecord,
  type TurnLease,
  type VoiceAction,
  type ValidationResult,
} from './contracts';

export type PolicyDecisionKind = 'allow' | 'deny' | 'approval_required';

export interface PolicyEvaluation {
  decision: PolicyDecisionKind;
  reasons: string[];
  /** Set when decision is approval_required: the digest the human must approve. */
  manifestDigest: string | null;
}

export interface ApprovalGrant {
  schema_version: 'voice.v1';
  approval_id: string;
  manifest_digest: string;
  approver: string;
  approved_at: string;
  expires_at: string;
}

/** Actions that can never be approved, regardless of consent. */
const PROHIBITED_ACTIONS = new Set([
  'autonomous_dial',
  'recording_without_consent',
  'unapproved_message',
  'crm_write_without_manifest',
  'provider_dispatch', // Pill escape surface
]);

const KNOWN_ACTIONS: VoiceAction[] = [
  'transfer',
  'collect_intake',
  'send_followup_sms',
  'end_call',
  'start_recording',
  'stop_recording',
];

function deny(...reasons: string[]): PolicyEvaluation {
  return { decision: 'deny', reasons, manifestDigest: null };
}

/** Intents propose; they never authorize. Allow = may proceed to manifest drafting. */
export function evaluateIntentPolicy(intent: VoiceIntent): PolicyEvaluation {
  if (!intent.tenant_id || !intent.call_session_id || !intent.intent_id) {
    return deny('Intent missing tenant/session/identity binding.');
  }
  if (intent.schema_version !== 'voice.v1') {
    return deny(`Unsupported intent schema: ${intent.schema_version}.`);
  }
  return { decision: 'allow', reasons: ['Intent proposes only; no external effect.'], manifestDigest: null };
}

export interface ManifestPolicyInput {
  manifest: CallEffectManifest;
  consent: ConsentRecord;
  /** Tenant the session belongs to — cross-tenant manifests are denied. */
  sessionTenantId: string;
  nowIso?: string;
}

export async function evaluateManifestPolicy(
  input: ManifestPolicyInput,
): Promise<PolicyEvaluation> {
  const { manifest, consent, sessionTenantId } = input;
  const nowIso = input.nowIso ?? new Date().toISOString();

  if (PROHIBITED_ACTIONS.has(manifest.action as string)) {
    return deny(`Prohibited action: ${manifest.action}.`);
  }
  if (!KNOWN_ACTIONS.includes(manifest.action as VoiceAction)) {
    return deny(`Unknown action: ${manifest.action}. Closed action set enforced.`);
  }
  if (manifest.tenant_id !== sessionTenantId) {
    return deny('Cross-tenant manifest: deny and quarantine.');
  }
  if (manifest.call_session_id !== consent.call_session_id) {
    return deny('Consent record does not belong to this call session.');
  }
  if (manifest.expires_at <= nowIso) {
    return deny('Manifest expired: fails closed.');
  }

  const consentCheck = validateConsentForAction(consent, manifest.action as VoiceAction);
  if (!consentCheck.ok) {
    return deny(...consentCheck.errors);
  }

  const recomputed = await computeManifestDigest(manifest);
  if (recomputed !== manifest.canonical_digest) {
    return deny('Digest mismatch: manifest mutated post-creation. Quarantine.');
  }

  return {
    decision: 'approval_required',
    reasons: ['External effect requires human approval of the exact manifest digest.'],
    manifestDigest: manifest.canonical_digest,
  };
}

/**
 * Binds a human approver to the EXACT manifest digest.
 * Approval of anything but the canonical bytes is refused.
 */
export async function bindApproval(
  manifest: CallEffectManifest,
  approver: string,
  opts: { approvalTtlSeconds?: number; nowIso?: string } = {},
): Promise<{ ok: boolean; approval?: ApprovalGrant; errors: string[] }> {
  const errors: string[] = [];
  if (!approver) errors.push('Approver identity required: agents cannot self-approve.');
  const recomputed = await computeManifestDigest(manifest);
  if (recomputed !== manifest.canonical_digest) {
    errors.push('Refusing approval: digest mismatch — not the canonical bytes.');
  }
  if (errors.length > 0) return { ok: false, errors };

  const now = new Date(opts.nowIso ?? new Date().toISOString());
  const ttl = opts.approvalTtlSeconds ?? 300;
  const approval: ApprovalGrant = {
    schema_version: 'voice.v1',
    approval_id: `apr_${manifest.manifest_id}`,
    manifest_digest: manifest.canonical_digest,
    approver,
    approved_at: now.toISOString(),
    expires_at: new Date(now.getTime() + ttl * 1000).toISOString(),
  };
  return { ok: true, approval, errors: [] };
}

/**
 * Issues a one-shot TurnLease from a valid approval.
 * Lease TTL is short (single turn); default 60s.
 */
export function issueLease(
  manifest: CallEffectManifest,
  approval: ApprovalGrant,
  opts: { ttlSeconds?: number; nowIso?: string } = {},
): { ok: boolean; lease?: TurnLease; errors: string[] } {
  const errors: string[] = [];
  const nowIso = opts.nowIso ?? new Date().toISOString();
  if (approval.manifest_digest !== manifest.canonical_digest) {
    errors.push('Approval is not bound to this manifest digest.');
  }
  if (approval.expires_at <= nowIso) {
    errors.push('Approval expired: lease refused.');
  }
  if (errors.length > 0) return { ok: false, errors };

  const ttl = opts.ttlSeconds ?? 60;
  const issuedAt = new Date(nowIso);
  const lease: TurnLease = {
    schema_version: 'voice.v1',
    lease_id: `lease_${manifest.manifest_id}_${issuedAt.getTime()}`,
    manifest_digest: manifest.canonical_digest,
    tenant_id: manifest.tenant_id,
    action: manifest.action as VoiceAction,
    issued_at: issuedAt.toISOString(),
    expires_at: new Date(issuedAt.getTime() + ttl * 1000).toISOString(),
    consumed: false,
    revoked: false,
  };
  return { ok: true, lease, errors: [] };
}

/** Kill switch / epoch fence: returns a revoked copy; the original is untouched. */
export function revokeLease(lease: TurnLease): TurnLease {
  return { ...lease, revoked: true };
}

/** Consent lifecycle: unknown -> granted|declined, with evidence. */
export function resolveConsent(
  record: ConsentRecord,
  outcome: 'granted' | 'declined',
  evidenceRef: string,
  nowIso: string = new Date().toISOString(),
): ConsentRecord {
  return { ...record, recording: outcome, evidence_ref: evidenceRef, captured_at: nowIso };
}

/** Two-party jurisdictions require an explicit AI/recording disclosure turn. */
export function disclosureRequired(jurisdictionHint?: string): boolean {
  return !!jurisdictionHint && jurisdictionHint.toLowerCase().includes('two-party');
}

export function toValidationResult(
  evaluation: PolicyEvaluation,
): ValidationResult {
  return {
    ok: evaluation.decision !== 'deny',
    errors: evaluation.decision === 'deny' ? evaluation.reasons : [],
  };
}
