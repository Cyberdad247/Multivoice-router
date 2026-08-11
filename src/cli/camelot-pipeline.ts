import 'dotenv/config';
import { readFileSync } from 'fs';
import { authorizePipeline, verifyPipelineGrant, pipelineHash } from '../bifrost/cicd/pipeline-authorization';
import { planPipelineRun, executePipelineRun } from '../bifrost/cicd/pipeline-runtime';
import { validatePipeline, pipelineScopes, pipelineDevices } from '../bifrost/cicd/pipeline-schema';
import { BIFROST_DEVICES, applyHeartbeat } from '../bifrost/device-registry';

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;
  const value = process.argv[index + 1];
  return value && !value.startsWith('--') ? value : undefined;
}

function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

const command = process.argv[2];

if (!command || flag('help') || !['validate', 'authorize', 'plan', 'run'].includes(command)) {
  console.log(`Private CI/CD over the Bifrost Bridge.

Usage: npm run camelot:pipeline -- <command> [options]

  validate  --pipeline <file.json>
  authorize --pipeline <file.json> --by <approver> [--devices a,b] [--scopes a,b]
            [--max-runs <n>] [--days <n>] --out <grant.json>
  plan      --pipeline <file.json> --grant <grant.json>
  run       --pipeline <file.json> --grant <grant.json>

A grant pins the pipeline by hash. Editing any command invalidates it and the
pipeline returns to a human for re-approval.

  --simulate-heartbeat  Treat seed devices as freshly heartbeating`);
  process.exit(command ? 0 : 1);
}

function loadJson(path: string | undefined, label: string): any {
  if (!path) {
    console.error(`Missing --${label}.`);
    process.exit(1);
  }
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error: any) {
    console.error(`Could not read ${label} at ${path}: ${error?.message || error}`);
    process.exit(1);
  }
}

const pipeline = loadJson(arg('pipeline'), 'pipeline');

if (command === 'validate') {
  const validation = validatePipeline(pipeline);
  console.log(
    JSON.stringify(
      {
        ...validation,
        pipelineHash: pipelineHash(pipeline),
        scopes: pipelineScopes(pipeline),
        devices: pipelineDevices(pipeline),
      },
      null,
      2
    )
  );
  process.exit(validation.ok ? 0 : 1);
}

const secret = process.env.CAMELOT_SIGNING_SECRET;
if (!secret) {
  console.error('Missing CAMELOT_SIGNING_SECRET.');
  process.exit(1);
}

if (command === 'authorize') {
  const approvedBy = arg('by');
  if (!approvedBy) {
    console.error('Missing --by. A grant records who took responsibility for it.');
    process.exit(1);
  }

  const days = Number(arg('days') || 30);
  const issued = authorizePipeline({
    pipeline,
    approvedBy,
    secret,
    limits: {
      scopeCeiling: (arg('scopes')?.split(',').map(s => s.trim()) as any) || pipelineScopes(pipeline),
      allowedDeviceIds: arg('devices')?.split(',').map(s => s.trim()) || pipelineDevices(pipeline),
      maxRunsPerHour: Number(arg('max-runs') || 6),
      expiresAt: new Date(Date.now() + days * 86400_000).toISOString(),
    },
  });

  console.log(JSON.stringify(issued, null, 2));
  process.exit(issued.ok ? 0 : 1);
}

const grant = loadJson(arg('grant'), 'grant');

const devices = flag('simulate-heartbeat')
  ? BIFROST_DEVICES.map(d => applyHeartbeat(d, new Date(), 'cli-simulated'))
  : BIFROST_DEVICES;

// Report grant validity first — it is the most common reason a run is refused.
const grantCheck = verifyPipelineGrant(grant, pipeline, secret);
if (!grantCheck.ok) {
  console.error(`Grant rejected: ${grantCheck.reason}`);
  process.exit(2);
}

if (command === 'plan') {
  const plan = planPipelineRun({ pipeline, grant, secret, devices });
  console.log(JSON.stringify(plan, null, 2));
  process.exit(plan.ok ? 0 : 1);
}

const result = await executePipelineRun({
  pipeline,
  grant,
  secret,
  signingSecret: secret,
  devices,
  sessions: [],
});

console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
