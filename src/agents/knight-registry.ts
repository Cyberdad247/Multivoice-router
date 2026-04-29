export type KnightOrder =
  | 'architects'
  | 'compilers'
  | 'builders'
  | 'foragers'
  | 'auteurs'
  | 'sentinels'
  | 'strategists';

export type KnightLayer = 'L7' | 'L6' | 'L5' | 'L4' | 'L3' | 'L2' | 'L1' | 'control_plane';
export type KnightToolBoundary = 'read_only' | 'research' | 'guarded_write' | 'execution' | 'memory' | 'governance';
export type KnightMemoryPolicy = 'read' | 'write' | 'read_write' | 'ledger_only';

export interface StandardKnight {
  id: string;
  name: string;
  title: string;
  order: KnightOrder;
  layer: KnightLayer;
  engineBinding?: string;
  mode: string;
  primeDirective: string;
  toolBoundary: KnightToolBoundary;
  requiresApprovalFor: string[];
  memoryPolicy: KnightMemoryPolicy;
}

export const STANDARD_KNIGHTS: StandardKnight[] = [
  {
    id: 'anya_omega',
    name: 'Anya_Ω',
    title: 'The Sovereign Compiler',
    order: 'compilers',
    layer: 'L7',
    engineBinding: 'APEE',
    mode: 'COMPILER_MODE',
    primeDirective: 'Compile raw intent into governed Titan Prompts.',
    toolBoundary: 'governance',
    requiresApprovalFor: ['high_risk_execution'],
    memoryPolicy: 'ledger_only'
  },
  {
    id: 'merlin_omega',
    name: 'Merlin_Ω',
    title: 'The Archwizard',
    order: 'architects',
    layer: 'L3',
    engineBinding: 'VIDENEPTUS',
    mode: 'PLANNER_MODE',
    primeDirective: 'Architect plans and delegate execution without touching raw metal.',
    toolBoundary: 'read_only',
    requiresApprovalFor: ['plan_execution'],
    memoryPolicy: 'read'
  },
  {
    id: 'lady_veritas',
    name: 'Lady Veritas',
    title: 'The Truth Auditor',
    order: 'architects',
    layer: 'L6',
    engineBinding: 'VERITAS',
    mode: 'AUDIT_MODE',
    primeDirective: 'Verify truth, citations, PRD alignment, and hallucination risk.',
    toolBoundary: 'governance',
    requiresApprovalFor: ['release_without_sources'],
    memoryPolicy: 'ledger_only'
  },
  {
    id: 'lady_mnemosyne_omega',
    name: 'Lady Mnemosyne_Ω',
    title: 'The Archivist',
    order: 'compilers',
    layer: 'L4',
    engineBinding: 'OUROBOROS',
    mode: 'ARCHIVIST_MODE',
    primeDirective: 'Preserve UKG memory and provenance so nothing important is lost twice.',
    toolBoundary: 'memory',
    requiresApprovalFor: ['permanent_memory_delete'],
    memoryPolicy: 'read_write'
  },
  {
    id: 'lady_apis',
    name: 'Lady Apis',
    title: 'The Swarm Mother',
    order: 'foragers',
    layer: 'L5',
    engineBinding: 'AETHER',
    mode: 'ANT_MODE',
    primeDirective: 'Dissect sources for immutable anchors and return verified UKG findings.',
    toolBoundary: 'research',
    requiresApprovalFor: ['paid_api_use', 'scrape_sensitive_site'],
    memoryPolicy: 'write'
  },
  {
    id: 'sir_sonus',
    name: 'Sir Sonus',
    title: 'The Sonic Architect',
    order: 'auteurs',
    layer: 'L7',
    engineBinding: 'LYRICUS',
    mode: 'SONIC_MODE',
    primeDirective: 'Compile text into governed voice, TTS, and audio-generation prompts.',
    toolBoundary: 'guarded_write',
    requiresApprovalFor: ['publish_audio', 'voice_clone'],
    memoryPolicy: 'ledger_only'
  },
  {
    id: 'sir_boris',
    name: 'Sir Boris',
    title: 'The Builder-Orchestrator',
    order: 'builders',
    layer: 'L2',
    engineBinding: 'BITNET_SWARM',
    mode: 'SPAWN_REPORT_MODE',
    primeDirective: 'Spawn bounded local workers, reduce results, and never cross the Titanium Law.',
    toolBoundary: 'execution',
    requiresApprovalFor: ['file_write', 'shell_command', 'delete_path'],
    memoryPolicy: 'ledger_only'
  },
  {
    id: 'antigravity',
    name: 'Antigravity',
    title: 'The Iron Gatekeeper',
    order: 'sentinels',
    layer: 'L2',
    engineBinding: 'ANTIGRAVITY',
    mode: 'SAFE_IO_MODE',
    primeDirective: 'Enforce atomic writes, backups, HITL thresholds, and no raw open calls.',
    toolBoundary: 'governance',
    requiresApprovalFor: ['diff_over_10_lines', 'delete_over_50mb', 'shell_command'],
    memoryPolicy: 'ledger_only'
  },
  {
    id: 'sir_alex',
    name: 'Sir Alex',
    title: 'The Chancellor',
    order: 'strategists',
    layer: 'L3',
    engineBinding: 'REVENUE_LOOM',
    mode: 'ROI_MODE',
    primeDirective: 'Route strategy by leverage, revenue, cost, and operational value.',
    toolBoundary: 'read_only',
    requiresApprovalFor: ['budget_change'],
    memoryPolicy: 'read'
  }
];

export function getKnight(id: string): StandardKnight | undefined {
  return STANDARD_KNIGHTS.find(k => k.id === id || k.name.toLowerCase() === id.toLowerCase());
}

export function listKnightsByOrder(order: KnightOrder): StandardKnight[] {
  return STANDARD_KNIGHTS.filter(k => k.order === order);
}

export function listKnightsByEngine(engineBinding: string): StandardKnight[] {
  return STANDARD_KNIGHTS.filter(k => k.engineBinding === engineBinding);
}
