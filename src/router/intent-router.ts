export type IntentType =
  | 'conversation'
  | 'android_action'
  | 'browser_action'
  | 'cli_action'
  | 'approval_response'
  | 'memory_query';

export interface IntentRoute {
  intent: IntentType;
  targetNode: string;
  riskLevel: 'low' | 'medium' | 'high';
  requiresApproval: boolean;
  payload: Record<string, any>;
}

export function routeIntent(transcript: string): IntentRoute {
  const text = transcript.toLowerCase();

  if (text.includes('open') || text.includes('tap') || text.includes('android')) {
    return {
      intent: 'android_action',
      targetNode: 'phoneclaw',
      riskLevel: 'medium',
      requiresApproval: true,
      payload: { action: transcript }
    };
  }

  if (text.includes('search') || text.includes('website') || text.includes('browser')) {
    return {
      intent: 'browser_action',
      targetNode: 'superpowers_chrome',
      riskLevel: 'low',
      requiresApproval: false,
      payload: { action: transcript }
    };
  }

  if (text.includes('git') || text.includes('code') || text.includes('terminal')) {
    return {
      intent: 'cli_action',
      targetNode: 'termux',
      riskLevel: 'high',
      requiresApproval: true,
      payload: { command: transcript }
    };
  }

  if (text.includes('confirm') || text.includes('approve')) {
    return {
      intent: 'approval_response',
      targetNode: 'lukas',
      riskLevel: 'low',
      requiresApproval: false,
      payload: { decision: 'approved' }
    };
  }

  return {
    intent: 'conversation',
    targetNode: 'gemini',
    riskLevel: 'low',
    requiresApproval: false,
    payload: { text: transcript }
  };
}
