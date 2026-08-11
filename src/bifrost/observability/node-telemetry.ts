/**
 * Node telemetry ingestion and health scoring.
 *
 * Telemetry drives three separate things, and it is worth keeping them apart:
 *
 *   1. Stream adaptation  — handled in desktop/stream-profile.ts.
 *   2. Health scoring     — here; feeds the supervisor's failover decision.
 *   3. Security alarms    — here; handed to Gjallarhorn as observations.
 *
 * A degraded link is an operational problem. A node whose *reported* telemetry
 * contradicts what the session was granted is a security problem, and the two
 * are not treated the same way.
 */

import { LinkTelemetry } from '../desktop/stream-profile';
import { AlarmSeverity, BifrostTransportId, GjallarhornAlarm } from '../types';

export interface EncoderStats {
  targetFps: number;
  actualFps: number;
  droppedFrames: number;
  encodeLatencyMs: number;
}

export interface ResourceStats {
  cpuPct: number;
  gpuPct?: number;
  memoryPct: number;
}

export interface NodeTelemetryReport {
  deviceId: string;
  sessionId?: string;
  transport?: BifrostTransportId;
  link: LinkTelemetry;
  encoder?: EncoderStats;
  resources?: ResourceStats;
  /**
   * Scopes the node believes are active. Compared against the envelope — a
   * mismatch means the node is running something it was not granted.
   */
  activeScopes?: string[];
  reportedAt: string;
}

export type NodeHealth = 'healthy' | 'degraded' | 'failing';

export interface TelemetryAssessment {
  deviceId: string;
  sessionId?: string;
  health: NodeHealth;
  /** 0-100; 100 is a perfect link with headroom to spare. */
  score: number;
  findings: string[];
  /** Set when the transport should be considered unhealthy for failover. */
  transportUnhealthy: boolean;
}

export const DEGRADED_LOSS_PCT = 2;
export const FAILING_LOSS_PCT = 8;
export const DEGRADED_RTT_MS = 120;
export const FAILING_RTT_MS = 300;
export const FRAME_DEFICIT_RATIO = 0.7;

export function assessTelemetry(report: NodeTelemetryReport): TelemetryAssessment {
  const findings: string[] = [];
  let score = 100;

  const { packetLossPct, rttMs, jitterMs } = report.link;

  if (packetLossPct >= FAILING_LOSS_PCT) {
    score -= 50;
    findings.push(`Packet loss ${packetLossPct}% is beyond the failing threshold (${FAILING_LOSS_PCT}%).`);
  } else if (packetLossPct >= DEGRADED_LOSS_PCT) {
    score -= 20;
    findings.push(`Packet loss ${packetLossPct}% exceeds ${DEGRADED_LOSS_PCT}%.`);
  }

  if (rttMs >= FAILING_RTT_MS) {
    score -= 40;
    findings.push(`RTT ${rttMs}ms is beyond the failing threshold (${FAILING_RTT_MS}ms).`);
  } else if (rttMs >= DEGRADED_RTT_MS) {
    score -= 15;
    findings.push(`RTT ${rttMs}ms exceeds ${DEGRADED_RTT_MS}ms.`);
  }

  if (jitterMs > 30) {
    score -= 10;
    findings.push(`Jitter ${jitterMs}ms will be visible as stutter.`);
  }

  if (report.encoder) {
    const { targetFps, actualFps, encodeLatencyMs } = report.encoder;
    if (targetFps > 0 && actualFps / targetFps < FRAME_DEFICIT_RATIO) {
      score -= 25;
      findings.push(`Encoder delivering ${actualFps} of ${targetFps} fps; the host cannot sustain this profile.`);
    }
    if (encodeLatencyMs > 25) {
      score -= 10;
      findings.push(`Encode latency ${encodeLatencyMs}ms is high for an interactive session.`);
    }
  }

  if (report.resources) {
    if (report.resources.cpuPct > 95) {
      score -= 15;
      findings.push(`CPU at ${report.resources.cpuPct}%; the node is saturated.`);
    }
    if (report.resources.memoryPct > 95) {
      score -= 10;
      findings.push(`Memory at ${report.resources.memoryPct}%.`);
    }
  }

  score = Math.max(0, Math.min(100, score));

  const health: NodeHealth = score >= 70 ? 'healthy' : score >= 40 ? 'degraded' : 'failing';

  return {
    deviceId: report.deviceId,
    sessionId: report.sessionId,
    health,
    score,
    findings,
    transportUnhealthy: health === 'failing',
  };
}

/**
 * Security alarms derived from telemetry.
 *
 * The scope-drift rule is the important one: a node reporting an active scope
 * its envelope never granted means enforcement has failed somewhere, and that
 * is a halting condition rather than a degradation.
 */
export function telemetryAlarms(
  report: NodeTelemetryReport,
  grantedScopes: string[]
): GjallarhornAlarm[] {
  const alarms: GjallarhornAlarm[] = [];

  const granted = new Set(grantedScopes);
  const drifted = (report.activeScopes || []).filter(scope => !granted.has(scope));

  if (drifted.length > 0) {
    alarms.push({
      id: `alarm_scope_drift_${report.deviceId}`,
      rule: 'scope_drift',
      severity: 'critical' as AlarmSeverity,
      message:
        `Node ${report.deviceId} reports active scope(s) it was never granted: ${drifted.join(', ')}. ` +
        'Enforcement has failed or the node is compromised.',
      deviceId: report.deviceId,
      sessionId: report.sessionId,
      halts: true,
    });
  }

  const assessment = assessTelemetry(report);
  if (assessment.health === 'failing') {
    alarms.push({
      id: `alarm_node_failing_${report.deviceId}`,
      rule: 'node_failing',
      severity: 'warning',
      message: `Node ${report.deviceId} health score ${assessment.score}: ${assessment.findings.join(' ')}`,
      deviceId: report.deviceId,
      sessionId: report.sessionId,
      halts: false,
    });
  }

  return alarms;
}

/** Rolling window used to decide whether a link has been clean long enough. */
export class TelemetryWindow {
  private samples: NodeTelemetryReport[] = [];

  constructor(private readonly capacity = 10) {}

  push(report: NodeTelemetryReport): void {
    this.samples.push(report);
    if (this.samples.length > this.capacity) this.samples.shift();
  }

  /** Consecutive trailing samples with no congestion. Drives step-up decisions. */
  cleanStreak(): number {
    let streak = 0;
    for (let i = this.samples.length - 1; i >= 0; i--) {
      const { packetLossPct, rttMs } = this.samples[i].link;
      if (packetLossPct >= DEGRADED_LOSS_PCT || rttMs >= DEGRADED_RTT_MS) break;
      streak++;
    }
    return streak;
  }

  latest(): NodeTelemetryReport | undefined {
    return this.samples[this.samples.length - 1];
  }

  size(): number {
    return this.samples.length;
  }
}
