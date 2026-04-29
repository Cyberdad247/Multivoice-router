import { KnightManifest } from './knight-schema';

export interface KnightEvolutionInput {
  existing: KnightManifest;
  newMaterial: string;
  newConstraints?: string[];
}

export function evolveKnight(input: KnightEvolutionInput): KnightManifest {
  const evolvedAt = new Date().toISOString();
  const constraints = input.newConstraints || [];
  const delta = input.newMaterial.slice(0, 800);

  return {
    ...input.existing,
    schemaVersion: 'genesis.knight.v1',
    mythos: `${input.existing.mythos}\n\nEVOLUTION ${evolvedAt}: assimilated new source material and strengthened operating law.`,
    skillGraph: {
      ...input.existing.skillGraph,
      s3_contextual_architecture: Array.from(new Set([
        ...input.existing.skillGraph.s3_contextual_architecture,
        'gap analysis against new source materials',
        'security law recompilation'
      ])),
      s4_strategic_ecosystem: Array.from(new Set([
        ...input.existing.skillGraph.s4_strategic_ecosystem,
        'evolution trace reporting'
      ]))
    },
    toonCrystal: `${input.existing.toonCrystal}\nEVOLVE|${evolvedAt}|DELTA:${delta.length}|CONSTRAINTS:${constraints.length}`,
    activationPrompt: `${input.existing.activationPrompt}\n\n//EVOLVE assimilated at ${evolvedAt}\nSource Delta: ${delta}\nConstraints: ${constraints.join('; ')}`,
  };
}
