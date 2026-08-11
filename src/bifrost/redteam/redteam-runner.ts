/**
 * Camelot Defense Redteam — runner.
 *
 * Executes the probe registry against a snapshot of the bridge and returns a
 * ranked report. Safe to run continuously: every probe is a pure function over
 * configuration, so a scheduled run costs nothing and touches nothing.
 *
 * Critical findings are converted into halting Gjallarhorn alarms. That is a
 * deliberate escalation — a broken journal chain or a session running past its
 * envelope means an invariant has already failed, and the bridge should close
 * rather than wait for someone to read a report.
 */

import { REDTEAM_PROBES, RedteamContext, RedteamFinding, FindingSeverity, RedteamProbe, reachableScopes, worstRiskOf } from './redteam-probes';
import { GjallarhornAlarm } from '../types';

const SEVERITY_ORDER: FindingSeverity[] = ['info', 'low', 'medium', 'high', 'critical'];

export function severityRank(severity: FindingSeverity): number {
  return SEVERITY_ORDER.indexOf(severity);
}

/** Points deducted from a 100-point posture score, per finding. */
const SEVERITY_WEIGHT: Record<FindingSeverity, number> = {
  info: 0,
  low: 2,
  medium: 6,
  high: 15,
  critical: 30,
};

export interface DeviceExposure {
  deviceId: string;
  reachableScopes: string[];
  worstRiskClass: string;
  findingCount: number;
}

export interface RedteamReport {
  ok: boolean;
  /** 100 is a clean posture. Falls as findings accumulate. */
  postureScore: number;
  findings: RedteamFinding[];
  countsBySeverity: Record<FindingSeverity, number>;
  /** Per-device blast radius, worst first. */
  exposure: DeviceExposure[];
  probesRun: string[];
  /** True when at least one critical finding demands the bridge close. */
  haltRecommended: boolean;
  evaluatedAt: string;
}

export interface RedteamOptions {
  /** Restrict to specific probe ids. Empty or omitted runs everything. */
  only?: string[];
  /** Findings below this severity are dropped from the report. */
  minSeverity?: FindingSeverity;
}

export function runRedteam(context: RedteamContext, options: RedteamOptions = {}): RedteamReport {
  const now = context.now || new Date();
  const selected: RedteamProbe[] =
    options.only && options.only.length > 0
      ? REDTEAM_PROBES.filter(p => options.only!.includes(p.id))
      : REDTEAM_PROBES;

  const floor = options.minSeverity ? severityRank(options.minSeverity) : 0;

  const findings = selected
    .flatMap(probe => {
      try {
        return probe.run({ ...context, now });
      } catch (error: any) {
        // A probe that throws is itself a finding — never let one bad probe
        // silently shrink the report.
        return [
          {
            id: `rt_probe_error_${probe.id}`,
            probeId: probe.id,
            category: probe.category,
            severity: 'medium' as FindingSeverity,
            title: `Probe '${probe.id}' failed to run`,
            detail: String(error?.message || error),
            consequence: 'This class of weakness went unchecked in this run.',
            remediation: 'Fix the probe; treat its category as unaudited until it runs clean.',
          },
        ];
      }
    })
    .filter(f => severityRank(f.severity) >= floor)
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity));

  const countsBySeverity = SEVERITY_ORDER.reduce(
    (acc, severity) => ({ ...acc, [severity]: findings.filter(f => f.severity === severity).length }),
    {} as Record<FindingSeverity, number>
  );

  const deduction = findings.reduce((sum, f) => sum + SEVERITY_WEIGHT[f.severity], 0);
  const postureScore = Math.max(0, 100 - deduction);

  const findingsByDevice = new Map<string, number>();
  for (const f of findings) {
    if (!f.deviceId) continue;
    findingsByDevice.set(f.deviceId, (findingsByDevice.get(f.deviceId) || 0) + 1);
  }

  const exposure: DeviceExposure[] = context.devices
    .map(device => {
      const scopes = reachableScopes(device);
      return {
        deviceId: device.deviceId,
        reachableScopes: scopes,
        worstRiskClass: worstRiskOf(scopes),
        findingCount: findingsByDevice.get(device.deviceId) || 0,
      };
    })
    .sort((a, b) => b.reachableScopes.length - a.reachableScopes.length);

  return {
    ok: findings.length === 0,
    postureScore,
    findings,
    countsBySeverity,
    exposure,
    probesRun: selected.map(p => p.id),
    haltRecommended: countsBySeverity.critical > 0,
    evaluatedAt: now.toISOString(),
  };
}

/**
 * Convert a report into alarms Gjallarhorn can carry.
 *
 * Critical findings halt; high findings warn (which escalates new crossings to
 * requiring approval); everything below is reported without gating.
 */
export function redteamAlarms(report: RedteamReport): GjallarhornAlarm[] {
  return report.findings
    .filter(f => severityRank(f.severity) >= severityRank('high'))
    .map(f => ({
      id: `alarm_${f.id}`,
      rule: `redteam_${f.probeId}`,
      severity: f.severity === 'critical' ? ('critical' as const) : ('warning' as const),
      message: `${f.title} — ${f.consequence}`,
      deviceId: f.deviceId,
      sessionId: f.sessionId,
      halts: f.severity === 'critical',
    }));
}

/** Terminal-friendly summary. Used by the CLI and the journal. */
export function formatRedteamReport(report: RedteamReport): string {
  const lines: string[] = [];

  lines.push(`Camelot Defense Redteam — posture ${report.postureScore}/100`);
  lines.push(
    `  critical ${report.countsBySeverity.critical}  high ${report.countsBySeverity.high}  ` +
      `medium ${report.countsBySeverity.medium}  low ${report.countsBySeverity.low}`
  );
  if (report.haltRecommended) {
    lines.push('  HALT RECOMMENDED — a critical invariant has already failed.');
  }

  lines.push('');
  lines.push('Blast radius by device:');
  for (const device of report.exposure) {
    lines.push(
      `  ${device.deviceId.padEnd(20)} ${device.worstRiskClass.padEnd(16)} ${device.reachableScopes.length} scope(s)`
    );
  }

  if (report.findings.length > 0) {
    lines.push('');
    lines.push('Findings:');
    for (const f of report.findings) {
      lines.push(`  [${f.severity.toUpperCase()}] ${f.title}`);
      lines.push(`      ${f.detail}`);
      lines.push(`      consequence: ${f.consequence}`);
      lines.push(`      fix:         ${f.remediation}`);
    }
  }

  return lines.join('\n');
}
