export type OmniRouteStrategy =
  | 'auto_combo'
  | 'context_relay'
  | 'fill_first'
  | 'cost_optimized'
  | 'least_used'
  | 'p2c'
  | 'random'
  | 'latency_optimized'
  | 'quota_aware'
  | 'stability_first'
  | 'task_fit'
  | 'budget_guarded'
  | 'local_first';

export type OmniRouteTier = 1 | 2 | 3 | 4;

export interface OmniRouteModelNode {
  provider: string;
  model: string;
  tier: OmniRouteTier;
  health: number;
  quota: number;
  costInverse: number;
  latencyInverse: number;
  taskFit: number;
  stability: number;
  excludedUntil?: string;
}

export interface OmniRouteCombo {
  id: string;
  strategy: OmniRouteStrategy;
  models: OmniRouteModelNode[];
  budgetUsd?: number;
}

export interface OmniRouteRequest {
  combo: OmniRouteCombo;
  task: string;
  contextRelay?: {
    sessionId: string;
    handoffSummary: string;
    memoryRefs: string[];
  };
}

export interface OmniRouteDecision {
  selected: OmniRouteModelNode;
  score: number;
  strategy: OmniRouteStrategy;
  endpoint: string;
  contextRelayInjected: boolean;
  fallbackTier: OmniRouteTier;
  notes: string[];
}

export function scoreNode(node: OmniRouteModelNode) {
  return (
    node.health * 0.25 +
    node.quota * 0.20 +
    node.costInverse * 0.20 +
    node.latencyInverse * 0.15 +
    node.taskFit * 0.10 +
    node.stability * 0.10
  );
}

function isAvailable(node: OmniRouteModelNode) {
  if (!node.excludedUntil) return true;
  return Date.now() > new Date(node.excludedUntil).getTime();
}

export function runOmniRoute(request: OmniRouteRequest): OmniRouteDecision {
  const available = request.combo.models.filter(isAvailable);
  if (available.length === 0) throw new Error('No OmniRoute providers available.');

  const ranked = [...available].sort((a, b) => {
    if (request.combo.strategy === 'fill_first') return a.tier - b.tier;
    if (request.combo.strategy === 'cost_optimized') return b.costInverse - a.costInverse;
    if (request.combo.strategy === 'latency_optimized') return b.latencyInverse - a.latencyInverse;
    if (request.combo.strategy === 'quota_aware') return b.quota - a.quota;
    if (request.combo.strategy === 'local_first') return a.provider === 'ollama' ? -1 : 1;
    return scoreNode(b) - scoreNode(a);
  });

  const selected = ranked[0];

  return {
    selected,
    score: scoreNode(selected),
    strategy: request.combo.strategy,
    endpoint: 'http://localhost:20128/v1',
    contextRelayInjected: Boolean(request.contextRelay),
    fallbackTier: selected.tier,
    notes: [
      `Selected ${selected.provider}/${selected.model} using ${request.combo.strategy}.`,
      request.contextRelay ? 'Context relay summary should be injected into system prompt.' : 'No context relay required.'
    ]
  };
}
