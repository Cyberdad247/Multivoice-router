import { runAnyaCompiler } from '../anya/anya-compiler';
import { runVideneptus } from '../merlin/videneptus-engine';
import { routeIntent } from '../router/intent-router';
import { runVeritas } from '../verification/veritas-engine';
import { runAether } from '../connectivity/aether-engine';
import { runAntigravity } from '../execution/antigravity-engine';
import { runOuroboros } from '../memory/ouroboros-engine';
import { signDag, SignableDag } from '../provenance/dag-signer';
import { createProvenanceAttestation } from '../provenance/attestation';
import { buildLedgerEvent } from '../provenance/provenance-ledger';
import { getCartridge, applyCartridgeToContext } from '../cartridges/cartridge-registry';
import { buildPromptDependencyGraph, enforceAgentArmor } from '../security/agentarmor-pdg';

export interface CamelotRuntimeInput {
  input: string;
  context?: Record<string, any>;
  signingSecret: string;
  approved?: boolean;
}

export interface CamelotRuntimeResult {
  ok: boolean;
  stage: string;
  titan?: any;
  reasoning?: any;
  veritas?: any;
  aether?: any;
  antigravity?: any;
  memory?: any;
  ledgerEvent?: any;
  errors?: string[];
  warnings?: string[];
}

function detectCartridge(input: string) {
  const match = input.match(/\/\/MODE\s+([A-Z_]+)/i);
  return match ? getCartridge(match[1]) : undefined;
}

function buildDagFromRuntime(titan: any, reasoning: any): SignableDag {
  return {
    dagId: `dag_${Date.now()}`,
    root: 'compile',
    nodes: {
      compile: {
        id: 'compile',
        kind: 'APEE',
        intent: titan.intent || 'unknown',
        payload: { titan }
      },
      reason: {
        id: 'reason',
        kind: 'VIDENEPTUS',
        intent: reasoning?.mode || 'balanced',
        deps: ['compile'],
        payload: { reasoning }
      },
      verify: {
        id: 'verify',
        kind: 'VERITAS',
        intent: 'truth_audit',
        deps: ['reason']
      },
      route: {
        id: 'route',
        kind: 'AETHER',
        intent: 'tool_route',
        deps: ['verify']
      }
    },
    metadata: {
      runtime: 'camelot-runtime',
      version: 'v400.5.3'
    }
  };
}

function classifySink(route: any): string {
  const text = JSON.stringify(route || {}).toLowerCase();
  if (text.includes('delete')) return 'file_delete';
  if (text.includes('shell') || text.includes('terminal') || text.includes('cli')) return 'shell_command';
  if (text.includes('write') || text.includes('patch')) return 'file_write';
  if (text.includes('publish') || text.includes('post')) return 'publish';
  return 'tool_route';
}

export async function runCamelotRuntime(input: CamelotRuntimeInput): Promise<CamelotRuntimeResult> {
  const warnings: string[] = [];
  let context = input.context || {};

  const cartridge = detectCartridge(input.input);
  if (cartridge) {
    context = applyCartridgeToContext(context, cartridge);
    warnings.push(`Cartridge mounted: ${cartridge.id}`);
  }

  let compiled: any;
  try {
    compiled = await runAnyaCompiler(input.input, context);
  } catch (error: any) {
    return { ok: false, stage: 'APEE', errors: [error.message || String(error)] };
  }

  if ('interrupt' in compiled) {
    return { ok: false, stage: 'APEE_INTERRUPT', titan: compiled, warnings: ['Clarification required before execution.'] };
  }

  const sink = classifySink(compiled.routing || compiled.entities || compiled);
  const sourceIntegrity = context.source === 'web' || context.lowIntegrity ? 'LOW_INTEGRITY' : 'HIGH_INTEGRITY';
  const pdg = buildPromptDependencyGraph({
    sourceLabel: context.source || 'user_input',
    sourceIntegrity,
    transforms: ['APEE', 'VIDENEPTUS'],
    sink
  });
  const armor = enforceAgentArmor(pdg);
  if (!armor.allowed) {
    return { ok: false, stage: 'AGENTARMOR', titan: compiled, errors: armor.violations };
  }

  const reasoning = runVideneptus({
    intent: compiled.intent,
    payload: compiled.entities || compiled,
    targetNode: compiled.routing?.targetNode,
    riskLevel: compiled.constraints?.riskLevel,
    requiresApproval: compiled.constraints?.requiresApproval
  });

  const dag = buildDagFromRuntime(compiled, reasoning);
  const signature = signDag(dag, input.signingSecret, context.signedBy || 'sir_aurelius');
  const attestation = createProvenanceAttestation({ envelope: signature, command: context.command || 'runtime', metadata: { cartridge: cartridge?.id } });

  const veritas = runVeritas({
    content: { compiled, reasoning, attestation },
    prd: context.prd,
    sources: context.sources,
    requiresCitations: context.requiresCitations,
    stage: 'veritas_audit'
  });

  if (!veritas.ok && compiled.constraints?.riskLevel === 'high') {
    return { ok: false, stage: 'VERITAS', titan: compiled, reasoning, veritas, errors: veritas.findings.map((f: any) => f.message) };
  }

  const route = routeIntent(compiled.normalizedInput || input.input);
  const aether = runAether({ query: compiled.normalizedInput || input.input, context });

  const antigravity = runAntigravity({
    commandId: context.commandId,
    action: sink === 'shell_command' ? 'shell_command' : sink === 'file_delete' ? 'delete_path' : sink === 'file_write' ? 'atomic_write' : 'desktop_action',
    diffLines: context.diffLines,
    deleteBytes: context.deleteBytes,
    approved: Boolean(input.approved || context.approved),
    targetPath: context.targetPath,
    payload: { route, aether }
  });

  if (!antigravity.ok) {
    const memory = runOuroboros({ rawState: { input: input.input, compiled, reasoning, veritas, aether, antigravity, attestation }, source: context.source || 'system', commandId: context.commandId });
    const ledgerEvent = buildLedgerEvent(attestation);
    return { ok: false, stage: 'HITL_GATE', titan: compiled, reasoning, veritas, aether, antigravity, memory, ledgerEvent, warnings: ['Execution paused pending approval.'] };
  }

  const memory = runOuroboros({ rawState: { input: input.input, compiled, reasoning, veritas, aether, antigravity, attestation }, source: context.source || 'system', commandId: context.commandId });
  const ledgerEvent = buildLedgerEvent(attestation);

  return { ok: true, stage: 'COMPLETE', titan: compiled, reasoning, veritas, aether, antigravity, memory, ledgerEvent, warnings };
}
