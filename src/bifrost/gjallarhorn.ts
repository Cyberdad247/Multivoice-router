/**
 * Gjallarhorn — the horn that sounds when something is wrong on the bridge.
 *
 * Consumes Sonar flow observations, gatekeeper heartbeats and live session state,
 * and emits alarms. Critical alarms halt the bridge: Heimdall refuses new
 * crossings and the supervisor revokes affected sessions.
 *
 * Pure functions. The caller supplies observations; this module never captures
 * packets itself.
 */

import { isTailnetPeer } from './device-registry';
import {
  AlarmSeverity,
  BifrostDevice,
  BifrostSession,
  GjallarhornAlarm,
  SonarFlowObservation,
} from './types';
import { HEARTBEAT_STALE_SECONDS, heartbeatAgeSeconds } from './device-registry';

/**
 * Protocols expected to appear on a healthy bridge. Anything else on a link
 * carrying a live session is reported — this is the "unauthorized protocol"
 * check Sonar exists to support.
 */
export const EXPECTED_BRIDGE_PROTOCOLS = new Set([
  'wireguard',
  'udp',
  'tcp',
  'quic',
  'https',
  'tls',
  'dns',
  'icmp',
]);

/** Protocols that indicate someone is reaching the machine outside the bridge. */
export const FORBIDDEN_BRIDGE_PROTOCOLS = new Set([
  'telnet',
  'ftp',
  'smb',
  'rdp',
  'vnc',
  'http',
]);

export const MAX_CONCURRENT_SESSIONS_PER_DEVICE = 2;

export interface GjallarhornInput {
  devices: BifrostDevice[];
  sessions: BifrostSession[];
  observations?: SonarFlowObservation[];
  /**
   * Alarms raised elsewhere — node telemetry (`telemetryAlarms`) and the
   * Redteam (`redteamAlarms`) — folded in so halting and revocation are decided
   * in one place rather than by each producer separately.
   */
  extraAlarms?: GjallarhornAlarm[];
  now?: Date;
}

export interface GjallarhornReport {
  ok: boolean;
  /** True when any critical alarm fired. New crossings must be denied. */
  halt: boolean;
  alarms: GjallarhornAlarm[];
  /** Devices with at least one halting alarm. */
  haltedDeviceIds: string[];
  /** Sessions the supervisor should revoke immediately. */
  revokeSessionIds: string[];
  evaluatedAt: string;
}

function alarm(
  rule: string,
  severity: AlarmSeverity,
  message: string,
  extra: Partial<GjallarhornAlarm> = {}
): GjallarhornAlarm {
  return {
    id: `alarm_${rule}_${extra.deviceId || extra.sessionId || 'global'}`,
    rule,
    severity,
    message,
    halts: severity === 'critical',
    ...extra,
  };
}

const LIVE_STATES = new Set(['provisioning', 'active', 'degraded']);

export function soundGjallarhorn(input: GjallarhornInput): GjallarhornReport {
  const now = input.now || new Date();
  const observations = input.observations || [];
  const alarms: GjallarhornAlarm[] = [...(input.extraAlarms || [])];

  const liveSessions = input.sessions.filter(s => LIVE_STATES.has(s.state));

  // --- Rule: peer outside the tailnet ------------------------------------
  for (const obs of observations) {
    if (!isTailnetPeer(obs.peerAddress)) {
      alarms.push(
        alarm(
          'off_tailnet_peer',
          'critical',
          `Traffic with non-tailnet peer ${obs.peerAddress} (${obs.protocol}) observed on the bridge.`,
          { deviceId: undefined }
        )
      );
    }
  }

  // --- Rule: forbidden or unexpected protocol ----------------------------
  for (const obs of observations) {
    const proto = obs.protocol.toLowerCase();
    if (FORBIDDEN_BRIDGE_PROTOCOLS.has(proto)) {
      alarms.push(
        alarm(
          'forbidden_protocol',
          'critical',
          `Forbidden protocol ${proto} from ${obs.peerAddress} — a remote-access path exists outside the Bifrost.`
        )
      );
    } else if (!EXPECTED_BRIDGE_PROTOCOLS.has(proto)) {
      alarms.push(
        alarm('unexpected_protocol', 'warning', `Unrecognized protocol ${proto} from ${obs.peerAddress}.`)
      );
    }
  }

  // --- Rule: stale gatekeeper heartbeat ----------------------------------
  const devicesWithLiveSessions = new Set(liveSessions.map(s => s.envelope.deviceId));
  for (const device of input.devices) {
    if (!devicesWithLiveSessions.has(device.deviceId)) continue;
    const age = heartbeatAgeSeconds(device, now);
    if (age === undefined) {
      alarms.push(
        alarm(
          'no_heartbeat',
          'critical',
          `Device ${device.deviceId} has a live session but has never reported a heartbeat.`,
          { deviceId: device.deviceId }
        )
      );
    } else if (age > HEARTBEAT_STALE_SECONDS) {
      alarms.push(
        alarm(
          'stale_heartbeat',
          'critical',
          `Gatekeeper on ${device.deviceId} silent for ${age}s (limit ${HEARTBEAT_STALE_SECONDS}s).`,
          { deviceId: device.deviceId }
        )
      );
    }
  }

  // --- Rule: session outlived its envelope -------------------------------
  for (const session of liveSessions) {
    if (now >= new Date(session.envelope.notAfter)) {
      alarms.push(
        alarm(
          'session_overrun',
          'critical',
          `Session ${session.envelope.sessionId} is still ${session.state} past notAfter ${session.envelope.notAfter}.`,
          { deviceId: session.envelope.deviceId, sessionId: session.envelope.sessionId }
        )
      );
    }
  }

  // --- Rule: idle beyond the envelope's tolerance ------------------------
  for (const session of liveSessions) {
    const idleSeconds = Math.floor((now.getTime() - new Date(session.lastActivityAt).getTime()) / 1000);
    if (idleSeconds > session.envelope.maxIdleSeconds) {
      alarms.push(
        alarm(
          'idle_timeout',
          'warning',
          `Session ${session.envelope.sessionId} idle ${idleSeconds}s (limit ${session.envelope.maxIdleSeconds}s).`,
          { deviceId: session.envelope.deviceId, sessionId: session.envelope.sessionId }
        )
      );
    }
  }

  // --- Rule: too many concurrent sessions on one device ------------------
  const perDevice = new Map<string, number>();
  for (const session of liveSessions) {
    const key = session.envelope.deviceId;
    perDevice.set(key, (perDevice.get(key) || 0) + 1);
  }
  for (const [deviceId, count] of perDevice) {
    if (count > MAX_CONCURRENT_SESSIONS_PER_DEVICE) {
      alarms.push(
        alarm(
          'session_fanout',
          'critical',
          `${count} concurrent sessions on ${deviceId} (limit ${MAX_CONCURRENT_SESSIONS_PER_DEVICE}).`,
          { deviceId }
        )
      );
    }
  }

  const halting = alarms.filter(a => a.halts);
  const haltedDeviceIds = Array.from(
    new Set(halting.map(a => a.deviceId).filter((d): d is string => Boolean(d)))
  );

  /**
   * Some critical alarms cannot be attributed to a device — an unauthorized
   * peer or a forbidden protocol is observed on the bridge itself, and Sonar
   * cannot always say which node it reached. Those are treated as compromise of
   * the whole bridge: every live session is revoked rather than only the ones
   * we happen to be able to name.
   */
  const hasUnattributableCritical = halting.some(a => !a.deviceId && !a.sessionId);

  const revokeSessionIds = Array.from(
    new Set([
      ...halting.map(a => a.sessionId).filter((s): s is string => Boolean(s)),
      ...liveSessions
        .filter(s => hasUnattributableCritical || haltedDeviceIds.includes(s.envelope.deviceId))
        .map(s => s.envelope.sessionId),
    ])
  );

  return {
    ok: alarms.length === 0,
    halt: halting.length > 0,
    alarms,
    haltedDeviceIds,
    revokeSessionIds,
    evaluatedAt: now.toISOString(),
  };
}

/** Convert a raw Sonar flow-matrix export into observations the horn understands. */
export function normalizeSonarFlows(rows: Array<Record<string, any>>): SonarFlowObservation[] {
  return rows.map(row => ({
    peerAddress: String(row.peer_address ?? row.peerAddress ?? row.dst ?? ''),
    protocol: String(row.protocol ?? row.proto ?? 'unknown'),
    port: row.port !== undefined ? Number(row.port) : undefined,
    direction: row.direction === 'inbound' ? 'inbound' : 'outbound',
    bytes: Number(row.bytes ?? 0),
    observedAt: String(row.observed_at ?? row.observedAt ?? new Date().toISOString()),
  }));
}
