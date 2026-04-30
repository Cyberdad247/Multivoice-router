import { InMemoryCommandQueue } from '../runtime/command-queue';
import { pollAndExecuteOnce } from '../runtime/worker-contract';
import { dryRunEdgeHandler, rustDeskDesktopManifest } from '../workers/edge-worker-stubs';

const queue = new InMemoryCommandQueue();
const input = process.argv.slice(2).join(' ').trim() || 'dry run desktop screenshot';

const command = await queue.enqueue({
  input,
  targetNode: rustDeskDesktopManifest.deviceId,
  riskClass: 'L2_SAFE_EXECUTE',
});

const result = await pollAndExecuteOnce({
  queue,
  manifest: rustDeskDesktopManifest,
  handler: dryRunEdgeHandler,
});

console.log(JSON.stringify({ command, result }, null, 2));
