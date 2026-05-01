export type DistillerInputKind =
  | 'chat_log'
  | 'repo_audit'
  | 'paper'
  | 'plan'
  | 'prompt'
  | 'doc'
  | 'transcript'
  | 'screenshot_notes'
  | 'workflow';

export type DistillerOutputKind =
  | 'νKG_Crystal'
  | 'SkillGraph'
  | 'KnightSpec'
  | 'CartridgeSpec'
  | 'MemoryNote'
  | 'ActionPlan';

export interface DistillerPrimeInput {
  kind: DistillerInputKind;
  title: string;
  raw: string;
  provenance?: string[];
  targetOutput?: DistillerOutputKind;
}

export interface DistillerAnchorSet {
  entities: string[];
  constraints: string[];
  laws: string[];
  workflows: string[];
  risks: string[];
}

export interface DistillerPrimeResult {
  id: string;
  title: string;
  inputKind: DistillerInputKind;
  outputKind: DistillerOutputKind;
  anchors: DistillerAnchorSet;
  toon: string;
  memoryNote: string;
  warnings: string[];
}

function uniq(items: string[]) {
  return [...new Set(items.map(item => item.trim()).filter(Boolean))];
}

function roughExtract(raw: string, patterns: RegExp[]) {
  const hits: string[] = [];
  for (const pattern of patterns) {
    const matches = raw.match(pattern);
    if (matches) hits.push(...matches.slice(0, 30));
  }
  return uniq(hits).slice(0, 30);
}

export function extractDistillerAnchors(raw: string): DistillerAnchorSet {
  return {
    entities: roughExtract(raw, [/\b[A-Z][A-Za-z0-9_Ω-]{2,}\b/g, /\b[A-Z]+_[A-Z0-9_]+\b/g]),
    constraints: roughExtract(raw, [/\b(?:must|never|required|forbidden|approval|HITL|RLS|tenant|budget|risk)[^.!?]{0,120}/gi]),
    laws: roughExtract(raw, [/\b(?:LAW|BOUNDARY|RULE|PRINCIPLE|Golden Rule)[^\n]*/gi]),
    workflows: roughExtract(raw, [/\b(?:FLOW|WORKFLOW|PHASE|STAGE|MODE|Trigger)[^\n]*/gi]),
    risks: roughExtract(raw, [/\b(?:risk|unsafe|hallucination|delete|publish|paid|credential|secret|cross-tenant)[^.!?]{0,120}/gi]),
  };
}

export function buildToonCrystal(input: DistillerPrimeInput, anchors = extractDistillerAnchors(input.raw)): string {
  const outputKind = input.targetOutput || 'νKG_Crystal';
  const lines = [
    `[νKG_CRYSTAL: Ω_DISTILLED_${input.kind.toUpperCase()}]`,
    `META|TITLE|${input.title}`,
    `META|INPUT_KIND|${input.kind}`,
    `META|OUTPUT_KIND|${outputKind}`,
    `META|PROVENANCE|${(input.provenance || []).join(';') || 'unspecified'}`,
    `ANCHORS|ENTITIES|${anchors.entities.join(';') || 'none'}`,
    `ANCHORS|CONSTRAINTS|${anchors.constraints.join(';') || 'none'}`,
    `ANCHORS|LAWS|${anchors.laws.join(';') || 'none'}`,
    `ANCHORS|WORKFLOWS|${anchors.workflows.join(';') || 'none'}`,
    `ANCHORS|RISKS|${anchors.risks.join(';') || 'none'}`,
    `DISTILLER|LAW|No raw bloat becomes permanent memory`,
    `DISTILLER|LAW|Preserve anchor tokens`,
    `DISTILLER|LAW|Verify before public output`,
  ];
  return lines.join('\n');
}

export function distillWithPrime(input: DistillerPrimeInput): DistillerPrimeResult {
  const anchors = extractDistillerAnchors(input.raw);
  const outputKind = input.targetOutput || 'νKG_Crystal';
  const toon = buildToonCrystal(input, anchors);
  const warnings: string[] = [];

  if (!input.provenance || input.provenance.length === 0) warnings.push('No provenance supplied. Marking crystal as locally useful but not externally source-backed.');
  if (input.raw.length > 50000) warnings.push('Large source detected. Consider chunked distillation and Veritas merge audit.');
  if (anchors.entities.length === 0) warnings.push('Few entities detected. Input may be too vague for durable hydration.');

  return {
    id: `distill_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    title: input.title,
    inputKind: input.kind,
    outputKind,
    anchors,
    toon,
    warnings,
    memoryNote: [
      `# ${input.title}`,
      '',
      '## Distiller Prime Result',
      '',
      '```toon',
      toon,
      '```',
      '',
      '## Warnings',
      ...warnings.map(w => `- ${w}`),
    ].join('\n')
  };
}
