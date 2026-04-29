export type TitanIntent =
  | 'conversation'
  | 'android_action'
  | 'browser_action'
  | 'cli_action'
  | 'approval_response'
  | 'memory_query'
  | 'autonomous_trigger'
  | 'system_control';

export interface TitanPrompt {
  schemaVersion: 'titan.v1';
  intent: TitanIntent;
  rawInput: string;
  normalizedInput: string;
  anchors: string[];
  entities: Record<string, unknown>;
  constraints: {
    riskLevel: 'low' | 'medium' | 'high';
    requiresApproval: boolean;
    modelMode: 'scaffolding' | 'sculpting';
    skillRefs: string[];
  };
  routing: {
    targetNode: string;
    preferredEngine: 'APEE' | 'VIDENEPTUS' | 'AETHER' | 'OUROBOROS';
  };
  confidence: number;
}

export function validateTitanPrompt(prompt: TitanPrompt): string[] {
  const errors: string[] = [];
  if (prompt.schemaVersion !== 'titan.v1') errors.push('Invalid Titan schema version.');
  if (!prompt.rawInput?.trim()) errors.push('rawInput is required.');
  if (!prompt.normalizedInput?.trim()) errors.push('normalizedInput is required.');
  if (!prompt.intent) errors.push('intent is required.');
  if (!prompt.routing?.targetNode) errors.push('routing.targetNode is required.');
  if (prompt.confidence < 0 || prompt.confidence > 1) errors.push('confidence must be between 0 and 1.');
  return errors;
}
