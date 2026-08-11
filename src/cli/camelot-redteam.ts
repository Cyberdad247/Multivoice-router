import 'dotenv/config';
import { runRedteam, formatRedteamReport } from '../bifrost/redteam/redteam-runner';
import { BIFROST_DEVICES, applyHeartbeat } from '../bifrost/device-registry';
import { REDTEAM_PROBES } from '../bifrost/redteam/redteam-probes';
import { FindingSeverity } from '../bifrost/redteam/redteam-probes';

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;
  const value = process.argv[index + 1];
  return value && !value.startsWith('--') ? value : undefined;
}

function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

if (flag('help')) {
  console.log(`Camelot Defense Redteam — adversarial audit of your own bridge configuration.

Usage: npm run camelot:redteam -- [options]

  --only <a,b,c>        Run only these probes
  --min <severity>      Drop findings below info|low|medium|high|critical
  --json                Emit JSON instead of the text report
  --simulate-heartbeat  Treat seed devices as freshly heartbeating
  --list                List available probes and exit

Exit codes: 0 clean, 1 findings present, 2 critical findings (halt recommended).

Every probe reads configuration and derives consequences. Nothing here touches a
remote host or tests a credential, so it is safe to run continuously.`);
  process.exit(0);
}

if (flag('list')) {
  for (const probe of REDTEAM_PROBES) {
    console.log(`${probe.id.padEnd(20)} [${probe.category}] ${probe.question}`);
  }
  process.exit(0);
}

const devices = flag('simulate-heartbeat')
  ? BIFROST_DEVICES.map(d => applyHeartbeat(d, new Date(), 'cli-simulated'))
  : BIFROST_DEVICES;

const only = arg('only')?.split(',').map(s => s.trim()).filter(Boolean);

const report = runRedteam(
  { devices, sessions: [], sharedSigningSecret: true },
  { only, minSeverity: arg('min') as FindingSeverity | undefined }
);

console.log(flag('json') ? JSON.stringify(report, null, 2) : formatRedteamReport(report));

process.exit(report.haltRecommended ? 2 : report.findings.length > 0 ? 1 : 0);
