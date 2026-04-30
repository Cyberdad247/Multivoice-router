import { CommandQueueAdapter } from './command-queue';
import { runCamelotRuntime } from './camelot-runtime';

export interface RuntimeCommandProcessorOptions {
  queue: CommandQueueAdapter;
  signingSecret: string;
  defaultContext?: Record<string, any>;
}

export async function processCommandOnce(options: RuntimeCommandProcessorOptions, commandId?: string) {
  const command = commandId
    ? await options.queue.get(commandId)
    : await options.queue.pollNext(['queued', 'approved']);

  if (!command) return undefined;

  await options.queue.updateStatus(command.commandId, 'compiled');

  const result = await runCamelotRuntime({
    input: command.input,
    signingSecret: options.signingSecret,
    approved: command.status === 'approved',
    context: {
      ...options.defaultContext,
      commandId: command.commandId,
      cartridge: command.cartridge,
      targetNode: command.targetNode,
      approved: command.status === 'approved',
    }
  });

  if (result.stage === 'HITL_GATE') {
    await options.queue.requestApproval({
      commandId: command.commandId,
      reason: result.antigravity?.reason || 'High-risk action requires approval.',
      riskClass: command.riskClass,
    });
    return result;
  }

  await options.queue.recordResult({
    commandId: command.commandId,
    ok: result.ok,
    stage: result.stage,
    error: result.errors?.join('; '),
    ledgerEventId: result.ledgerEvent?.eventId,
  });

  return result;
}
