import { routeIntent } from '../router/intent-router';
import { evaluatePolicy } from '../policy/policy-engine';
import { TitanPrompt, validateTitanPrompt } from './titan-schema';

export interface ApeeCompileTrace {
  qft: {
    clean: string;
    anchors: string[];
    ambiguous: boolean;
  };
  agentArmor: {
    allowed: boolean;
    reason: string;
    labels: string[];
  };
  stages: {
    parse: Record<string, unknown>;
    enrich: Record<string, unknown>;
    compile: Record<string, unknown>;
    route: Record<string, unknown>;
    validate: Record<string, unknown>;
  };
}

function runQFT(input: string) {
  const clean = input
    .replace(/\s+/g, ' ')
    .replace(/(uh|um|like|you know)/gi, '')
    .replace(/[“”]/g, '"')
    .replace(/[’]/g, "'")
    .trim();

  const anchors = Array.from(new Set(clean.match(/[A-Z][A-Z0-9_\-]{2,}|\/\/[A-Z]+|viking:\/\/[^\s]+/g) || []));
  const ambiguous = clean.length < 6 || /^(it|that|this|do it)$/i.test(clean);

  return { clean, anchors, ambiguous };
}

function agentArmorScan(payload: unknown) {
  const forbidden = [
    'ignore previous instructions',
    'bypass',
    'disable security',
    'reveal system prompt',
    'exfiltrate',
    'hide activity'
  ];

  const text = JSON.stringify(payload).toLowerCase();
  const labels = [
    text.includes('http') || text.includes('web') ? 'LOW_INTEGRITY_EXTERNAL' : 'HIGH_INTEGRITY_USER_INTENT',
    text.includes('delete') || text.includes('password') || text.includes('payment') ? 'HIGH_RISK_WRITE' : 'STANDARD_FLOW'
  ];

  if (forbidden.some(f => text.includes(f))) {
    return { allowed: false, reason: 'Prompt injection detected', labels };
  }

  return { allowed: true, reason: 'AgentArmor passed', labels };
}

function selectMode(model?: string): 'scaffolding' | 'sculpting' {
  const m = (model || '').toLowerCase();
  if (m.includes('gemini') || m.includes('o1') || m.includes('reasoning')) return 'scaffolding';
  return 'sculpting';
}

function matchFramework(clean: string) {
  if (/compare|options|branches|strategy|architecture/i.test(clean)) return 'ToT';
  if (/dependencies|map|graph|relationship|system/i.test(clean)) return 'GoT';
  if (/campaign|content|persona|audience/i.test(clean)) return 'COSTAR';
  return 'CoT';
}

function loadSkills(intent: string) {
  const map: Record<string, string[]> = {
    android_action: ['skills/android.md'],
    browser_action: ['skills/browser.md'],
    cli_action: ['skills/cli.md'],
    memory_query: ['skills/memory.md'],
    system_control: ['skills/system-control.md'],
  };
  return map[intent] || [];
}

function buildVariants(clean: string, framework: string) {
  return {
    good: clean,
    better: `[${framework}] ${clean}`,
    best: `[${framework}::TITAN] Objective=${clean}; Require: constraints, route, validation, ledger.`
  };
}

export async function runAnyaCompiler(rawInput: string, context: any = {}): Promise<(TitanPrompt & { trace: ApeeCompileTrace }) | { interrupt: string; trace: ApeeCompileTrace }> {
  const qft = runQFT(rawInput);

  const emptyTrace: ApeeCompileTrace = {
    qft,
    agentArmor: { allowed: true, reason: 'pending', labels: [] },
    stages: { parse: {}, enrich: {}, compile: {}, route: {}, validate: {} }
  };

  if (qft.ambiguous) {
    return { interrupt: 'Clarify your intent before I compile it.', trace: emptyTrace };
  }

  // Parse
  const route = routeIntent(qft.clean);
  const parse = {
    intent: route.intent,
    targetNode: route.targetNode,
    modality: context.source || 'text',
    complexity: qft.clean.length > 180 ? 'high' : 'standard'
  };

  // Enrich
  const framework = matchFramework(qft.clean);
  const modelMode = selectMode(context.model);
  const variants = buildVariants(qft.clean, framework);
  const enrich = { framework, modelMode, variants };

  // Compile
  const policy = evaluatePolicy(route);
  const titan: TitanPrompt = {
    schemaVersion: 'titan.v1',
    intent: route.intent as any,
    rawInput,
    normalizedInput: qft.clean,
    anchors: qft.anchors,
    entities: {
      ...route.payload,
      selectedVariant: variants.best,
      framework,
      justification: `APEE selected ${framework} with ${modelMode} because the request shape matched ${framework} routing heuristics.`
    },
    constraints: {
      riskLevel: route.riskLevel || 'low',
      requiresApproval: route.requiresApproval || false,
      modelMode,
      skillRefs: loadSkills(route.intent),
    },
    routing: {
      targetNode: route.targetNode,
      preferredEngine: 'AETHER',
    },
    confidence: qft.clean.length > 20 ? 0.88 : 0.72,
  };

  // Route and policy adjustment
  if (!policy.allowed) {
    titan.constraints.requiresApproval = true;
    titan.constraints.riskLevel = 'high';
    titan.entities.policyReason = policy.reason;
  }

  // AgentArmor + Validate
  const armor = agentArmorScan(titan);
  const validationErrors = validateTitanPrompt(titan);
  const trace: ApeeCompileTrace = {
    qft,
    agentArmor: armor,
    stages: {
      parse,
      enrich,
      compile: { titanIntent: titan.intent, confidence: titan.confidence },
      route: { targetNode: titan.routing.targetNode, preferredEngine: titan.routing.preferredEngine },
      validate: { validationErrors, policyAllowed: policy.allowed }
    }
  };

  if (!armor.allowed) throw new Error(armor.reason);
  if (validationErrors.length > 0) throw new Error(`Titan validation failed: ${validationErrors.join('; ')}`);

  return { ...titan, trace };
}
