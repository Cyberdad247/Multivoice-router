export type EngineId =
  | 'APEE'
  | 'VIDENEPTUS'
  | 'OUROBOROS'
  | 'ANTIGRAVITY'
  | 'AETHER'
  | 'GENESIS'
  | 'VERITAS'
  | 'AURORA'
  | 'LYRICUS';

export type EngineDomain =
  | 'input_compilation'
  | 'logic_reasoning'
  | 'memory_truth'
  | 'execution_io'
  | 'connectivity'
  | 'persona'
  | 'verification'
  | 'vision'
  | 'audio_voice';

export interface EngineContext {
  sessionId?: string;
  orgId?: string;
  userId?: string;
  commandId?: string;
  source?: 'voice' | 'text' | 'edge' | 'autonomous' | 'system';
  memoryRefs?: string[];
  policy?: {
    riskLevel?: 'low' | 'medium' | 'high';
    requiresApproval?: boolean;
    approved?: boolean;
  };
}

export interface EngineRequest<TInput = unknown> {
  engineId: EngineId;
  input: TInput;
  context?: EngineContext;
}

export interface EngineResult<TOutput = unknown> {
  engineId: EngineId;
  ok: boolean;
  output?: TOutput;
  errors?: string[];
  warnings?: string[];
  metadata?: Record<string, unknown>;
}

export interface CamelotEngine<TInput = unknown, TOutput = unknown> {
  id: EngineId;
  name: string;
  domain: EngineDomain;
  description: string;
  run(request: EngineRequest<TInput>): Promise<EngineResult<TOutput>>;
}
