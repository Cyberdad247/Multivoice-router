import { MerlinInput, MerlinOutput, Plan } from './types';
import { scoreStrategy } from './scoring';

function nowId(prefix: string) {
  return `${prefix}_${Date.now()}`;
}

export async function runMerlin(input: MerlinInput): Promise<MerlinOutput> {
  const { titan } = input;

  const temps = [0.2, 0.7, 1.2, 0.4];
  const candidates = temps.flatMap(t => scoreStrategy(titan.intent, titan.routing.targetNode, t));

  const best = candidates.sort((a, b) => b.score - a.score)[0];

  const plan: Plan = {
    planId: nowId('plan'),
    root: 'root',
    nodes: {
      root: { id: 'root', kind: 'task', intent: titan.intent },
      exec: {
        id: 'exec',
        kind: 'task',
        intent: titan.intent,
        tool: titan.routing.targetNode,
        requiresApproval: titan.constraints.requiresApproval,
        deps: ['root']
      },
      join: { id: 'join', kind: 'join', intent: 'complete', deps: ['exec'] }
    },
    metadata: {
      strategy: best.name,
      confidence: Math.min(0.95, best.score),
      createdAt: new Date().toISOString()
    }
  };

  return {
    plan,
    trace: {
      branchesEvaluated: candidates.length,
      chosenStrategy: best.name,
      notes: best.notes
    }
  };
}
