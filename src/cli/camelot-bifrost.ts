import 'dotenv/config';
import { runBifrostCrossing } from '../bifrost/bifrost-runtime';
import { BIFROST_DEVICES, applyHeartbeat } from '../bifrost/device-registry';
import { InMemoryCommandQueue } from '../runtime/command-queue';
import { BifrostFidelity, BifrostScope, BifrostTransportId } from '../bifrost/types';

function arg(name: string, fallback?: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  return value && !value.startsWith('--') ? value : fallback;
}

function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

const deviceId = arg('device', 'desktop_primary')!;
const transport = arg('transport', 'sunshine_moonlight') as BifrostTransportId;
const fidelity = arg('fidelity', 'view') as BifrostFidelity;
const scopes = (arg('scopes', 'screen_view')! .split(',').map(s => s.trim()).filter(Boolean)) as BifrostScope[];
const purpose = arg('purpose', 'Manual crossing from the Camelot CLI')!;
const requestedBy = arg('by', process.env.CAMELOT_DEFAULT_SIGNER || 'sir_aurelius')!;
const ttl = arg('ttl');

if (flag('help')) {
  console.log(`Usage: npm run camelot:bifrost -- [options]

  --device <id>         Device to cross to           (default desktop_primary)
  --transport <id>      tailscale_mesh | sunshine_moonlight | rustdesk_control
                        | tauri_agent | sonar_sensor
  --fidelity <rung>     observe | view | interact | control
  --scopes <a,b,c>      Comma-separated scope list
  --purpose "<text>"    Recorded in the ledger
  --by <knight>         Requesting identity
  --ttl <seconds>       Requested lifetime (clamped by risk class)
  --approve             Supply human approval for this crossing
  --simulate-heartbeat  Treat the seed device as freshly heartbeating

Heimdall denies crossings to devices with no fresh gatekeeper heartbeat. With no
broker running, pass --simulate-heartbeat to exercise the pipeline locally.`);
  process.exit(0);
}

const signingSecret = process.env.CAMELOT_SIGNING_SECRET;
if (!signingSecret) {
  console.error('Missing CAMELOT_SIGNING_SECRET.');
  process.exit(1);
}

// Without a broker there are no live heartbeats. Simulating one is opt-in and
// announced, so a denial caused by a genuinely silent node is never disguised.
let devices = BIFROST_DEVICES;
if (flag('simulate-heartbeat')) {
  console.error('[notice] --simulate-heartbeat: treating seed devices as freshly heartbeating.');
  devices = BIFROST_DEVICES.map(d => applyHeartbeat(d, new Date(), 'cli-simulated'));
}

const queue = new InMemoryCommandQueue();

const result = await runBifrostCrossing({
  request: {
    requestId: `req_${Date.now().toString(36)}`,
    deviceId,
    transport,
    fidelity,
    scopes,
    purpose,
    requestedBy,
    requestedTtlSeconds: ttl ? Number(ttl) : undefined,
    source: 'cli',
  },
  signingSecret,
  devices,
  sessions: [],
  approved: flag('approve'),
  queue,
  context: { signedBy: requestedBy },
});

console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 2);
