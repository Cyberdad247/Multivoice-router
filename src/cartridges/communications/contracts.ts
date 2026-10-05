/**
 * VOICE-001 contract types + light validators.
 * Mirrors docs/cartridges/communications/voice-001-contracts-v1.md (voice.v1).
 * Validators enforce shape and digest binding; they are not a substitute for
 * Sentinel policy evaluation or Gideon verification.
 */

export type Urgency = 'routine' | 'priority' | 'emergency' | 'unknown';
export type ConsentState = 'required' | 'granted' | 'declined' | 'not_required' | 'unknown';
export type DisclosureState = 'required' | 'completed' | 'unknown';
export type VoiceAction =
  | 'transfer'
  | 'collect_intake'
  | 'send_followup_sms'
  | 'end_call'
  | 'start_recording'
  | 'stop_recording';
export type ProviderVoiceEventType =
  | 'offered'
  | 'answered'
  | 'dtmf'
  | 'transcript_partial'
  | 'transcript_final'
  | 'ended'
  | 'error';
export type ReceiptOutcome =
  | 'completed'
  | 'transferred'
  | 'reconciliation_required'
  | 'quarantined';

export interface VoiceIntent {
  schema_version: 'voice.v1';
  intent_id: string;
  tenant_id: string;
  call_session_id: string;
  caller_goal: string;
  issue_type: string;
  urgency: Urgency;
  human_requested: boolean;
  created_at: string;
}

export interface CallEffectManifest {
  schema_version: 'voice.v1';
  manifest_id: string;
  tenant_id: string;
  call_session_id: string;
  correlation_id: string;
  idempotency_key: string;
  action: VoiceAction;
  action_params: Record<string, unknown>;
  consent_state: { recording: ConsentState; ai_disclosure: DisclosureState };
  policy_version: string;
  created_at: string;
  expires_at: string;
  canonical_digest: string;
}

export interface ConsentRecord {
  schema_version: 'voice.v1';
  tenant_id: string;
  call_session_id: string;
  recording: ConsentState;
  ai_disclosure: DisclosureState;
  jurisdiction_hint?: string;
  evidence_ref?: string;
  captured_at: string;
}

export interface TurnLease {
  schema_version: 'voice.v1';
  lease_id: string;
  manifest_digest: string;
  tenant_id: string;
  action: VoiceAction;
  issued_at: string;
  expires_at: string;
  consumed: boolean;
  revoked: boolean;
}

export interface ProviderVoiceEvent {
  schema_version: 'voice.v1';
  tenant_id: string;
  call_session_id: string;
  provider: 'fonoster';
  provider_call_id: string;
  event_type: ProviderVoiceEventType;
  event_sequence: number;
  payload_ref: string;
  signature: string;
  signature_valid: 'verified' | 'failed' | 'missing';
  received_at: string;
  /**
   * Ingestion-boundary attestation. Fonoster signs nothing inbound, so our
   * receiver seals events on receipt. The seal attests "our ingress received
   * this" — never "the provider signed this" — and is only as trustworthy as
   * the ingress transport (authenticated NATS / header-checked webhook).
   */
  ingress_seal?: { sealed_by: string; sealed_at: string } | null;
}

export interface CallReceipt {
  schema_version: 'voice.v1';
  receipt_id: string;
  tenant_id: string;
  call_session_id: string;
  manifest_digest: string;
  lease_id: string;
  provider_evidence_refs: string[];
  gideon_verdict: 'pass' | 'fail' | 'pending';
  outcome: ReceiptOutcome;
  ledger_event_id: string;
  committed_at: string;
  /** Hash-chain link: digest of the previous receipt, null for the chain head. */
  prev_receipt_digest?: string | null;
}

export interface PillBinding {
  schema_version: 'voice.v1';
  pill_id: string;
  tenant_id: string;
  microvms: string[];
  workflow_ref: string;
  workflow_version: string;
  allowed_tasks: string[];
  prohibited_tasks: string[];
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

function requireFields(obj: Record<string, unknown>, fields: string[]): string[] {
  return fields
    .filter((f) => obj[f] === undefined || obj[f] === null || obj[f] === '')
    .map((f) => `Missing required field: ${f}`);
}

/** Canonical JSON: sorted keys, no whitespace — matches RFC 8785 JCS intent. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${canonicalJson((value as Record<string, unknown>)[k])}`)
    .join(',')}}`;
}

export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Digest covers every manifest field EXCEPT canonical_digest itself.
 * Any post-approval mutation invalidates the binding.
 */
export async function computeManifestDigest(manifest: CallEffectManifest): Promise<string> {
  const { canonical_digest: _omit, ...body } = manifest;
  return sha256Hex(canonicalJson(body));
}

export function validateVoiceIntent(intent: VoiceIntent): ValidationResult {
  const errors = requireFields(intent as unknown as Record<string, unknown>, [
    'schema_version',
    'intent_id',
    'tenant_id',
    'call_session_id',
    'caller_goal',
    'created_at',
  ]);
  if (intent.schema_version !== 'voice.v1') errors.push('Unsupported schema_version');
  if (intent.caller_goal && intent.caller_goal.length > 280)
    errors.push('caller_goal exceeds 280 chars');
  return { ok: errors.length === 0, errors };
}

export function validateConsentForAction(
  consent: ConsentRecord,
  action: VoiceAction,
): ValidationResult {
  const errors: string[] = [];
  if (action === 'start_recording') {
    if (consent.recording === 'unknown')
      errors.push('Recording consent unknown: manifest blocked until consent resolves.');
    if (consent.recording === 'declined' || consent.recording === 'required')
      errors.push('Recording not consented: start_recording prohibited.');
  }
  return { ok: errors.length === 0, errors };
}

export function validateTurnLease(
  lease: TurnLease,
  approvedDigest: string,
  nowIso: string = new Date().toISOString(),
): ValidationResult {
  const errors: string[] = [];
  if (lease.manifest_digest !== approvedDigest)
    errors.push('Lease is not bound to the approved manifest digest.');
  if (lease.consumed) errors.push('Lease already consumed: one-shot leases never re-dispatch.');
  if (lease.revoked) errors.push('Lease revoked: kill switch / epoch fence active.');
  if (lease.expires_at <= nowIso) errors.push('Lease expired: fails closed.');
  return { ok: errors.length === 0, errors };
}

export async function validateManifestDigest(
  manifest: CallEffectManifest,
): Promise<ValidationResult> {
  const errors: string[] = [];
  if (manifest.expires_at <= new Date().toISOString())
    errors.push('Manifest expired: fails closed; requires fresh manifest + approval.');
  const recomputed = await computeManifestDigest(manifest);
  if (recomputed !== manifest.canonical_digest)
    errors.push('Digest mismatch: manifest was mutated post-approval. Deny and quarantine.');
  return { ok: errors.length === 0, errors };
}

export function validateProviderEventCrossTenant(
  event: ProviderVoiceEvent,
  sessionTenantId: string,
): ValidationResult {
  const errors: string[] = [];
  if (event.tenant_id !== sessionTenantId)
    errors.push('Cross-tenant event: deny and quarantine.');
  if (event.signature_valid !== 'verified')
    errors.push('Provider event not signature-verified: quarantine, never trust.');
  return { ok: errors.length === 0, errors };
}

/**
 * Pill task authorization: a Pill may only perform tasks in its allowlist.
 * Anything else — especially provider_dispatch or mint_authority — is denied.
 */
export function isPillTaskAllowed(binding: PillBinding, task: string): boolean {
  if (binding.prohibited_tasks.includes(task)) return false;
  return binding.allowed_tasks.includes(task);
}

/**
 * Webhook deduplication key: same provider call + same sequence = same event.
 * A delayed duplicate must return the original result, never re-dispatch.
 */
export function eventDedupKey(event: ProviderVoiceEvent): string {
  return `${event.provider_call_id}:${event.event_sequence}`;
}

export function isDuplicateEvent(
  seen: Set<string>,
  event: ProviderVoiceEvent,
): { duplicate: boolean; key: string } {
  const key = eventDedupKey(event);
  if (seen.has(key)) return { duplicate: true, key };
  seen.add(key);
  return { duplicate: false, key };
}
