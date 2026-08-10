/**
 * Sir Heimdall — Arch-Guardian of the Bifrost Bridge.
 *
 * One pure function, `evaluateCrossing`, decides every question the bridge can
 * be asked: may this operator reach this machine, over which transport, at what
 * fidelity, carrying which scopes, for how long.
 *
 * Design rules this module holds to:
 *
 *  - **Deny by default.** Every path that cannot prove itself returns DENY.
 *  - **Narrow, never widen.** Fidelity and scopes are intersected against the
 *    transport ceiling and the device ceiling. A request can only ever come back
 *    smaller than it went in.
 *  - **Heimdall does not replace ANTIGRAVITY.** A verdict of ALLOW is permission
 *    to *ask* the runtime's execution gate, not permission to execute. See
 *    bifrost-runtime.ts.
 *  - **The bridge is the tailnet.** A transport marked requiresTailnet is denied
 *    outright when the device has no mesh address. There is no "direct" fallback.
 */

import { getTransport } from './transport-registry';
import { deviceRefuses, isOnTailnet, isHeartbeatFresh } from './device-registry';
import {
  BifrostCrossingRequest,
  BifrostDevice,
  BifrostFidelity,
  BifrostRiskClass,
  BifrostScope,
  BifrostVerdict,
  BifrostWatchpoint,
  GjallarhornAlarm,
  fidelityRank,
} from './types';

/** The minimum fidelity rung a scope may ride on. */
const SCOPE_MIN_FIDELITY: Record<BifrostScope, BifrostFidelity> = {
  network_observe: 'observe',
  process_list: 'observe',
  screen_view: 'view',
  audio_out: 'view',
  input_inject: 'interact',
  clipboard_read: 'interact',
  clipboard_write: 'control',
  file_pull: 'control',
  file_push: 'control',
  shell_exec: 'control',
};

/** Risk each scope carries on its own. A session inherits the maximum. */
const SCOPE_RISK: Record<BifrostScope, BifrostRiskClass> = {
  network_observe: 'L0_OBSERVE',
  process_list: 'L0_OBSERVE',
  screen_view: 'L1_DRAFT',
  audio_out: 'L1_DRAFT',
  clipboard_read: 'L3_GUARDED_WRITE',
  input_inject: 'L3_GUARDED_WRITE',
  clipboard_write: 'L4_HIGH_RISK',
  file_pull: 'L4_HIGH_RISK',
  file_push: 'L4_HIGH_RISK',
  shell_exec: 'L4_HIGH_RISK',
};

const RISK_ORDER: BifrostRiskClass[] = [
  'L0_OBSERVE',
  'L1_DRAFT',
  'L2_SAFE_EXECUTE',
  'L3_GUARDED_WRITE',
  'L4_HIGH_RISK',
  'L5_FORBIDDEN',
];

export function riskRank(risk: BifrostRiskClass): number {
  return RISK_ORDER.indexOf(risk);
}

function maxRisk(risks: BifrostRiskClass[]): BifrostRiskClass {
  return risks.reduce<BifrostRiskClass>(
    (acc, r) => (riskRank(r) > riskRank(acc) ? r : acc),
    'L0_OBSERVE'
  );
}

/** TTL ceiling per risk class, in seconds. Riskier sessions expire sooner. */
const TTL_CEILING: Record<BifrostRiskClass, number> = {
  L0_OBSERVE: 3600,
  L1_DRAFT: 3600,
  L2_SAFE_EXECUTE: 1800,
  L3_GUARDED_WRITE: 900,
  L4_HIGH_RISK: 300,
  L5_FORBIDDEN: 0,
};

const IDLE_CEILING: Record<BifrostRiskClass, number> = {
  L0_OBSERVE: 900,
  L1_DRAFT: 600,
  L2_SAFE_EXECUTE: 300,
  L3_GUARDED_WRITE: 180,
  L4_HIGH_RISK: 60,
  L5_FORBIDDEN: 0,
};

export const DEFAULT_TTL_SECONDS = 900;

export interface CrossingContext {
  device?: BifrostDevice;
  /** Alarms currently raised by Gjallarhorn. Criticals deny; warnings escalate. */
  alarms?: GjallarhornAlarm[];
  /** Live session count on the target device, used for fan-out refusal. */
  activeSessionsOnDevice?: number;
  now?: Date;
  /** Skip heartbeat freshness (first contact during enrollment). */
  allowStaleHeartbeat?: boolean;
}

function deny(reasons: string[]): BifrostVerdict {
  return {
    verdict: 'DENY',
    riskClass: 'L5_FORBIDDEN',
    grantedScopes: [],
    refusedScopes: [],
    grantedFidelity: 'observe',
    ttlSeconds: 0,
    maxIdleSeconds: 0,
    watchpoints: [],
    reasons,
  };
}

function watchpointsFor(scopes: BifrostScope[], transportId: string): BifrostWatchpoint[] {
  const points: BifrostWatchpoint[] = [
    {
      id: 'wp_tailnet',
      description: 'All session traffic must stay between tailnet peers.',
      rule: 'off_tailnet_peer',
    },
    {
      id: 'wp_heartbeat',
      description: 'Node gatekeeper must heartbeat continuously for the session to remain valid.',
      rule: 'stale_heartbeat',
    },
    {
      id: 'wp_ttl',
      description: 'Session is revoked the moment it passes notAfter.',
      rule: 'session_overrun',
    },
  ];

  if (scopes.includes('input_inject')) {
    points.push({
      id: 'wp_input',
      description: `Synthetic input over ${transportId} is recorded to the ledger per session, not per keystroke.`,
      rule: 'idle_timeout',
    });
  }

  if (scopes.some(s => s === 'file_push' || s === 'file_pull')) {
    points.push({
      id: 'wp_transfer',
      description: 'File transfer is bounded to the approved session and cannot outlive it.',
      rule: 'session_overrun',
    });
  }

  if (scopes.includes('shell_exec')) {
    points.push({
      id: 'wp_shell',
      description: 'Shell execution remains subject to ANTIGRAVITY limits after the bridge grants passage.',
      rule: 'session_overrun',
    });
  }

  return points;
}

export function evaluateCrossing(
  request: BifrostCrossingRequest,
  context: CrossingContext = {}
): BifrostVerdict {
  const now = context.now || new Date();
  const reasons: string[] = [];

  // 1. The device must be known and enrolled.
  const device = context.device;
  if (!device) {
    return deny([`Unknown device '${request.deviceId}'. Heimdall does not open the bridge to unnamed machines.`]);
  }
  if (!device.enrolled) {
    return deny([`Device '${device.deviceId}' is not enrolled.`]);
  }

  // 2. The transport must exist and be supported by the device.
  const transport = getTransport(request.transport);
  if (!transport) {
    return deny([`Unknown transport '${request.transport}'.`]);
  }
  if (!device.supportedTransports.includes(transport.id)) {
    return deny([`Device '${device.deviceId}' does not support transport '${transport.id}'.`]);
  }

  // 3. The bridge *is* the tailnet.
  if (transport.requiresTailnet && !isOnTailnet(device)) {
    return deny([
      `Transport '${transport.id}' requires the tailnet and '${device.deviceId}' has no mesh address. ` +
        'There is no direct fallback across the Bifrost.',
    ]);
  }

  // 4. A sounding horn closes the bridge.
  const alarms = context.alarms || [];
  const criticals = alarms.filter(a => a.halts);
  if (criticals.length > 0) {
    return deny([
      'Gjallarhorn is sounding; the bridge is closed to new crossings.',
      ...criticals.map(a => `[${a.rule}] ${a.message}`),
    ]);
  }

  // 5. A silent gatekeeper cannot enforce an envelope.
  if (!context.allowStaleHeartbeat && !isHeartbeatFresh(device, now)) {
    return deny([
      `No fresh gatekeeper heartbeat from '${device.deviceId}'. ` +
        'A node that cannot report cannot be trusted to enforce a session envelope.',
    ]);
  }

  // 6. Fidelity is the minimum of what was asked, what the transport carries,
  //    and what the device permits.
  const ceiling = [request.fidelity, transport.maxFidelity, device.maxFidelity].reduce((lowest, f) =>
    fidelityRank(f) < fidelityRank(lowest) ? f : lowest
  );
  const grantedFidelity = ceiling;
  if (fidelityRank(grantedFidelity) < fidelityRank(request.fidelity)) {
    reasons.push(
      `Fidelity lowered from '${request.fidelity}' to '${grantedFidelity}' by transport/device ceiling.`
    );
  }

  // 7. Intersect scopes against transport, device policy and granted fidelity.
  const grantedScopes: BifrostScope[] = [];
  const refusedScopes: { scope: BifrostScope; reason: string }[] = [];

  for (const scope of request.scopes) {
    if (!transport.carriableScopes.includes(scope)) {
      refusedScopes.push({ scope, reason: `Transport '${transport.id}' cannot carry '${scope}'.` });
      continue;
    }
    if (deviceRefuses(device, scope)) {
      refusedScopes.push({ scope, reason: `Device '${device.deviceId}' permanently denies '${scope}'.` });
      continue;
    }
    if (fidelityRank(SCOPE_MIN_FIDELITY[scope]) > fidelityRank(grantedFidelity)) {
      refusedScopes.push({
        scope,
        reason: `'${scope}' needs fidelity '${SCOPE_MIN_FIDELITY[scope]}' but only '${grantedFidelity}' was granted.`,
      });
      continue;
    }
    grantedScopes.push(scope);
  }

  if (grantedScopes.length === 0) {
    return deny([
      'No requested scope survived the transport and device ceilings.',
      ...refusedScopes.map(r => r.reason),
    ]);
  }

  // 8. Session risk is the highest risk any granted scope carries.
  const riskClass = maxRisk(grantedScopes.map(s => SCOPE_RISK[s]));
  if (riskClass === 'L5_FORBIDDEN') {
    return deny(['Requested scopes classify as L5_FORBIDDEN.']);
  }

  // 9. Fan-out limit.
  const active = context.activeSessionsOnDevice ?? 0;
  if (active >= 2) {
    return deny([`Device '${device.deviceId}' already has ${active} live sessions; refusing to fan out further.`]);
  }

  // 10. TTL is clamped by risk — the operator may ask for less, never more.
  const requested = request.requestedTtlSeconds ?? DEFAULT_TTL_SECONDS;
  const ttlSeconds = Math.max(30, Math.min(requested, TTL_CEILING[riskClass]));
  if (ttlSeconds < requested) {
    reasons.push(`TTL clamped from ${requested}s to ${ttlSeconds}s by risk class ${riskClass}.`);
  }

  // 11. Anything at or above L3 needs a human. Non-halting alarms escalate too.
  const warnings = alarms.filter(a => !a.halts);
  let verdict: BifrostVerdict['verdict'] = 'ALLOW';

  if (riskRank(riskClass) >= riskRank('L3_GUARDED_WRITE')) {
    verdict = 'APPROVAL_REQUIRED';
    reasons.push(`Risk class ${riskClass} requires human approval before the bridge opens.`);
  }
  if (warnings.length > 0 && verdict === 'ALLOW') {
    verdict = 'APPROVAL_REQUIRED';
    reasons.push(
      `Gjallarhorn raised ${warnings.length} warning(s); escalating an otherwise-allowed crossing to approval.`
    );
  }

  if (refusedScopes.length > 0) {
    reasons.push(`${refusedScopes.length} scope(s) refused.`);
  }
  if (verdict === 'ALLOW') {
    reasons.push('Crossing permitted; ANTIGRAVITY still governs any execution that follows.');
  }

  return {
    verdict,
    riskClass,
    grantedScopes,
    refusedScopes,
    grantedFidelity,
    ttlSeconds,
    maxIdleSeconds: IDLE_CEILING[riskClass],
    watchpoints: watchpointsFor(grantedScopes, transport.id),
    reasons,
  };
}

/** Scope→risk table exposed for tests and for the approval UI. */
export function scopeRisk(scope: BifrostScope): BifrostRiskClass {
  return SCOPE_RISK[scope];
}

export function scopeMinFidelity(scope: BifrostScope): BifrostFidelity {
  return SCOPE_MIN_FIDELITY[scope];
}
