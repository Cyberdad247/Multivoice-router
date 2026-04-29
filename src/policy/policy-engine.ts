import { IntentRoute } from '../router/intent-router';

export function enforcePolicy(route: IntentRoute): IntentRoute {
  const blockedActions = ['purchase', 'delete', 'send', 'transfer'];

  const text = JSON.stringify(route.payload).toLowerCase();

  if (blockedActions.some(a => text.includes(a))) {
    return {
      ...route,
      requiresApproval: true,
      riskLevel: 'high'
    };
  }

  return route;
}
