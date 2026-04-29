export type ReasoningTopology = 'CoT' | 'ToT' | 'GoT' | 'DoT' | 'HTN';
export type InferenceProvider = 'cerebras' | 'openai' | 'anthropic' | 'ollama' | 'modal';
export type ReasoningMode = 'precision' | 'balanced' | 'creative' | 'kinetic';

export interface VideneptusInput {
  intent: string;
  payload?: Record<string, unknown>;
  targetNode?: string;
  riskLevel?: 'low' | 'medium' | 'high';
  requiresApproval?: boolean;
}

export interface VideneptusOutput {
  mode: ReasoningMode;
  topology: ReasoningTopology;
  provider: InferenceProvider;
  lacSweep: number[];
  decomposition: Array<{
    id: string;
    label: string;
    kind: 'reason' | 'plan' | 'execute' | 'verify' | 'memory';
  }>;
  routeHint: 'local_first' | 'cloud_swarm' | 'hybrid';
  notes: string[];
}

function textOf(input: VideneptusInput) {
  return `${input.intent} ${JSON.stringify(input.payload || {})}`.toLowerCase();
}

export function selectReasoningMode(input: VideneptusInput): ReasoningMode {
  const text = textOf(input);
  if (input.riskLevel === 'high' || /legal|contract|finance|delete|payment|password|compliance/.test(text)) return 'precision';
  if (/campaign|brand|story|creative|song|video|content/.test(text)) return 'creative';
  if (input.targetNode && input.targetNode !== 'gemini') return 'kinetic';
  return 'balanced';
}

export function selectLacSweep(mode: ReasoningMode): number[] {
  switch (mode) {
    case 'precision': return [0.1, 0.2, 0.3, 0.2];
    case 'creative': return [0.7, 0.9, 1.2, 0.8];
    case 'kinetic': return [0.2, 0.4, 0.6, 0.3];
    default: return [0.2, 0.7, 1.2, 0.4];
  }
}

export function selectTopology(input: VideneptusInput, mode: ReasoningMode): ReasoningTopology {
  const text = textOf(input);
  if (/document|report|brief|paper|contract/.test(text)) return 'DoT';
  if (/dependency|graph|architecture|relationship|system/.test(text)) return 'GoT';
  if (/multi step|workflow|decompose|plan|execute/.test(text) || mode === 'kinetic') return 'HTN';
  if (/compare|option|strategy|reason|solve/.test(text)) return 'ToT';
  return 'CoT';
}

export function selectProvider(input: VideneptusInput, mode: ReasoningMode): InferenceProvider {
  const text = textOf(input);
  if (mode === 'kinetic') return 'cerebras';
  if (/offline|local|private/.test(text)) return 'ollama';
  if (/heavy|batch|video|audio|large/.test(text)) return 'modal';
  if (mode === 'creative') return 'anthropic';
  return 'openai';
}

export function runVideneptus(input: VideneptusInput): VideneptusOutput {
  const mode = selectReasoningMode(input);
  const topology = selectTopology(input, mode);
  const provider = selectProvider(input, mode);
  const lacSweep = selectLacSweep(mode);

  const decomposition: VideneptusOutput['decomposition'] = [
    { id: 'sense', label: 'Confirm compiled Titan intent and constraints', kind: 'reason' },
    { id: 'plan', label: `Apply ${topology} topology under ${mode} mode`, kind: 'plan' },
    { id: 'delegate', label: 'Delegate executable work to the appropriate L2/L5 node', kind: 'execute' },
    { id: 'verify', label: 'Run VERITAS check before final response', kind: 'verify' },
    { id: 'remember', label: 'Emit OUROBOROS memory event', kind: 'memory' },
  ];

  const routeHint = provider === 'ollama' ? 'local_first' : provider === 'modal' ? 'cloud_swarm' : 'hybrid';

  return {
    mode,
    topology,
    provider,
    lacSweep,
    decomposition,
    routeHint,
    notes: [
      `Videneptus selected ${topology} using ${mode} mode.`,
      `Inference provider hint: ${provider}.`,
      `LaC sweep: ${lacSweep.join(' -> ')}.`
    ]
  };
}
