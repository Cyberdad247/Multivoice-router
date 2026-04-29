import { IntentRoute } from './intent-router';

export interface EdgeDispatchResult {
  accepted: boolean;
  status: 'queued' | 'approval_required' | 'executed' | 'blocked' | 'error';
  targetNode: string;
  message: string;
  route: IntentRoute;
}

export async function dispatchToEdge(route: IntentRoute): Promise<EdgeDispatchResult> {
  const endpointByNode: Record<string, string> = {
    phoneclaw: '/api/edge/android',
    superpowers_chrome: '/api/edge/browser',
    termux: '/api/edge/cli',
    rustdesk: '/api/edge/rescue',
    lukas: '/api/edge/approval'
  };

  const endpoint = endpointByNode[route.targetNode] || '/api/edge/conversation';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(route)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    return {
      accepted: false,
      status: 'error',
      targetNode: route.targetNode,
      message: error.error || 'Edge dispatch failed',
      route
    };
  }

  return response.json();
}
