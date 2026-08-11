/**
 * Pipeline pre-authorization.
 *
 * The whole point: move human approval from *per run* to *per definition*, and
 * pin the definition cryptographically so the approval cannot silently come to
 * mean something else.
 *
 * A human approves a pipeline once. That produces a signed grant carrying the
 * pipeline's hash, a scope ceiling, a device allowlist, a rate limit and an
 * expiry. Runs of that exact pipeline then proceed unattended. Change one
 * command, add one step, retarget one device — the hash changes, the grant no
 * longer matches, and the pipeline is back in front of a human.
 *
 * This is the only place in the bridge where something at L4 runs without a
 * per-action human decision, and it is deliberately the narrowest possible hole:
 * a specific frozen definition, on named devices, at a bounded rate, until a
 * stated date.
 */

import crypto from 'crypto';
import { BifrostScope } from '../types';
import { Pipeline, normalizePipeline, pipelineDevices, pipelineScopes } from './pipeline-schema';

export const PIPELINE_GRANT_VERSION = 'camelot-pipeline-v1';

/**
 * Canonical serialization of everything that must not change without
 * re-approval. Field order is explicit and stable.
 */
export function canonicalPipeline(pipeline: Pipeline): string {
  const normalized = normalizePipeline(pipeline);

  const stages = normalized.stages
    .map(stage =>
      [
        stage.id,
        stage.deviceId,
        stage.transport,
        stage.steps
          .map(step =>
            [
              step.id,
              step.kind,
              step.command ?? '',
              step.workdir ?? '',
              step.requiredScopes.join(','),
              String(step.timeoutSeconds),
              (step.dependsOn || []).slice().sort().join(','),
              step.continueOnError ? '1' : '0',
            ].join('~')
          )
          .join(';'),
      ].join('^')
    )
    .join('|');

  return [
    PIPELINE_GRANT_VERSION,
    normalized.pipelineId,
    normalized.tenantId,
    normalized.version,
    String(normalized.maxDurationSeconds),
    stages,
  ].join('#');
}

export function pipelineHash(pipeline: Pipeline): string {
  return crypto.createHash('sha256').update(canonicalPipeline(pipeline), 'utf8').digest('hex');
}

export interface PipelineGrantLimits {
  /** Scopes the grant permits. A pipeline needing more is refused. */
  scopeCeiling: BifrostScope[];
  /** Devices the grant permits. A pipeline targeting others is refused. */
  allowedDeviceIds: string[];
  maxRunsPerHour: number;
  /** ISO timestamp after which the grant is dead. */
  expiresAt: string;
}

export interface PipelineGrant {
  grantId: string;
  pipelineId: string;
  tenantId: string;
  pipelineHash: string;
  limits: PipelineGrantLimits;
  approvedBy: string;
  approvedAt: string;
  canonical: string;
  signature: string;
  algorithm: 'HMAC-SHA256';
}

function canonicalGrant(input: Omit<PipelineGrant, 'signature' | 'canonical' | 'algorithm'>): string {
  return [
    PIPELINE_GRANT_VERSION,
    input.grantId,
    input.pipelineId,
    input.tenantId,
    input.pipelineHash,
    input.limits.scopeCeiling.slice().sort().join(','),
    input.limits.allowedDeviceIds.slice().sort().join(','),
    String(input.limits.maxRunsPerHour),
    input.limits.expiresAt,
    input.approvedBy,
    input.approvedAt,
  ].join('|');
}

export interface GrantIssue {
  ok: boolean;
  grant?: PipelineGrant;
  errors: string[];
}

/**
 * Issue a grant. Refuses when the pipeline asks for more than the limits allow,
 * so a grant can never be issued that is narrower on paper than in effect.
 */
export function authorizePipeline(input: {
  pipeline: Pipeline;
  limits: PipelineGrantLimits;
  approvedBy: string;
  secret: string;
  now?: Date;
}): GrantIssue {
  const now = input.now || new Date();
  const errors: string[] = [];

  if (!input.secret || input.secret.length < 16) {
    errors.push('Signing secret must be at least 16 characters.');
  }
  if (!input.approvedBy) {
    errors.push('approvedBy is required; a grant records who took responsibility.');
  }

  const needed = pipelineScopes(input.pipeline);
  const ceiling = new Set(input.limits.scopeCeiling);
  const overreach = needed.filter(scope => !ceiling.has(scope));
  if (overreach.length > 0) {
    errors.push(`Pipeline requires scope(s) outside the grant ceiling: ${overreach.join(', ')}.`);
  }

  const targets = pipelineDevices(input.pipeline);
  const allowed = new Set(input.limits.allowedDeviceIds);
  const strayed = targets.filter(id => !allowed.has(id));
  if (strayed.length > 0) {
    errors.push(`Pipeline targets device(s) outside the grant allowlist: ${strayed.join(', ')}.`);
  }

  if (new Date(input.limits.expiresAt) <= now) {
    errors.push('Grant expiry must be in the future.');
  }
  if (input.limits.maxRunsPerHour <= 0) {
    errors.push('maxRunsPerHour must be positive.');
  }

  if (errors.length > 0) return { ok: false, errors };

  const draft = {
    grantId: `grant_${crypto.randomBytes(8).toString('hex')}`,
    pipelineId: input.pipeline.pipelineId,
    tenantId: input.pipeline.tenantId,
    pipelineHash: pipelineHash(input.pipeline),
    limits: input.limits,
    approvedBy: input.approvedBy,
    approvedAt: now.toISOString(),
  };

  const canonical = canonicalGrant(draft);
  const signature = crypto.createHmac('sha256', input.secret).update(canonical, 'utf8').digest('hex');

  return {
    ok: true,
    errors: [],
    grant: { ...draft, canonical, signature, algorithm: 'HMAC-SHA256' },
  };
}

export interface GrantVerification {
  ok: boolean;
  reason: string;
}

/**
 * Verify a grant against the pipeline someone is actually about to run.
 *
 * Checks, in order: signature, expiry, tenant match, then hash match. The hash
 * check is what makes the whole scheme work — it is the difference between
 * "a human approved this pipeline" and "a human approved *a* pipeline once".
 */
export function verifyPipelineGrant(
  grant: PipelineGrant,
  pipeline: Pipeline,
  secret: string,
  now: Date = new Date()
): GrantVerification {
  const expected = crypto.createHmac('sha256', secret).update(grant.canonical, 'utf8').digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(grant.signature, 'utf8');

  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, reason: 'Grant signature mismatch.' };
  }

  // The canonical string must actually describe this grant object.
  const recomputed = canonicalGrant({
    grantId: grant.grantId,
    pipelineId: grant.pipelineId,
    tenantId: grant.tenantId,
    pipelineHash: grant.pipelineHash,
    limits: grant.limits,
    approvedBy: grant.approvedBy,
    approvedAt: grant.approvedAt,
  });
  if (recomputed !== grant.canonical) {
    return { ok: false, reason: 'Grant fields do not match its signed canonical form.' };
  }

  if (now >= new Date(grant.limits.expiresAt)) {
    return { ok: false, reason: `Grant expired at ${grant.limits.expiresAt}.` };
  }

  if (grant.tenantId !== pipeline.tenantId) {
    return { ok: false, reason: `Grant is for tenant '${grant.tenantId}', pipeline belongs to '${pipeline.tenantId}'.` };
  }

  if (grant.pipelineId !== pipeline.pipelineId) {
    return { ok: false, reason: `Grant is for pipeline '${grant.pipelineId}', not '${pipeline.pipelineId}'.` };
  }

  const current = pipelineHash(pipeline);
  if (current !== grant.pipelineHash) {
    return {
      ok: false,
      reason:
        'Pipeline definition has changed since it was approved. ' +
        `Approved ${grant.pipelineHash.slice(0, 12)}…, now ${current.slice(0, 12)}…. Re-approval required.`,
    };
  }

  return { ok: true, reason: 'Grant valid for this pipeline definition.' };
}
