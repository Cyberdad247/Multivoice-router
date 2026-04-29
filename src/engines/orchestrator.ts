import { getEngine } from './registry';
import './index';
import { EngineContext } from './types';

export async function runCamelotPipeline(input: any, context: EngineContext = {}) {
  const apee = getEngine('APEE')!;
  const genesis = getEngine('GENESIS')!;
  const reasoning = getEngine('VIDENEPTUS')!;
  const veritas = getEngine('VERITAS')!;
  const router = getEngine('AETHER')!;
  const execution = getEngine('ANTIGRAVITY')!;
  const memory = getEngine('OUROBOROS')!;

  let data: any = await apee.run({ engineId: 'APEE', input, context });
  data = data.output;

  data = (await genesis.run({ engineId: 'GENESIS', input: data, context })).output;
  data = (await reasoning.run({ engineId: 'VIDENEPTUS', input: data, context })).output;

  const verified = await veritas.run({ engineId: 'VERITAS', input: data, context });
  if (!verified.ok) {
    return { ok: false, stage: 'VERITAS', errors: verified.warnings };
  }

  data = verified.output;
  data = (await router.run({ engineId: 'AETHER', input: data, context })).output;

  const exec = await execution.run({ engineId: 'ANTIGRAVITY', input: data, context });
  if (!exec.ok) {
    return { ok: false, stage: 'ANTIGRAVITY', errors: exec.warnings, data: exec.output };
  }

  const result = exec.output;

  await memory.run({ engineId: 'OUROBOROS', input: { input, result }, context });

  return {
    ok: true,
    result,
  };
}
