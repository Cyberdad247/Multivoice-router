export type EdgeWorkerKind =
  | 'phoneclaw_android_worker'
  | 'chrome_superpowers_worker'
  | 'rustdesk_desktop_worker'
  | 'termux_cli_worker'
  | 'modal_cloud_worker';

export type EdgeAction =
  | 'tap'
  | 'swipe'
  | 'type_text'
  | 'screenshot'
  | 'open_app'
  | 'open_url'
  | 'navigate'
  | 'click'
  | 'extract_dom'
  | 'invoke_webmcp_tool'
  | 'hotkey'
  | 'focus_window'
  | 'shell_command'
  | 'send_message'
  | 'delete_item'
  | 'change_permission'
  | 'submit_form';

export type EdgeRiskClass = 'L0_OBSERVE' | 'L1_DRAFT' | 'L2_SAFE_EXECUTE' | 'L3_GUARDED_WRITE' | 'L4_HIGH_RISK' | 'L5_FORBIDDEN';

export interface EdgeCommand {
  commandId: string;
  targetWorker: EdgeWorkerKind;
  action: EdgeAction;
  payload: Record<string, unknown>;
  riskClass: EdgeRiskClass;
  requiresApproval: boolean;
  source: 'voice' | 'chat' | 'dashboard' | 'automation';
}

export interface EdgeResult {
  commandId: string;
  worker: EdgeWorkerKind;
  ok: boolean;
  summary: string;
  artifacts?: string[];
  memoryRefs?: string[];
  error?: string;
}

const HIGH_RISK_ACTIONS = new Set<EdgeAction>([
  'shell_command',
  'send_message',
  'delete_item',
  'change_permission',
  'submit_form'
]);

export function classifyEdgeRisk(action: EdgeAction): EdgeRiskClass {
  if (HIGH_RISK_ACTIONS.has(action)) return 'L4_HIGH_RISK';
  if (action === 'type_text' || action === 'click' || action === 'tap' || action === 'swipe') return 'L2_SAFE_EXECUTE';
  return 'L1_DRAFT';
}

export function requiresEdgeApproval(action: EdgeAction): boolean {
  return classifyEdgeRisk(action) === 'L4_HIGH_RISK';
}

export function buildEdgeCommand(input: {
  commandId: string;
  targetWorker: EdgeWorkerKind;
  action: EdgeAction;
  payload?: Record<string, unknown>;
  source?: EdgeCommand['source'];
}): EdgeCommand {
  const riskClass = classifyEdgeRisk(input.action);
  return {
    commandId: input.commandId,
    targetWorker: input.targetWorker,
    action: input.action,
    payload: input.payload || {},
    riskClass,
    requiresApproval: requiresEdgeApproval(input.action),
    source: input.source || 'voice'
  };
}
