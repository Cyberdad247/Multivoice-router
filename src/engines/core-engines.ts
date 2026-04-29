import { CamelotEngine, EngineRequest, EngineResult } from './types';
import { routeIntent } from '../router/intent-router';
import { evaluatePolicy } from '../policy/policy-engine';
import { forgeKnight } from '../genesis/knight-forge';
import { evolveKnight } from '../genesis/evolve-knight';

function textOf(input: unknown): string {
  if (typeof input === 'string') return input;
  try { return JSON.stringify(input); } catch { return String(input); }
}

function tokenEstimate(text: string): number { return Math.ceil(text.length / 4); }
function stableHash(value: unknown): string {
  const text = textOf(value);
  let hash = 0;
  for (let i = 0; i < text.length; i++) { hash = ((hash << 5) - hash) + text.charCodeAt(i); hash |= 0; }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

export const APEEEngine: CamelotEngine = {
  id: 'APEE', name: 'APEE (Anya Prompt Enhancement Engine)', domain: 'input_compilation', description: 'Triple-QFT input normalization and Titan prompt compilation.',
  async run(request: EngineRequest): Promise<EngineResult> {
    const raw = textOf(request.input).trim();
    const normalized = raw.replace(/\s+/g, ' ').replace(/[“”]/g, '"').replace(/[’]/g, "'");
    const route = routeIntent(normalized);
    return { engineId: 'APEE', ok: true, output: { raw, normalized, titanPrompt: { intent: route.intent, targetNode: route.targetNode, payload: route.payload, confidence: normalized.length > 8 ? 0.82 : 0.55 } }, metadata: { estimatedTokens: tokenEstimate(normalized) } };
  },
};

export const GENESISEngine: CamelotEngine = {
  id: 'GENESIS', name: 'GENESIS (Persona Forge)', domain: 'persona', description: 'Persona shaping, Knight forging, and Omega evolution.',
  async run(request: EngineRequest): Promise<EngineResult> {
    const payload: any = request.input || {};
    const text = textOf(payload).toLowerCase();

    if (payload.mode === 'forge_knight' || text.includes('forge knight') || text.includes('new knight')) {
      const knight = forgeKnight({
        name: payload.name,
        domain: payload.domain || payload.titanPrompt?.payload?.domain || 'general operations',
        mission: payload.mission || payload.titanPrompt?.payload?.text || payload.titanPrompt?.payload?.action || textOf(payload),
        constraints: payload.constraints || [],
        desiredTone: payload.desiredTone,
      });
      return { engineId: 'GENESIS', ok: true, output: { ...payload, genesisMode: 'forge_knight', knight } };
    }

    if (payload.mode === 'evolve_knight' || text.includes('//evolve')) {
      if (!payload.existingKnight) return { engineId: 'GENESIS', ok: false, errors: ['existingKnight is required for //EVOLVE.'] };
      const evolved = evolveKnight({ existing: payload.existingKnight, newMaterial: payload.newMaterial || textOf(payload), newConstraints: payload.newConstraints || [] });
      return { engineId: 'GENESIS', ok: true, output: { ...payload, genesisMode: 'evolve_knight', knight: evolved } };
    }

    const source = request.context?.source || 'text';
    const personaMode = source === 'voice' ? 'jarvis_operator' : 'systems_architect';
    return { engineId: 'GENESIS', ok: true, output: { ...payload, persona: { mode: personaMode, tone: 'concise, governed, operator-grade', behaviorVector: ['clarify-risk', 'preserve-context', 'execute-with-ledger'] } } };
  },
};

export const VIDENEPTUSEngine: CamelotEngine = {
  id: 'VIDENEPTUS', name: 'VIDENEPTUS (Logic Router)', domain: 'logic_reasoning', description: 'Reasoning planner with lightweight ToT/GoT style branch selection.',
  async run(request: EngineRequest): Promise<EngineResult> {
    const payload: any = request.input || {}; const compiled = payload.titanPrompt || payload;
    const branches = [{ name: 'direct', score: 0.72, plan: 'Route immediately if low-risk and clear.' }, { name: 'governed', score: compiled.intent === 'conversation' ? 0.5 : 0.88, plan: 'Apply policy gates, then route to edge node.' }, { name: 'memory_first', score: /remember|previous|history|context/i.test(textOf(compiled.payload)) ? 0.9 : 0.4, plan: 'Hydrate memory before action.' }].sort((a, b) => b.score - a.score);
    return { engineId: 'VIDENEPTUS', ok: true, output: { ...payload, reasoning: { selectedBranch: branches[0], branches, lacTemperatureSweep: [0.2, 0.7, 1.2, 0.4] } } };
  },
};

export const VERITASEngine: CamelotEngine = {
  id: 'VERITAS', name: 'VERITAS (Truth Verification)', domain: 'verification', description: 'Fact, logic, and safety verification before routing.',
  async run(request: EngineRequest): Promise<EngineResult> {
    const payload: any = request.input || {}; const route = payload.titanPrompt ? routeIntent(payload.titanPrompt.payload?.action || payload.titanPrompt.payload?.text || textOf(payload.titanPrompt)) : routeIntent(textOf(payload)); const decision = evaluatePolicy(route);
    return { engineId: 'VERITAS', ok: decision.allowed, output: { ...payload, verification: { allowed: decision.allowed, reason: decision.reason, route: decision.route, citationsRequired: /latest|current|research|verify|source|cite/i.test(textOf(payload)) } }, warnings: decision.allowed ? [] : [decision.reason] };
  },
};

export const AETHEREngine: CamelotEngine = {
  id: 'AETHER', name: 'AETHER (Connectivity Gateway)', domain: 'connectivity', description: 'Semantic routing to MCP tools, Tailscale nodes, and edge endpoints.',
  async run(request: EngineRequest): Promise<EngineResult> {
    const payload: any = request.input || {}; const route = payload.verification?.route || routeIntent(textOf(payload)); const endpointByNode: Record<string, string> = { phoneclaw: '/api/edge/android', superpowers_chrome: '/api/edge/browser', termux: '/api/edge/cli', rustdesk: '/api/edge/rescue', gemini: '/api/edge/conversation', lukas: '/api/edge/approval' };
    return { engineId: 'AETHER', ok: true, output: { ...payload, route, endpoint: endpointByNode[route.targetNode] || '/api/edge/conversation', network: 'tailscale-neural-mesh' } };
  },
};

export const ANTIGRAVITYEngine: CamelotEngine = {
  id: 'ANTIGRAVITY', name: 'ANTIGRAVITY (Safety/I-O)', domain: 'execution_io', description: 'Atomic execution envelope, approval enforcement, backup metadata.',
  async run(request: EngineRequest): Promise<EngineResult> {
    const payload: any = request.input || {}; const route = payload.route || payload.verification?.route; const requiresApproval = Boolean(route?.requiresApproval || request.context?.policy?.requiresApproval); const approved = Boolean(request.context?.policy?.approved); const executable = !requiresApproval || approved;
    return { engineId: 'ANTIGRAVITY', ok: executable, output: { ...payload, executionEnvelope: { executable, requiresApproval, approved, atomic: true, backupRequired: route?.riskLevel === 'high', commandHash: stableHash({ route, context: request.context }) } }, warnings: executable ? [] : ['Execution paused pending approval.'] };
  },
};

export const OUROBOROSEngine: CamelotEngine = {
  id: 'OUROBOROS', name: 'OUROBOROS (Infinite Memory)', domain: 'memory_truth', description: 'Session compression, UKG generation, provenance ledger event creation.',
  async run(request: EngineRequest): Promise<EngineResult> {
    const raw = textOf(request.input); const l0 = raw.slice(0, 180).replace(/\s+/g, ' '); const l1 = raw.slice(0, 1800);
    const ukg = { '@context': 'https://camelot-os.local/ukg/v2', '@type': 'CamelotMemoryEvent', id: `ukg:${stableHash(request.input)}`, l0, l1, l2Ref: `viking://camelot/context/l2/${stableHash(raw)}`, anchors: Array.from(new Set(raw.match(/[A-Z][A-Z0-9_\-]{2,}|\/\/[A-Z]+|viking:\/\/[^\s]+/g) || [])).slice(0, 16), provenanceHash: stableHash({ input: request.input, context: request.context }), timestamp: new Date().toISOString() };
    return { engineId: 'OUROBOROS', ok: true, output: { ukg, writeTargets: ['open-notebook/appwrite', 'provenance-ledger', 'qdrant-index', 'neo4j-graph'] }, metadata: { l0Tokens: tokenEstimate(l0), l1Tokens: tokenEstimate(l1) } };
  },
};

export const AURORAEngine: CamelotEngine = { id: 'AURORA', name: 'AURORA (Vision)', domain: 'vision', description: 'Visual embedding request normalizer for image/video context.', async run(request: EngineRequest): Promise<EngineResult> { return { engineId: 'AURORA', ok: true, output: { visualEmbeddingJob: { inputRef: request.input, mode: 'describe-detect-index', outputRef: `viking://camelot/vision/${stableHash(request.input)}` } } }; } };
export const LYRICUSEngine: CamelotEngine = { id: 'LYRICUS', name: 'LYRICUS (Audio/Voice)', domain: 'audio_voice', description: 'Voice/audio prompt compiler for TTS, Kokoro, Suno, and phonetic control.', async run(request: EngineRequest): Promise<EngineResult> { const text = textOf(request.input); return { engineId: 'LYRICUS', ok: true, output: { sonicPrompt: { text, voiceProfile: 'jarvis_operator_default', phoneticAnchors: text.split(/\s+/).filter(w => w.length > 6).slice(0, 12), targetEngines: ['kokoro-onnx', 'suno-v5'] } } }; } };

export const CORE_ENGINES = [APEEEngine, GENESISEngine, VIDENEPTUSEngine, VERITASEngine, AETHEREngine, ANTIGRAVITYEngine, OUROBOROSEngine, AURORAEngine, LYRICUSEngine];
