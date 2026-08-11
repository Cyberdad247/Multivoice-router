/**
 * Private CI/CD over the Bifrost Bridge — pipeline definitions.
 *
 * A pipeline is a declaration of work to run on a client's own nodes, reached
 * through the bridge. Every step states the scopes it needs, so the governance
 * question ("may this run?") is answerable from the definition alone, before
 * anything executes.
 *
 * The design tension worth naming: CI is useless if a human must approve every
 * run, and dangerous if nobody approves anything. The resolution is in
 * pipeline-authorization.ts — a human approves a *definition*, pinned by hash,
 * and runs of that exact definition proceed unattended within stated limits.
 * Change a command and the hash changes, which invalidates the grant.
 */

import { BifrostScope, BifrostTransportId } from '../types';

export type StepKind =
  | 'checkout'
  | 'build'
  | 'test'
  | 'package'
  | 'deploy'
  | 'artifact_pull'
  | 'artifact_push'
  | 'notify';

export interface PipelineStep {
  id: string;
  name: string;
  kind: StepKind;
  /**
   * The exact command to run. Pinned by the pipeline hash — a run may only
   * execute the string a human approved.
   */
  command?: string;
  /** Working directory relative to the runner root. Never absolute. */
  workdir?: string;
  /** Scopes this step needs. Derived defaults are applied by `normalizeStep`. */
  requiredScopes: BifrostScope[];
  timeoutSeconds: number;
  /** Steps that must succeed first. */
  dependsOn?: string[];
  /** When true, a failure does not fail the stage. */
  continueOnError?: boolean;
}

export interface PipelineStage {
  id: string;
  name: string;
  /** Node this stage runs on. Must belong to the pipeline's tenant. */
  deviceId: string;
  transport: BifrostTransportId;
  steps: PipelineStep[];
}

export interface Pipeline {
  pipelineId: string;
  name: string;
  tenantId: string;
  /** Bumped by the author; part of the hash. */
  version: string;
  stages: PipelineStage[];
  /** Maximum wall-clock for the whole run. */
  maxDurationSeconds: number;
}

/** Default scopes per step kind, unioned with whatever the author declared. */
const KIND_SCOPES: Record<StepKind, BifrostScope[]> = {
  checkout: ['shell_exec'],
  build: ['shell_exec'],
  test: ['shell_exec'],
  package: ['shell_exec'],
  deploy: ['shell_exec', 'file_push'],
  artifact_pull: ['file_pull'],
  artifact_push: ['file_push'],
  notify: ['process_list'],
};

export function normalizeStep(step: PipelineStep): PipelineStep {
  const union = new Set<BifrostScope>([...(step.requiredScopes || []), ...KIND_SCOPES[step.kind]]);
  return { ...step, requiredScopes: Array.from(union).sort() };
}

export function normalizePipeline(pipeline: Pipeline): Pipeline {
  return {
    ...pipeline,
    stages: pipeline.stages.map(stage => ({ ...stage, steps: stage.steps.map(normalizeStep) })),
  };
}

/** Every scope any step in the pipeline needs. */
export function pipelineScopes(pipeline: Pipeline): BifrostScope[] {
  const union = new Set<BifrostScope>();
  for (const stage of normalizePipeline(pipeline).stages) {
    for (const step of stage.steps) {
      for (const scope of step.requiredScopes) union.add(scope);
    }
  }
  return Array.from(union).sort();
}

export function pipelineDevices(pipeline: Pipeline): string[] {
  return Array.from(new Set(pipeline.stages.map(stage => stage.deviceId))).sort();
}

export interface PipelineValidation {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

const UNSAFE_WORKDIR = /(^\/)|(\.\.)|(^~)/;

/**
 * Structural validation. This is not a security boundary on its own — the
 * bridge still gates every stage — but a pipeline that cannot be reasoned about
 * should never reach a human for approval.
 */
export function validatePipeline(pipeline: Pipeline): PipelineValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!pipeline.pipelineId) errors.push('pipelineId is required.');
  if (!pipeline.tenantId) errors.push('tenantId is required; a pipeline without a tenant cannot be isolated.');
  if (!pipeline.version) errors.push('version is required and is part of the pinned hash.');
  if (pipeline.stages.length === 0) errors.push('A pipeline needs at least one stage.');
  if (pipeline.maxDurationSeconds <= 0) errors.push('maxDurationSeconds must be positive.');

  const stageIds = new Set<string>();
  for (const stage of pipeline.stages) {
    if (stageIds.has(stage.id)) errors.push(`Duplicate stage id '${stage.id}'.`);
    stageIds.add(stage.id);

    if (stage.steps.length === 0) warnings.push(`Stage '${stage.id}' has no steps.`);

    const stepIds = new Set<string>();
    for (const step of stage.steps) {
      if (stepIds.has(step.id)) errors.push(`Duplicate step id '${step.id}' in stage '${stage.id}'.`);
      stepIds.add(step.id);

      if (step.timeoutSeconds <= 0) errors.push(`Step '${step.id}' needs a positive timeoutSeconds.`);
      if (step.workdir && UNSAFE_WORKDIR.test(step.workdir)) {
        errors.push(`Step '${step.id}' has an unsafe workdir '${step.workdir}'; it must be relative and contain no '..'.`);
      }

      const needsCommand = ['checkout', 'build', 'test', 'package', 'deploy'].includes(step.kind);
      if (needsCommand && !step.command) {
        errors.push(`Step '${step.id}' is a '${step.kind}' step and needs an explicit command to pin.`);
      }

      for (const dependency of step.dependsOn || []) {
        if (!stage.steps.some(s => s.id === dependency)) {
          errors.push(`Step '${step.id}' depends on '${dependency}', which is not in stage '${stage.id}'.`);
        }
      }
    }
  }

  const scopes = pipelineScopes(pipeline);
  if (scopes.includes('shell_exec')) {
    warnings.push(
      'This pipeline requires shell_exec (L4_HIGH_RISK). It can only run unattended under a signed ' +
        'pipeline grant, and any edit to a command invalidates that grant.'
    );
  }

  return { ok: errors.length === 0, errors, warnings };
}

/** Topologically order a stage's steps, or report the cycle. */
export function orderSteps(stage: PipelineStage): { ok: boolean; order: string[]; error?: string } {
  const remaining = new Map(stage.steps.map(step => [step.id, new Set(step.dependsOn || [])]));
  const order: string[] = [];

  while (remaining.size > 0) {
    const ready = Array.from(remaining.entries())
      .filter(([, deps]) => Array.from(deps).every(d => order.includes(d)))
      .map(([id]) => id);

    if (ready.length === 0) {
      return {
        ok: false,
        order,
        error: `Dependency cycle in stage '${stage.id}' among: ${Array.from(remaining.keys()).join(', ')}`,
      };
    }

    ready.sort();
    for (const id of ready) {
      order.push(id);
      remaining.delete(id);
    }
  }

  return { ok: true, order };
}
