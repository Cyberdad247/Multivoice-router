/**
 * Bifrost crossing runtime.
 *
 * Mirrors the staging discipline of src/runtime/camelot-runtime.ts: each stage
 * runs in order and the function returns early with `ok: false` and a `stage`
 * label the moment one refuses.
 *
 * Stage order — and the reason for it:
 *
 *   1. RESOLVE_DEVICE   Name the machine before reasoning about it.
 *   2. GJALLARHORN      Ask whether the bridge is safe at all right now.
 *   3. HEIMDALL         Rule on the crossing; narrow fidelity and scopes.
 *   4. ANTIGRAVITY      The runtime's own execution gate, unchanged.
 *   5. HITL_GATE        Park anything the first four stages flagged.
 *   6. SIGN             Mint the envelope the node daemon will verify.
 *   7. ATTEST           DAG-sign the decision and write the ledger event.
 *
 * Heimdall narrows; ANTIGRAVITY still decides. Stage 4 is never skipped because
 * stage 3 said ALLOW.
 */

import { runAntigravity } from '../execution/antigravity-engine';
import { runOuroboros } from '../memory/ouroboros-engine';
import { createProvenanceAttestation } from '../provenance/attestation';
import { buildLedgerEvent } from '../provenance/provenance-ledger';
import { signDag, SignableDag } from '../provenance/dag-signer';
import { CommandQueueAdapter } from '../runtime/command-queue';
import { getDevice } from './device-registry';
import { soundGjallarhorn } from './gjallarhorn';
import { evaluateCrossing } from './heimdall-guardian';
import { openSession, transition } from './bifrost-session';
import { countLiveSessionsOnDevice } from './autonomous-supervisor';
import { signSessionEnvelope } from './session-token';
import {
  BifrostCrossingRequest,
  BifrostDevice,
  BifrostScope,
  BifrostSession,
  BifrostVerdict,
  GjallarhornAlarm,
  SonarFlowObservation,
} from './types';

export interface BifrostRuntimeInput {
  request: BifrostCrossingRequest;
  signingSecret: string;
  devices?: BifrostDevice[];
  sessions?: BifrostSession[];
  observations?: SonarFlowObservation[];
  /** Human approval already granted for this crossing. */
  approved?: boolean;
  /** Optional queue; when present, gated crossings are enqueued for approval. */
  queue?: CommandQueueAdapter;
  context?: Record<string, any>;
  now?: Date;
}

export type BifrostStage =
  | 'RESOLVE_DEVICE'
  | 'GJALLARHORN'
  | 'HEIMDALL_DENIED'
  | 'ANTIGRAVITY'
  | 'HITL_GATE'
  | 'SIGN'
  | 'COMPLETE';

export interface BifrostRuntimeResult {
  ok: boolean;
  stage: BifrostStage;
  verdict?: BifrostVerdict;
  session?: BifrostSession;
  alarms?: GjallarhornAlarm[];
  antigravity?: ReturnType<typeof runAntigravity>;
  attestation?: ReturnType<typeof createProvenanceAttestation>;
  ledgerEvent?: ReturnType<typeof buildLedgerEvent>;
  memory?: ReturnType<typeof runOuroboros>;
  approvalId?: string;
  commandId?: string;
  errors?: string[];
  warnings?: string[];
}

/**
 * Map the granted scopes onto the single ANTIGRAVITY action that best describes
 * the most dangerous thing the session could do. Deliberately pessimistic.
 */
export function antigravityActionForScopes(scopes: BifrostScope[]) {
  if (scopes.includes('shell_exec')) return 'shell_command' as const;
  if (scopes.includes('file_push')) return 'atomic_write' as const;
  if (scopes.includes('file_pull')) return 'read_file' as const;
  if (scopes.includes('clipboard_write') || scopes.includes('input_inject')) return 'desktop_action' as const;
  return 'read_file' as const;
}

/** Bifrost request sources and OUROBOROS memory sources are separate vocabularies. */
type OuroborosSource = 'text' | 'voice' | 'system' | 'edge' | 'autonomous';

function memorySource(source: BifrostCrossingRequest['source']): OuroborosSource {
  switch (source) {
    case 'voice':
      return 'voice';
    case 'chat':
    case 'dashboard':
      return 'text';
    case 'automation':
      return 'autonomous';
    case 'cli':
    default:
      return 'system';
  }
}

function buildCrossingDag(request: BifrostCrossingRequest, verdict: BifrostVerdict): SignableDag {
  return {
    dagId: `dag_bifrost_${request.requestId}`,
    root: 'request',
    nodes: {
      request: {
        id: 'request',
        kind: 'BIFROST_REQUEST',
        intent: request.purpose,
        payload: {
          deviceId: request.deviceId,
          transport: request.transport,
          fidelity: request.fidelity,
          scopes: request.scopes,
          requestedBy: request.requestedBy,
        },
      },
      guardian: {
        id: 'guardian',
        kind: 'HEIMDALL',
        intent: verdict.verdict,
        deps: ['request'],
        payload: {
          riskClass: verdict.riskClass,
          grantedScopes: verdict.grantedScopes,
          grantedFidelity: verdict.grantedFidelity,
          ttlSeconds: verdict.ttlSeconds,
        },
      },
      gate: {
        id: 'gate',
        kind: 'ANTIGRAVITY',
        intent: 'execution_envelope',
        deps: ['guardian'],
      },
    },
    metadata: {
      runtime: 'bifrost-runtime',
      guardian: 'sir_heimdall',
      version: 'v400.5.3',
    },
  };
}

export async function runBifrostCrossing(input: BifrostRuntimeInput): Promise<BifrostRuntimeResult> {
  const now = input.now || new Date();
  const warnings: string[] = [];
  const { request } = input;
  const sessions = input.sessions || [];
  const context = input.context || {};

  // --- 1. RESOLVE_DEVICE -------------------------------------------------
  const device = getDevice(request.deviceId, input.devices);
  if (!device) {
    return {
      ok: false,
      stage: 'RESOLVE_DEVICE',
      errors: [`Device '${request.deviceId}' is not enrolled on the Bifrost.`],
    };
  }

  // --- 2. GJALLARHORN ----------------------------------------------------
  const report = soundGjallarhorn({
    devices: input.devices || [device],
    sessions,
    observations: input.observations,
    now,
  });

  if (report.halt) {
    return {
      ok: false,
      stage: 'GJALLARHORN',
      alarms: report.alarms,
      errors: report.alarms.filter(a => a.halts).map(a => `[${a.rule}] ${a.message}`),
    };
  }
  if (report.alarms.length > 0) {
    warnings.push(`Gjallarhorn raised ${report.alarms.length} non-halting alarm(s).`);
  }

  // --- 3. HEIMDALL -------------------------------------------------------
  const verdict = evaluateCrossing(request, {
    device,
    alarms: report.alarms,
    activeSessionsOnDevice: countLiveSessionsOnDevice(sessions, device.deviceId),
    now,
    allowStaleHeartbeat: context.allowStaleHeartbeat,
  });

  if (verdict.verdict === 'DENY') {
    return {
      ok: false,
      stage: 'HEIMDALL_DENIED',
      verdict,
      alarms: report.alarms,
      errors: verdict.reasons,
    };
  }

  // --- 4. ANTIGRAVITY ----------------------------------------------------
  // Heimdall's ALLOW is permission to ask this gate, never to bypass it.
  const antigravity = runAntigravity({
    commandId: context.commandId,
    action: antigravityActionForScopes(verdict.grantedScopes),
    approved: Boolean(input.approved),
    targetPath: context.targetPath,
    payload: {
      deviceId: device.deviceId,
      transport: request.transport,
      scopes: verdict.grantedScopes,
    },
  });

  const needsHuman = verdict.verdict === 'APPROVAL_REQUIRED' || !antigravity.ok;

  // --- 5. HITL_GATE ------------------------------------------------------
  if (needsHuman && !input.approved) {
    let approvalId: string | undefined;
    let commandId: string | undefined;

    if (input.queue) {
      const command = await input.queue.enqueue({
        input: `bifrost:${request.transport}:${request.deviceId} — ${request.purpose}`,
        riskClass: verdict.riskClass,
        targetNode: device.deviceId,
        requiresApproval: true,
        runtimePayload: {
          requestId: request.requestId,
          scopes: verdict.grantedScopes,
          fidelity: verdict.grantedFidelity,
          transport: request.transport,
        },
      });
      commandId = command.commandId;

      const approval = await input.queue.requestApproval({
        commandId: command.commandId,
        reason: verdict.reasons.join(' '),
        riskClass: verdict.riskClass,
      });
      approvalId = approval.approvalId;
    }

    const memory = runOuroboros({
      rawState: { request, verdict, antigravity, alarms: report.alarms },
      source: memorySource(request.source),
      commandId,
    });

    return {
      ok: false,
      stage: 'HITL_GATE',
      verdict,
      alarms: report.alarms,
      antigravity,
      memory,
      approvalId,
      commandId,
      warnings: [...warnings, 'Crossing paused pending human approval.', ...verdict.reasons],
    };
  }

  // --- 6. SIGN -----------------------------------------------------------
  const sessionId = `bfs_${request.requestId}_${now.getTime().toString(36)}`;
  const notAfter = new Date(now.getTime() + verdict.ttlSeconds * 1000);

  const envelope = signSessionEnvelope(
    {
      sessionId,
      requestId: request.requestId,
      deviceId: device.deviceId,
      transport: request.transport,
      fidelity: verdict.grantedFidelity,
      scopes: verdict.grantedScopes,
      riskClass: verdict.riskClass,
      issuedBy: context.signedBy || 'sir_heimdall',
      notBefore: now,
      notAfter,
      maxIdleSeconds: verdict.maxIdleSeconds,
    },
    input.signingSecret
  );

  // --- 7. ATTEST ---------------------------------------------------------
  const dagSignature = signDag(
    buildCrossingDag(request, verdict),
    input.signingSecret,
    context.signedBy || 'sir_heimdall'
  );
  const attestation = createProvenanceAttestation({
    envelope: dagSignature,
    command: `bifrost_crossing:${request.transport}`,
    type: 'COMMAND_EVENT',
    metadata: {
      sessionId,
      deviceId: device.deviceId,
      grantedScopes: verdict.grantedScopes,
      grantedFidelity: verdict.grantedFidelity,
      riskClass: verdict.riskClass,
      approvedByHuman: Boolean(input.approved),
    },
  });
  const ledgerEvent = buildLedgerEvent(attestation);

  const memory = runOuroboros({
    rawState: { request, verdict, antigravity, envelope, attestation },
    source: memorySource(request.source),
    commandId: context.commandId,
  });

  // requested → gated → provisioning: the bridge is authorized but not yet up.
  let session = openSession(envelope, now);
  session = transition(session, 'gated', { reason: verdict.verdict, now });
  session = transition(session, 'provisioning', { reason: 'envelope_issued', now });

  return {
    ok: true,
    stage: 'COMPLETE',
    verdict,
    session,
    alarms: report.alarms,
    antigravity,
    attestation,
    ledgerEvent,
    memory,
    warnings,
  };
}
