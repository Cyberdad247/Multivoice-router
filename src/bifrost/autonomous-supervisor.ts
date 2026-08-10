/**
 * The autonomous half of the bridge.
 *
 * `tickBifrostSupervisor` is a pure reducer: given the current devices,
 * sessions and observations, it returns the next session set plus a list of
 * actions the caller should carry out. It performs no I/O, so the whole control
 * loop is deterministic and testable.
 *
 * What is autonomous here: expiry, revocation, degradation, idle reaping and
 * transport failover selection. What is *not* autonomous: opening a new
 * crossing at L3 or above. The supervisor can always close the bridge on its
 * own; it can never widen it without a human.
 */

import { selectTransport } from './transport-registry';
import { soundGjallarhorn } from './gjallarhorn';
import { forceRevoke, idleSeconds, isExpired, isTerminal, transition } from './bifrost-session';
import {
  BifrostDevice,
  BifrostSession,
  BifrostTransportId,
  GjallarhornAlarm,
  SonarFlowObservation,
} from './types';

export type SupervisorActionKind =
  | 'revoke_session'
  | 'expire_session'
  | 'close_idle_session'
  | 'degrade_session'
  | 'propose_failover'
  | 'raise_alarm';

export interface SupervisorAction {
  kind: SupervisorActionKind;
  sessionId?: string;
  deviceId?: string;
  reason: string;
  /** Set on propose_failover: the transport the supervisor recommends next. */
  suggestedTransport?: BifrostTransportId;
  /**
   * True when carrying out this action needs a fresh crossing evaluation
   * (and therefore possibly a human). Failover always does.
   */
  requiresReauthorization?: boolean;
}

export interface SupervisorInput {
  devices: BifrostDevice[];
  sessions: BifrostSession[];
  observations?: SonarFlowObservation[];
  /** Transports currently reporting unhealthy, e.g. Sunshine host down. */
  unhealthyTransports?: BifrostTransportId[];
  now?: Date;
}

export interface SupervisorTick {
  sessions: BifrostSession[];
  actions: SupervisorAction[];
  alarms: GjallarhornAlarm[];
  halt: boolean;
  tickedAt: string;
}

export function tickBifrostSupervisor(input: SupervisorInput): SupervisorTick {
  const now = input.now || new Date();
  const unhealthy = new Set(input.unhealthyTransports || []);
  const actions: SupervisorAction[] = [];

  const report = soundGjallarhorn({
    devices: input.devices,
    sessions: input.sessions,
    observations: input.observations,
    now,
  });

  for (const alarm of report.alarms) {
    actions.push({
      kind: 'raise_alarm',
      sessionId: alarm.sessionId,
      deviceId: alarm.deviceId,
      reason: `[${alarm.severity}/${alarm.rule}] ${alarm.message}`,
    });
  }

  const revokeSet = new Set(report.revokeSessionIds);
  const deviceById = new Map(input.devices.map(d => [d.deviceId, d]));

  const sessions = input.sessions.map(session => {
    const { sessionId, deviceId, transport } = session.envelope;

    if (isTerminal(session.state)) return session;

    // 1. Expiry is absolute and needs no approval.
    //
    // Checked before horn-driven revocation because Gjallarhorn also flags an
    // overrun session as critical, and both outcomes are terminal — reaching
    // notAfter is the session's normal end of life, so it is reported as
    // expiry rather than as an alarm-driven revocation.
    if (isExpired(session, now)) {
      actions.push({
        kind: 'expire_session',
        sessionId,
        deviceId,
        reason: `Session passed notAfter ${session.envelope.notAfter}.`,
      });
      return { ...session, state: 'expired' as const, terminationReason: 'ttl_expired', lastActivityAt: now.toISOString() };
    }

    // 2. Horn-driven revocation closes anything still inside its window.
    if (revokeSet.has(sessionId)) {
      actions.push({
        kind: 'revoke_session',
        sessionId,
        deviceId,
        reason: 'Gjallarhorn raised a halting alarm covering this session.',
      });
      return forceRevoke(session, 'gjallarhorn_halt', now);
    }

    // 3. Idle reaping — closing early is always safe.
    if (idleSeconds(session, now) > session.envelope.maxIdleSeconds) {
      actions.push({
        kind: 'close_idle_session',
        sessionId,
        deviceId,
        reason: `Idle ${idleSeconds(session, now)}s exceeds ${session.envelope.maxIdleSeconds}s.`,
      });
      return { ...session, state: 'closed' as const, terminationReason: 'idle_timeout', lastActivityAt: now.toISOString() };
    }

    // 4. Transport health → degrade, then propose a replacement.
    if (unhealthy.has(transport) && session.state === 'active') {
      const device = deviceById.get(deviceId);
      const replacement = device
        ? selectTransport({
            scopes: session.envelope.scopes,
            fidelity: session.envelope.fidelity,
            supported: device.supportedTransports,
            exclude: [transport, ...Array.from(unhealthy)],
          })
        : undefined;

      actions.push({
        kind: 'degrade_session',
        sessionId,
        deviceId,
        reason: `Transport '${transport}' reported unhealthy.`,
      });

      if (replacement) {
        actions.push({
          kind: 'propose_failover',
          sessionId,
          deviceId,
          reason: `'${replacement.id}' can carry the same scopes at '${session.envelope.fidelity}'.`,
          suggestedTransport: replacement.id,
          // A new transport means a new envelope, which means Heimdall rules again.
          requiresReauthorization: true,
        });
      } else {
        actions.push({
          kind: 'revoke_session',
          sessionId,
          deviceId,
          reason: 'No healthy transport can carry the granted scopes; closing the crossing.',
        });
        return forceRevoke(session, 'no_healthy_transport', now);
      }

      return transition(session, 'degraded', { reason: `transport_unhealthy:${transport}`, now });
    }

    return session;
  });

  return {
    sessions,
    actions,
    alarms: report.alarms,
    halt: report.halt,
    tickedAt: now.toISOString(),
  };
}

/** Sessions still occupying the bridge after a tick. */
export function liveSessions(sessions: BifrostSession[]): BifrostSession[] {
  return sessions.filter(s => !isTerminal(s.state));
}

export function countLiveSessionsOnDevice(sessions: BifrostSession[], deviceId: string): number {
  return liveSessions(sessions).filter(s => s.envelope.deviceId === deviceId).length;
}
