import { IntentRoute } from '../router/intent-router';

const HIGH_RISK_TERMS = [
  'purchase',
  'buy',
  'checkout',
  'delete',
  'remove',
  'send',
  'publish',
  'post this',
  'transfer',
  'payment',
  'password',
  'login',
  'install',
  'grant permission',
  'share location',
  'submit form',
  'force push',
  'rm -rf',
  'curl | sh',
  'wget | bash',
  'npm publish'
];

const BLOCKED_TERMS = [
  'steal',
  'exfiltrate',
  'bypass password',
  'disable security',
  'hide activity',
  'spy on',
  'credential dump',
  'keylogger'
];

export interface PolicyDecision {
  allowed: boolean;
  reason: string;
  route: IntentRoute;
}

export function enforcePolicy(route: IntentRoute): IntentRoute {
  return evaluatePolicy(route).route;
}

export function evaluatePolicy(route: IntentRoute): PolicyDecision {
  const text = JSON.stringify(route.payload || {}).toLowerCase();

  if (BLOCKED_TERMS.some(term => text.includes(term))) {
    return {
      allowed: false,
      reason: 'Blocked by safety policy',
      route: {
        ...route,
        requiresApproval: true,
        riskLevel: 'high',
        payload: {
          ...route.payload,
          policyBlocked: true,
          policyReason: 'Blocked by safety policy'
        }
      }
    };
  }

  if (HIGH_RISK_TERMS.some(term => text.includes(term))) {
    return {
      allowed: true,
      reason: 'High-risk action requires approval',
      route: {
        ...route,
        requiresApproval: true,
        riskLevel: 'high',
        payload: {
          ...route.payload,
          policyReason: 'High-risk action requires approval'
        }
      }
    };
  }

  return {
    allowed: true,
    reason: 'Allowed',
    route
  };
}
