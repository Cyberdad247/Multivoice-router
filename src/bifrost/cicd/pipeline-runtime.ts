/**
 * Pipeline run planning and execution over the bridge.
 *
 * Every stage opens its own crossing. A pipeline does not get one long-lived
 * session with the union of every scope it will ever need — each stage requests
 * exactly its own scopes, on its own device, and Heimdall rules on each one.
 * A build stage that needs shell_exec never holds file_push just because a later
 * deploy stage does.
 *
 * Tenant isolation is enforced here and fails closed: a stage targeting a device
 * that carries no tenantId, or a different tenant's, is refused before any
 * crossing is attempted.
 */

import { runBifrostCrossing, BifrostRuntimeResult } from '../bifrost-runtime';
import { getDevice } from '../device-registry';
import { CommandQueueAdapter } from '../../runtime/command-queue';
import { BifrostCrossingRequest, BifrostDevice, BifrostScope, BifrostSession } from '../types';
import { Pipeline, PipelineStage, normalizePipeline, orderSteps, validatePipeline } from './pipeline-schema';
import { PipelineGrant, verifyPipelineGrant } from './pipeline-authorization';

export interface PipelineRunRecord {
  runId: string;
  pipelineId: string;
  tenantId: string;
  startedAt: string;
}

export interface StagePlan {
  stageId: string;
  deviceId: string;
  request: BifrostCrossingRequest;
  stepOrder: string[];
  scopes: BifrostScope[];
}

export interface RunPlan {
  ok: boolean;
  runId: string;
  pipelineId: string;
  tenantId: string;
  stages: StagePlan[];
  errors: string[];
  warnings: string[];
}

export interface PlanInput {
  pipeline: Pipeline;
  grant: PipelineGrant;
  secret: string;
  devices?: BifrostDevice[];
  /** Runs already started, used for the per-hour rate limit. */
  recentRuns?: PipelineRunRecord[];
  requestedBy?: string;
  now?: Date;
}

function stageScopes(stage: PipelineStage): BifrostScope[] {
  const union = new Set<BifrostScope>();
  for (const step of stage.steps) {
    for (const scope of step.requiredScopes) union.add(scope);
  }
  return Array.from(union).sort();
}

/** Lowest fidelity that can carry every scope in the set. */
function fidelityForScopes(scopes: BifrostScope[]): 'observe' | 'view' | 'interact' | 'control' {
  const controlScopes: BifrostScope[] = ['clipboard_write', 'file_pull', 'file_push', 'shell_exec'];
  const interactScopes: BifrostScope[] = ['input_inject', 'clipboard_read'];
  const viewScopes: BifrostScope[] = ['screen_view', 'audio_out'];

  if (scopes.some(s => controlScopes.includes(s))) return 'control';
  if (scopes.some(s => interactScopes.includes(s))) return 'interact';
  if (scopes.some(s => viewScopes.includes(s))) return 'view';
  return 'observe';
}

export function planPipelineRun(input: PlanInput): RunPlan {
  const now = input.now || new Date();
  const pipeline = normalizePipeline(input.pipeline);
  const errors: string[] = [];
  const warnings: string[] = [];
  const runId = `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  const empty: RunPlan = {
    ok: false,
    runId,
    pipelineId: pipeline.pipelineId,
    tenantId: pipeline.tenantId,
    stages: [],
    errors,
    warnings,
  };

  // --- Structural validity ----------------------------------------------
  const validation = validatePipeline(pipeline);
  if (!validation.ok) {
    errors.push(...validation.errors);
    return empty;
  }
  warnings.push(...validation.warnings);

  // --- The grant must still match this exact definition -----------------
  const grantCheck = verifyPipelineGrant(input.grant, pipeline, input.secret, now);
  if (!grantCheck.ok) {
    errors.push(grantCheck.reason);
    return empty;
  }

  // --- Rate limit --------------------------------------------------------
  const hourAgo = new Date(now.getTime() - 3_600_000);
  const recent = (input.recentRuns || []).filter(
    run => run.pipelineId === pipeline.pipelineId && new Date(run.startedAt) >= hourAgo
  );
  if (recent.length >= input.grant.limits.maxRunsPerHour) {
    errors.push(
      `Rate limit reached: ${recent.length} run(s) in the last hour, grant allows ${input.grant.limits.maxRunsPerHour}.`
    );
    return empty;
  }

  // --- Per-stage planning ------------------------------------------------
  const allowedDevices = new Set(input.grant.limits.allowedDeviceIds);
  const ceiling = new Set(input.grant.limits.scopeCeiling);
  const stages: StagePlan[] = [];

  for (const stage of pipeline.stages) {
    const device = getDevice(stage.deviceId, input.devices);

    if (!device) {
      errors.push(`Stage '${stage.id}' targets unknown device '${stage.deviceId}'.`);
      continue;
    }

    // Tenant isolation, failing closed on a device with no tenant at all.
    if (!device.tenantId) {
      errors.push(
        `Stage '${stage.id}' targets '${device.deviceId}', which has no tenantId. ` +
          'House devices are never targetable by a client pipeline.'
      );
      continue;
    }
    if (device.tenantId !== pipeline.tenantId) {
      errors.push(
        `Tenant isolation violation: pipeline belongs to '${pipeline.tenantId}' but ` +
          `'${device.deviceId}' belongs to '${device.tenantId}'.`
      );
      continue;
    }

    if (!allowedDevices.has(device.deviceId)) {
      errors.push(`Stage '${stage.id}' targets '${device.deviceId}', which is outside the grant allowlist.`);
      continue;
    }

    const scopes = stageScopes(stage);
    const overreach = scopes.filter(scope => !ceiling.has(scope));
    if (overreach.length > 0) {
      errors.push(`Stage '${stage.id}' needs scope(s) beyond the grant ceiling: ${overreach.join(', ')}.`);
      continue;
    }

    const ordering = orderSteps(stage);
    if (!ordering.ok) {
      errors.push(ordering.error!);
      continue;
    }

    // TTL covers the stage's steps plus a small margin, and is still clamped
    // by Heimdall's risk ceiling afterwards.
    const stageSeconds = stage.steps.reduce((sum, step) => sum + step.timeoutSeconds, 0);

    stages.push({
      stageId: stage.id,
      deviceId: stage.deviceId,
      scopes,
      stepOrder: ordering.order,
      request: {
        requestId: `${runId}_${stage.id}`,
        deviceId: stage.deviceId,
        transport: stage.transport,
        fidelity: fidelityForScopes(scopes),
        scopes,
        purpose: `CI/CD ${pipeline.name} v${pipeline.version} — stage ${stage.name}`,
        requestedBy: input.requestedBy || `pipeline:${pipeline.pipelineId}`,
        requestedTtlSeconds: Math.min(stageSeconds + 60, pipeline.maxDurationSeconds),
        source: 'automation',
      },
    });
  }

  if (errors.length > 0) return { ...empty, stages };

  return { ok: true, runId, pipelineId: pipeline.pipelineId, tenantId: pipeline.tenantId, stages, errors, warnings };
}

export interface StageOutcome {
  stageId: string;
  deviceId: string;
  ok: boolean;
  stage: BifrostRuntimeResult['stage'];
  sessionId?: string;
  errors?: string[];
}

export interface PipelineRunResult {
  ok: boolean;
  runId: string;
  pipelineId: string;
  tenantId: string;
  outcomes: StageOutcome[];
  /** Set when planning refused before any crossing was attempted. */
  planErrors?: string[];
  warnings: string[];
  startedAt: string;
  finishedAt: string;
}

export interface ExecuteInput extends PlanInput {
  signingSecret: string;
  sessions?: BifrostSession[];
  queue?: CommandQueueAdapter;
}

/**
 * Execute a planned run, opening one crossing per stage.
 *
 * Stops at the first stage that fails to open. A pipeline that cannot get
 * through the gate on stage two should not proceed to stage three — the later
 * stages were planned assuming the earlier ones ran.
 *
 * The grant is what authorizes these crossings without a per-run human
 * decision; `approved: true` below is the grant being honoured, not a bypass.
 * Heimdall and Gjallarhorn still rule on every stage, so a device that has gone
 * stale or an alarm that has fired stops the run regardless of the grant.
 */
export async function executePipelineRun(input: ExecuteInput): Promise<PipelineRunResult> {
  const startedAt = (input.now || new Date()).toISOString();
  const plan = planPipelineRun(input);

  if (!plan.ok) {
    return {
      ok: false,
      runId: plan.runId,
      pipelineId: plan.pipelineId,
      tenantId: plan.tenantId,
      outcomes: [],
      planErrors: plan.errors,
      warnings: plan.warnings,
      startedAt,
      finishedAt: new Date().toISOString(),
    };
  }

  const outcomes: StageOutcome[] = [];
  let sessions = input.sessions || [];

  for (const stagePlan of plan.stages) {
    const result = await runBifrostCrossing({
      request: stagePlan.request,
      signingSecret: input.signingSecret,
      devices: input.devices,
      sessions,
      approved: true,
      queue: input.queue,
      context: { signedBy: `grant:${input.grant.grantId}`, pipelineRunId: plan.runId },
      now: input.now,
    });

    outcomes.push({
      stageId: stagePlan.stageId,
      deviceId: stagePlan.deviceId,
      ok: result.ok,
      stage: result.stage,
      sessionId: result.session?.envelope.sessionId,
      errors: result.errors,
    });

    if (!result.ok) break;

    if (result.session) sessions = [...sessions, result.session];
  }

  return {
    ok: outcomes.length === plan.stages.length && outcomes.every(o => o.ok),
    runId: plan.runId,
    pipelineId: plan.pipelineId,
    tenantId: plan.tenantId,
    outcomes,
    warnings: plan.warnings,
    startedAt,
    finishedAt: new Date().toISOString(),
  };
}
