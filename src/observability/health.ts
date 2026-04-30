export interface CamelotHealthStatus {
  ok: boolean;
  service: string;
  version: string;
  checks: Record<string, 'ok' | 'degraded' | 'down' | 'unknown'>;
  timestamp: string;
}

export function buildHealthStatus(checks: CamelotHealthStatus['checks'] = {}): CamelotHealthStatus {
  const values = Object.values(checks);
  return {
    ok: values.every(v => v === 'ok') || values.length === 0,
    service: 'camelot-os-multivoice-router',
    version: 'v400.5.3',
    checks,
    timestamp: new Date().toISOString(),
  };
}

export interface CamelotRuntimeMetrics {
  commandsQueued: number;
  commandsCompleted: number;
  commandsFailed: number;
  approvalsPending: number;
  memoryWrites: number;
  activeDevices: number;
}

export function emptyMetrics(): CamelotRuntimeMetrics {
  return {
    commandsQueued: 0,
    commandsCompleted: 0,
    commandsFailed: 0,
    approvalsPending: 0,
    memoryWrites: 0,
    activeDevices: 0,
  };
}
