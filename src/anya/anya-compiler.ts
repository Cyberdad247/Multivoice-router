import { routeIntent } from '../router/intent-router';
import { evaluatePolicy } from '../policy/policy-engine';
import { TitanPrompt } from './titan-schema';

function runQFT(input: string) {
  const clean = input
    .replace(/\s+/g, ' ')
    .replace(/(uh|um|like|you know)/gi, '')
    .trim();

  const anchors = clean.match(/[A-Z_]{3,}/g) || [];
  const ambiguous = clean.length < 6;

  return { clean, anchors, ambiguous };
}

function agentArmorScan(payload: any) {
  const forbidden = ['ignore previous instructions', 'bypass', 'disable security'];
  const text = JSON.stringify(payload).toLowerCase();

  if (forbidden.some(f => text.includes(f))) {
    return { allowed: false, reason: 'Prompt injection detected' };
  }

  return { allowed: true };
}

function selectMode(model?: string) {
  if (model?.includes('gemini') || model?.includes('o1')) return 'scaffolding';
  return 'sculpting';
}

function loadSkills(intent: string) {
  const map: Record<string, string[]> = {
    android_action: ['skills/android.md'],
    browser_action: ['skills/browser.md'],
    cli_action: ['skills/cli.md'],
  };
  return map[intent] || [];
}

export async function runAnyaCompiler(rawInput: string, context: any = {}): Promise<TitanPrompt | { interrupt: string }> {
  const qft = runQFT(rawInput);

  if (qft.ambiguous) {
    return { interrupt: 'Clarify your intent.' };
  }

  const route = routeIntent(qft.clean);
  const policy = evaluatePolicy(route);

  const titan: TitanPrompt = {
    schemaVersion: 'titan.v1',
    intent: route.intent as any,
    rawInput,
    normalizedInput: qft.clean,
    anchors: qft.anchors,
    entities: route.payload,
    constraints: {
      riskLevel: route.riskLevel || 'low',
      requiresApproval: route.requiresApproval || false,
      modelMode: selectMode(context.model),
      skillRefs: loadSkills(route.intent),
    },
    routing: {
      targetNode: route.targetNode,
      preferredEngine: 'AETHER',
    },
    confidence: 0.85,
  };

  const armor = agentArmorScan(titan);
  if (!armor.allowed) {
    throw new Error(armor.reason);
  }

  if (!policy.allowed) {
    titan.constraints.requiresApproval = true;
    titan.constraints.riskLevel = 'high';
  }

  return titan;
}
