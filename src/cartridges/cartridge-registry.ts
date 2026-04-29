export type CartridgeMode = 'ANT' | 'BEAVER' | 'SPIDER' | 'OCTOPUS' | 'ALCHEMIST';

export interface BioKineticCartridge {
  id: string;
  name: string;
  mode: CartridgeMode;
  knight: string;
  trigger: string;
  primeDirective: string;
  tools: string[];
  reasoning: 'ReAct' | 'ToT' | 'GoT' | 'HTN';
  outputFormat: 'JSON' | 'Markdown' | 'Symbolect';
  temperature: number;
  laws: string[];
}

export const CARTRIDGES: BioKineticCartridge[] = [
  {
    id: 'ant_vortex',
    name: 'Vortex Datalink',
    mode: 'ANT',
    knight: 'Lady Apis',
    trigger: '//MODE ANT',
    primeDirective: 'Forage the signal. Ignore the noise. Store the Truth.',
    tools: ['Firecrawl', 'Perplexity', 'GraphRAG', 'Arxiv', 'Serper'],
    reasoning: 'ReAct',
    outputFormat: 'JSON',
    temperature: 0.2,
    laws: ['Missing data returns NULL.', 'Every claim requires a source ID.', 'Prefer raw data tables over summaries.']
  },
  {
    id: 'beaver_tectonic',
    name: 'Tectonic Plate',
    mode: 'BEAVER',
    knight: 'Sir Forge',
    trigger: '//MODE BEAVER',
    primeDirective: 'One brick at a time. Structure creates freedom.',
    tools: ['Cribo', 'Antigravity', 'Docker', 'Miri'],
    reasoning: 'HTN',
    outputFormat: 'Markdown',
    temperature: 0.2,
    laws: ['Write plan.md before code.', 'Prefer Rust/Go binaries for file operations.', 'Build inside venv, container, or sandbox.']
  },
  {
    id: 'spider_silk',
    name: 'Silk Weaver',
    mode: 'SPIDER',
    knight: 'Sir Link',
    trigger: '//MODE SPIDER',
    primeDirective: 'Connect the nodes. Secure the payload. Verify the handshake.',
    tools: ['Saltare', 'Curl', 'Postman', 'Zod', 'WebMCP'],
    reasoning: 'GoT',
    outputFormat: 'JSON',
    temperature: 0.3,
    laws: ['Validate all payloads.', 'Webhooks must be idempotent.', 'Use retries with exponential backoff.']
  },
  {
    id: 'octopus_lazarus',
    name: 'Lazarus Pit',
    mode: 'OCTOPUS',
    knight: 'Sir Debug',
    trigger: '//MODE OCTOPUS',
    primeDirective: 'Isolate, reproduce, resolve.',
    tools: ['Rotel', 'Miri', 'Git Bisect', 'Octopus Tests'],
    reasoning: 'ToT',
    outputFormat: 'Markdown',
    temperature: 0.25,
    laws: ['Never delete logs during debugging.', 'Fix root cause, not symptoms.', 'Analyze multiple failure vectors.']
  }
];

export function getCartridge(modeOrId: string): BioKineticCartridge | undefined {
  const key = modeOrId.toLowerCase();
  return CARTRIDGES.find(c => c.id === key || c.mode.toLowerCase() === key || c.trigger.toLowerCase() === key);
}

export function applyCartridgeToContext(context: Record<string, unknown>, cartridge: BioKineticCartridge) {
  return {
    ...context,
    cartridge: cartridge.id,
    mode: cartridge.mode,
    activeKnight: cartridge.knight,
    allowedTools: cartridge.tools,
    reasoning: cartridge.reasoning,
    outputFormat: cartridge.outputFormat,
    temperature: cartridge.temperature,
    titaniumLaws: cartridge.laws
  };
}
