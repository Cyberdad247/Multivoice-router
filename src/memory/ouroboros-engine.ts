export interface OuroborosInput {
  sessionId?: string;
  commandId?: string;
  rawState: unknown;
  anchors?: string[];
  source?: 'voice' | 'text' | 'edge' | 'autonomous' | 'system';
}

export interface UkgJsonLd {
  '@context': string;
  '@type': 'CamelotMemoryEvent';
  id: string;
  sessionId?: string;
  commandId?: string;
  l0: string;
  l1: string;
  l2Ref: string;
  anchors: string[];
  graph: {
    entities: string[];
    relations: Array<{ from: string; type: string; to: string }>;
  };
  runicLattice: {
    recall: '[📖🐘]';
    fuse: '[🌀🐍]';
    transmit: '[🌐]';
  };
  provenanceHash: string;
  timestamp: string;
}

export interface OuroborosOutput {
  ukg: UkgJsonLd;
  sentinelCompression: {
    originalTokens: number;
    l0Tokens: number;
    l1Tokens: number;
    compressionRatio: number;
  };
  writeTargets: string[];
  hydrationRefs: string[];
}

function textOf(input: unknown): string {
  if (typeof input === 'string') return input;
  try { return JSON.stringify(input); } catch { return String(input); }
}

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

function stableHash(value: unknown): string {
  const text = textOf(value);
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

function extractAnchors(raw: string, supplied: string[] = []) {
  const extracted = raw.match(/[A-Z][A-Z0-9_\-]{2,}|\/\/[A-Z]+|viking:\/\/[^\s]+|[A-Z][a-z]+_[ΩA-Z]+/g) || [];
  return Array.from(new Set([...supplied, ...extracted])).slice(0, 24);
}

function sentinelCompress(raw: string, anchors: string[]) {
  const clean = raw
    .replace(/\s+/g, ' ')
    .replace(/\b(yeah|ok|okay|nice|cool|please|thanks)\b/gi, '')
    .trim();

  const anchorLine = anchors.length ? `Anchors: ${anchors.join(', ')}. ` : '';
  const l0 = `${anchorLine}${clean.slice(0, 220)}`.trim();
  const l1 = `${anchorLine}${clean.slice(0, 2200)}`.trim();

  return { l0, l1 };
}

function buildGraph(raw: string, anchors: string[]) {
  const entities = anchors.length ? anchors : Array.from(new Set(raw.match(/[A-Z][a-zA-Z0-9_Ω-]{3,}/g) || [])).slice(0, 16);
  const relations = entities.slice(0, 8).map((entity, index) => ({
    from: entity,
    type: index === 0 ? 'anchors' : 'relates_to',
    to: entities[0] || 'CamelotOS'
  }));
  return { entities, relations };
}

export function runOuroboros(input: OuroborosInput): OuroborosOutput {
  const raw = textOf(input.rawState);
  const anchors = extractAnchors(raw, input.anchors || []);
  const { l0, l1 } = sentinelCompress(raw, anchors);
  const id = `ukg:${stableHash({ raw, anchors, sessionId: input.sessionId })}`;
  const l2Ref = `viking://camelot/context/l2/${id.replace(':', '/')}`;

  const ukg: UkgJsonLd = {
    '@context': 'https://camelot-os.local/ukg/v2',
    '@type': 'CamelotMemoryEvent',
    id,
    sessionId: input.sessionId,
    commandId: input.commandId,
    l0,
    l1,
    l2Ref,
    anchors,
    graph: buildGraph(raw, anchors),
    runicLattice: {
      recall: '[📖🐘]',
      fuse: '[🌀🐍]',
      transmit: '[🌐]'
    },
    provenanceHash: stableHash({ raw, source: input.source, commandId: input.commandId }),
    timestamp: new Date().toISOString(),
  };

  const originalTokens = estimateTokens(raw);
  const l1Tokens = estimateTokens(l1);

  return {
    ukg,
    sentinelCompression: {
      originalTokens,
      l0Tokens: estimateTokens(l0),
      l1Tokens,
      compressionRatio: Number((l1Tokens / originalTokens).toFixed(3))
    },
    writeTargets: [
      'open-notebook/appwrite',
      'notebooklm-bridge',
      'viking://camelot/context/l0',
      'viking://camelot/context/l1',
      l2Ref,
      'qdrant-index',
      'neo4j-graphrag',
      'provenance-ledger'
    ],
    hydrationRefs: [
      `viking://camelot/context/l0/${id}`,
      `viking://camelot/context/l1/${id}`,
      l2Ref
    ]
  };
}
