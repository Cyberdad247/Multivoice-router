export type CoreEngineId =
  | 'APEE'
  | 'VIDENEPTUS'
  | 'OUROBOROS'
  | 'ANTIGRAVITY'
  | 'AETHER'
  | 'GENESIS'
  | 'VERITAS'
  | 'AURORA'
  | 'LYRICUS';

export interface CoreEngineRegistryEntry {
  id: CoreEngineId;
  name: string;
  domain: string;
  layer: string;
  primaryPersona: string;
  role: string;
  summary: string;
  runtimeRefs: string[];
  uiSurface: string;
  safetyBoundary: string;
}

export const CAMELOT_CORE_ENGINES: CoreEngineRegistryEntry[] = [
  {
    id: 'APEE',
    name: 'Anya Prompt Enhancement Engine',
    domain: 'Input & Compilation',
    layer: 'L7 Ethereal',
    primaryPersona: 'Anya_Ω',
    role: 'Input Compiler',
    summary: 'Renormalizes raw user intent through Triple-QFT and compiles it into Titan Prompts.',
    runtimeRefs: ['src/anya/anya-compiler.ts', 'src/runtime/camelot-runtime.ts'],
    uiSurface: 'Command bar / Voice Orb',
    safetyBoundary: 'No execution before intent is normalized and ambiguity is resolved.'
  },
  {
    id: 'VIDENEPTUS',
    name: 'Videneptus Logic Router',
    domain: 'Logic & Reasoning',
    layer: 'L3 Neural',
    primaryPersona: 'Merlin_Ω',
    role: 'Reasoning Engine',
    summary: 'Plans with ToT/GoT/DAG reasoning and Learning-at-Criticality routing.',
    runtimeRefs: ['src/merlin/videneptus-engine.ts'],
    uiSurface: 'DAG viewer / Plan panel',
    safetyBoundary: 'May plan actions, but execution must pass through Aether and Antigravity.'
  },
  {
    id: 'OUROBOROS',
    name: 'Ouroboros Infinite Memory',
    domain: 'Memory & Truth',
    layer: 'L4 Semantic',
    primaryPersona: 'Mnemosyne_Ω',
    role: 'Memory Engine',
    summary: 'Compresses session state into UKG memory, refs, and Cloud Brain exports.',
    runtimeRefs: ['src/memory/ouroboros-engine.ts', 'src/memory/ukg-hydration-engine.ts', 'src/memory/notebooklm-cloud-brain.ts'],
    uiSurface: 'Archives / Cloud Brain panel',
    safetyBoundary: 'Must preserve tenant boundaries and local UKG receipts.'
  },
  {
    id: 'ANTIGRAVITY',
    name: 'Antigravity Safety I/O Engine',
    domain: 'Execution Safety',
    layer: 'L2 Kinetic + L6 Governance',
    primaryPersona: 'Lukas / Sir Justicar / Sir Sentinel',
    role: 'Safety/I/O Middleware',
    summary: 'Gates file writes, deletes, shell commands, and risky edge actions.',
    runtimeRefs: ['src/execution/antigravity-engine.ts', 'src/api/approval-contracts.ts'],
    uiSurface: 'Approval queue / Patch preview',
    safetyBoundary: 'No raw destructive action without approval envelope.'
  },
  {
    id: 'AETHER',
    name: 'Aether Connectivity Engine',
    domain: 'Tools, MCP, Network Routing',
    layer: 'L2 Kinetic + L5 Agentic',
    primaryPersona: 'Sir Link',
    role: 'Connectivity Gateway',
    summary: 'Routes tasks to MCP tools, edge workers, browser tools, NotebookLM, and Tailscale nodes.',
    runtimeRefs: ['src/connectivity/aether-engine.ts', 'src/router/intent-router.ts', 'src/edge/edge-action-schema.ts'],
    uiSurface: 'Omni panel / Node routing',
    safetyBoundary: 'Tool invocation must obey Sir Link routing and policy checks.'
  },
  {
    id: 'GENESIS',
    name: 'Genesis Persona Forge',
    domain: 'Persona / Knight Creation',
    layer: 'L5 Agentic + L3 Neural',
    primaryPersona: 'Merlin_Ω / Anya_Ω',
    role: 'Persona Forge',
    summary: 'Creates and evolves Knights using identity contracts, mental models, voices, and dashboard bindings.',
    runtimeRefs: ['src/agents/knight-roster-v400.ts', 'src/agents/persona-overrides.ts'],
    uiSurface: 'Faction panel / Knight editor',
    safetyBoundary: 'New identities require recognition and may not override governance laws.'
  },
  {
    id: 'VERITAS',
    name: 'Veritas Truth Verification',
    domain: 'Audit & Verification',
    layer: 'L6 Governance',
    primaryPersona: 'Lady Veritas',
    role: 'Truth Verification Engine',
    summary: 'Audits factuality, logic, PRD alignment, source confidence, and hallucination risk.',
    runtimeRefs: ['src/verification/veritas-engine.ts'],
    uiSurface: 'Governance panel / Audit report',
    safetyBoundary: 'May block client-facing or high-risk outputs.'
  },
  {
    id: 'AURORA',
    name: 'Aurora Multimodal Vision Engine',
    domain: 'Vision / Multimodal Perception',
    layer: 'L7 Ethereal + L3 Neural',
    primaryPersona: 'Anya_Ω / Sir Visage',
    role: 'Visual Processor',
    summary: 'Processes screenshots, images, and video states for edge control and visual memory.',
    runtimeRefs: ['src/edge/edge-action-schema.ts', 'src/ui/anya-interphase-manifest.ts'],
    uiSurface: 'OmniEye / Visual bridge',
    safetyBoundary: 'Visual interpretation must not be treated as verified fact without Veritas review.'
  },
  {
    id: 'LYRICUS',
    name: 'Lyricus Audio Voice Engine',
    domain: 'Audio, Voice, Podcasting',
    layer: 'L7 Ethereal + L5 Agentic',
    primaryPersona: 'Sir Sonus',
    role: 'Sonic Generator',
    summary: 'Routes Knight voices, council mode, podcast mode, voice automation, and bill-safe TTS.',
    runtimeRefs: ['src/voice/voice-profile-registry.ts', 'src/voice/multivoice-session.ts', 'src/voice/omnivoice-router.ts', 'src/automation/voice-automation.ts'],
    uiSurface: 'Telephony / Podcast / Voice panel',
    safetyBoundary: 'Paid, external, cloned, or publishing audio requires approval.'
  }
];

export function getCoreEngine(id: CoreEngineId) {
  return CAMELOT_CORE_ENGINES.find(engine => engine.id === id);
}

export function listCoreEnginesByLayer(layerFragment: string) {
  const key = layerFragment.toLowerCase();
  return CAMELOT_CORE_ENGINES.filter(engine => engine.layer.toLowerCase().includes(key));
}

export function listCoreEnginesForUiSurface(surfaceFragment: string) {
  const key = surfaceFragment.toLowerCase();
  return CAMELOT_CORE_ENGINES.filter(engine => engine.uiSurface.toLowerCase().includes(key));
}
