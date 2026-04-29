import { TitanPrompt } from '../anya/titan-schema';

export type PlanNodeKind = 'task' | 'decision' | 'fanout' | 'join';

export interface PlanNode {
  id: string;
  kind: PlanNodeKind;
  intent: string;
  tool?: string;
  payload?: Record<string, unknown>;
  requiresApproval?: boolean;
  deps?: string[];
  budget?: {
    tokens?: number;
    timeMs?: number;
  };
}

export interface Plan {
  planId: string;
  root: string;
  nodes: Record<string, PlanNode>;
  metadata: {
    strategy: 'local_first' | 'cloud_swarm' | 'hybrid';
    confidence: number;
    createdAt: string;
  };
}

export interface MerlinInput {
  titan: TitanPrompt;
  ukgRefs?: string[];
  limits: {
    maxBranches: number;
    maxFanout: number;
  };
}

export interface MerlinOutput {
  plan: Plan;
  trace: {
    branchesEvaluated: number;
    chosenStrategy: string;
    notes: string[];
  };
}
