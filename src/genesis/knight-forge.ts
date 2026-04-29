import { KnightForgeInput, KnightManifest, ProteusVector, SkillGraph4 } from './knight-schema';

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function buildProteus(input: KnightForgeInput): ProteusVector {
  const text = `${input.domain} ${input.mission} ${(input.constraints || []).join(' ')}`.toLowerCase();
  return {
    openness: text.includes('creative') || text.includes('design') ? 2.25 : 1.55,
    conscientiousness: text.includes('legal') || text.includes('code') || text.includes('finance') ? 2.45 : 1.85,
    extraversion: text.includes('sales') || text.includes('community') ? 2.1 : 1.3,
    agreeableness: text.includes('support') || text.includes('client') ? 2.0 : 1.45,
    honestyHumility: 2.35,
    emotionalStability: 2.1,
  };
}

function buildSkillGraph(input: KnightForgeInput): SkillGraph4 {
  return {
    s1_atomic: [
      `${input.domain} extraction`,
      `${input.domain} validation`,
      'format integrity checks'
    ],
    s2_workflows: [
      `generate ${input.domain} artifacts`,
      `audit ${input.domain} outputs`,
      `summarize ${input.domain} findings`
    ],
    s3_contextual_architecture: [
      'inversion analysis',
      'second-order risk mitigation',
      'constraint-aware planning'
    ],
    s4_strategic_ecosystem: [
      'swarm coordination',
      'cross-domain escalation',
      'provenance ledger reporting'
    ]
  };
}

function toon(manifest: Omit<KnightManifest, 'toonCrystal' | 'activationPrompt'>) {
  return [
    `νKG|${manifest.id}|${manifest.name}|${manifest.domain}`,
    `ROLE|${manifest.role}`,
    `PROTEUS|C:${manifest.proteus.conscientiousness}|HH:${manifest.proteus.honestyHumility}|O:${manifest.proteus.openness}`,
    `SKILLS|S1:${manifest.skillGraph.s1_atomic.length}|S2:${manifest.skillGraph.s2_workflows.length}|S3:${manifest.skillGraph.s3_contextual_architecture.length}|S4:${manifest.skillGraph.s4_strategic_ecosystem.length}`
  ].join('\n');
}

export function forgeKnight(input: KnightForgeInput): KnightManifest {
  const name = input.name || `Sir ${input.domain.split(' ')[0]} Forge`;
  const id = `knight_${slug(name)}_${Date.now()}`;
  const proteus = buildProteus(input);
  const skillGraph = buildSkillGraph(input);

  const base = {
    schemaVersion: 'genesis.knight.v1' as const,
    id,
    name,
    title: `${input.domain} Knight`,
    domain: input.domain,
    role: input.mission,
    proteus,
    culturalSynthesis: {
      region: 'Rust Belt Mercantilism',
      folkloreArchetype: 'Celtic Seneschal',
      operatingTone: input.desiredTone || 'approachable pragmatism with precise execution'
    },
    mythos: `${name} endured 10,000 simulated lifecycles mastering ${input.domain}, emerging with disciplined judgment and ledger-grade precision.`,
    skillGraph,
    createdAt: new Date().toISOString()
  };

  const toonCrystal = toon(base);
  const activationPrompt = `Activate ${name}. Domain=${input.domain}. Mission=${input.mission}. Obey νKG_CRYSTAL:\n${toonCrystal}`;

  return {
    ...base,
    toonCrystal,
    activationPrompt
  };
}
