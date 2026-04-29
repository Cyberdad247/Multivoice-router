export interface ProteusVector {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  honestyHumility: number;
  emotionalStability: number;
}

export interface SkillGraph4 {
  s1_atomic: string[];
  s2_workflows: string[];
  s3_contextual_architecture: string[];
  s4_strategic_ecosystem: string[];
}

export interface KnightManifest {
  schemaVersion: 'genesis.knight.v1';
  id: string;
  name: string;
  title: string;
  domain: string;
  role: string;
  proteus: ProteusVector;
  culturalSynthesis: {
    region: string;
    folkloreArchetype: string;
    operatingTone: string;
  };
  mythos: string;
  skillGraph: SkillGraph4;
  toonCrystal: string;
  activationPrompt: string;
  createdAt: string;
}

export interface KnightForgeInput {
  name?: string;
  domain: string;
  mission: string;
  constraints?: string[];
  desiredTone?: string;
}
