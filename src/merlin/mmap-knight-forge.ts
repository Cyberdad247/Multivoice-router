export interface MmapKnightForgeInput {
  domain: string;
  mission: string;
  constraints?: string[];
  riskProfile?: 'low' | 'medium' | 'high';
}

export interface MmapSelectedModel {
  name: string;
  reason: string;
  forgeUse: string;
}

export interface MmapKnightForgeOutput {
  selectedModels: MmapSelectedModel[];
  cognitiveLattice: string[];
  proteusBiasHints: Record<string, number>;
  skillGraphHints: {
    s1: string[];
    s2: string[];
    s3: string[];
    s4: string[];
  };
  reflectionPrompts: string[];
}

function text(input: MmapKnightForgeInput) {
  return `${input.domain} ${input.mission} ${(input.constraints || []).join(' ')}`.toLowerCase();
}

export function applyMmapToKnightForge(input: MmapKnightForgeInput): MmapKnightForgeOutput {
  const t = text(input);
  const selectedModels: MmapSelectedModel[] = [];

  selectedModels.push({
    name: 'First Principles',
    reason: 'Defines the Knight from core mission requirements instead of surface persona adjectives.',
    forgeUse: 'Extract atomic purpose, domain primitives, and non-negotiable constraints.'
  });

  selectedModels.push({
    name: 'Inversion',
    reason: 'Identifies failure modes before encoding behavior.',
    forgeUse: 'Generate anti-patterns, refusal boundaries, and risk checks.'
  });

  selectedModels.push({
    name: 'Second-Order Thinking',
    reason: 'Ensures the Knight accounts for downstream consequences of recommendations or actions.',
    forgeUse: 'Add long-horizon reasoning and impact evaluation to S3/S4 skills.'
  });

  if (/finance|legal|contract|compliance|security/.test(t)) {
    selectedModels.push({
      name: 'Margin of Safety',
      reason: 'High-stakes domains require conservative buffers and validation gates.',
      forgeUse: 'Raise conscientiousness and honesty-humility; add Veritas/Gideon checks.'
    });
  }

  if (/market|sales|growth|platform|social|community/.test(t)) {
    selectedModels.push({
      name: 'Incentives',
      reason: 'Market-facing Knights must understand why actors behave as they do.',
      forgeUse: 'Add stakeholder mapping and persuasion-risk awareness.'
    });
  }

  if (/system|architecture|workflow|automation|agent/.test(t)) {
    selectedModels.push({
      name: 'Bottlenecks',
      reason: 'System Knights must detect throughput constraints and failure chokepoints.',
      forgeUse: 'Add diagnosis, queue analysis, and escalation logic.'
    });
  }

  return {
    selectedModels: selectedModels.slice(0, 7),
    cognitiveLattice: selectedModels.map(m => m.name),
    proteusBiasHints: {
      conscientiousness: /legal|finance|security|code|compliance/.test(t) ? 2.45 : 1.85,
      honestyHumility: 2.35,
      openness: /creative|design|brand|music|story/.test(t) ? 2.25 : 1.55,
      emotionalStability: input.riskProfile === 'high' ? 2.35 : 2.1
    },
    skillGraphHints: {
      s1: ['extract mission primitives', 'validate constraints', 'detect anti-patterns'],
      s2: ['apply selected mental models', 'generate structured artifacts', 'audit output against mission'],
      s3: ['synthesize model lattice', 'run inversion and second-order checks', 'map risk and consequence chains'],
      s4: ['coordinate with Merlin, Veritas, Gideon, and Ouroboros', 'preserve reasoning trace in νKG']
    },
    reflectionPrompts: [
      'Which mental model most changed this Knight design?',
      'What failure mode did inversion reveal?',
      'What downstream consequence should this Knight always check?'
    ]
  };
}
