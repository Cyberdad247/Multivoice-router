import { CommandQueueAdapter } from './command-queue';
import { CamelotCommandRecord } from './command-types';

export interface EdgeWorkerCapability {
  name: string;
  actions: string[];
  riskLimit: 'L0_OBSERVE' | 'L1_DRAFT' | 'L2_SAFE_EXECUTE' | 'L3_GUARDED_WRITE' | 'L4_HIGH_RISK';
}

export interface EdgeWorkerManifest {
  workerId: string;
  deviceId: string;
  kind: 'desktop' | 'android' | 'browser' | 'termux' | 'cloud_worker' | 'gpu_worker';
  tailscaleName?: string;
  capabilities: EdgeWorkerCapability[];
}

export interface EdgeWorkerResult {
  ok: boolean;
  stage: string;
  outputRef?: string;
  payload?: Record<string, unknown>;
  error?: string;
  ledgerEventId?: string;
}

export type EdgeCommandHandler = (command: CamelotCommandRecord, manifest: EdgeWorkerManifest) => Promise<EdgeWorkerResult>;

export async function pollAndExecuteOnce(input: {
  queue: CommandQueueAdapter;
  manifest: EdgeWorkerManifest;
  handler: EdgeCommandHandler;
}): Promise<EdgeWorkerResult | undefined> {
  const command = await input.queue.pollNext(['queued', 'approved'], input.manifest.deviceId);
  if (!command) return undefined;

  await input.queue.updateStatus(command.commandId, 'executing');

  try {
    const result = await input.handler(command, input.manifest);
    await input.queue.recordResult({
      commandId: command.commandId,
      ok: result.ok,
      stage: result.stage,
      outputRef: result.outputRef,
      error: result.error,
      ledgerEventId: result.ledgerEventId,
    });
    return result;
  } catch (error: any) {
    const result = { ok: false, stage: 'worker_exception', error: error.message || String(error) };
    await input.queue.recordResult({
      commandId: command.commandId,
      ok: false,
      stage: result.stage,
      error: result.error,
    });
    return result;
  }
}
