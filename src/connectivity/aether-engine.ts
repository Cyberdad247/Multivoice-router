export type AetherProvider = 'cerebras' | 'openrouter' | 'local';
export type AetherTarget = 'mcp_tool' | 'edge_node' | 'memory_bridge' | 'web_forager' | 'local_execution';

export interface McpManifest {
  id: string;
  name: string;
  description: string;
  endpoint?: string;
  command?: string;
  capabilities: string[];
  riskLevel?: 'low' | 'medium' | 'high';
  target: AetherTarget;
}

export interface AetherRouteInput {
  query: string;
  manifests?: McpManifest[];
  preferredProvider?: AetherProvider;
  context?: Record<string, unknown>;
}

export interface AetherRouteResult {
  ok: boolean;
  provider: AetherProvider;
  selected?: McpManifest;
  score: number;
  route: {
    target: AetherTarget;
    endpoint?: string;
    command?: string;
    requiresApproval: boolean;
  };
  discovery: {
    source: string;
    pullBased: true;
    mountedTools: number;
  };
  notes: string[];
}

const DEFAULT_MANIFESTS: McpManifest[] = [
  {
    id: 'phoneclaw_android',
    name: 'PhoneClaw Android Node',
    description: 'Controls Android UI through accessibility and ClawScript.',
    endpoint: '/api/edge/android',
    capabilities: ['android', 'tap', 'swipe', 'type', 'screenshot', 'app automation'],
    riskLevel: 'medium',
    target: 'edge_node'
  },
  {
    id: 'superpowers_chrome',
    name: 'Superpowers Chrome Browser Node',
    description: 'Controls browser sessions through CDP/MCP style browser commands.',
    endpoint: '/api/edge/browser',
    capabilities: ['browser', 'web', 'scrape', 'click', 'dom', 'screenshot'],
    riskLevel: 'medium',
    target: 'edge_node'
  },
  {
    id: 'termux_cli',
    name: 'Termux CLI Node',
    description: 'Runs governed CLI tasks on Android/edge shell runtime.',
    endpoint: '/api/edge/cli',
    capabilities: ['terminal', 'git', 'code', 'shell', 'npm', 'python'],
    riskLevel: 'high',
    target: 'local_execution'
  },
  {
    id: 'rustdesk_desktop',
    name: 'RustDesk Desktop Node',
    description: 'Desktop control and rescue bridge with screenshot/result reporting.',
    endpoint: '/api/edge/rescue',
    capabilities: ['desktop', 'remote', 'screen', 'open app', 'keyboard', 'mouse'],
    riskLevel: 'high',
    target: 'edge_node'
  },
  {
    id: 'notebooklm_bridge',
    name: 'NotebookLM Bridge',
    description: 'Queries research notebooks and long-context memory packs.',
    endpoint: '/api/google/drive/files',
    capabilities: ['memory', 'notebook', 'research', 'summary', 'context'],
    riskLevel: 'low',
    target: 'memory_bridge'
  }
];

function tokenize(value: string) {
  return new Set(value.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
}

function scoreManifest(query: string, manifest: McpManifest) {
  const q = tokenize(query);
  const haystack = tokenize(`${manifest.name} ${manifest.description} ${manifest.capabilities.join(' ')}`);
  let hits = 0;
  q.forEach(token => { if (haystack.has(token)) hits += 1; });
  return hits / Math.max(1, q.size);
}

function selectProvider(query: string, preferred?: AetherProvider): AetherProvider {
  if (preferred) return preferred;
  if (/fast|route|now|tap|open|click|execute/i.test(query)) return 'cerebras';
  if (/fallback|broad|creative|complex/i.test(query)) return 'openrouter';
  return 'local';
}

export function discoverMcpManifests(localManifests: McpManifest[] = []): McpManifest[] {
  // Production adapter will poll /.hive/tools/ and merge manifests here.
  const merged = [...DEFAULT_MANIFESTS, ...localManifests];
  const unique = new Map<string, McpManifest>();
  merged.forEach(tool => unique.set(tool.id, tool));
  return Array.from(unique.values());
}

export function runAether(input: AetherRouteInput): AetherRouteResult {
  const manifests = discoverMcpManifests(input.manifests || []);
  const provider = selectProvider(input.query, input.preferredProvider);
  const ranked = manifests
    .map(manifest => ({ manifest, score: scoreManifest(input.query, manifest) }))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  const selected = best?.score > 0 ? best.manifest : undefined;
  const risk = selected?.riskLevel || 'low';

  return {
    ok: Boolean(selected),
    provider,
    selected,
    score: best?.score || 0,
    route: {
      target: selected?.target || 'mcp_tool',
      endpoint: selected?.endpoint,
      command: selected?.command,
      requiresApproval: risk === 'high'
    },
    discovery: {
      source: '/.hive/tools/',
      pullBased: true,
      mountedTools: manifests.length
    },
    notes: selected
      ? [`AETHER mounted ${manifests.length} tools and selected ${selected.id}.`, `Provider hint: ${provider}.`]
      : [`AETHER mounted ${manifests.length} tools but found no confident match.`]
  };
}
