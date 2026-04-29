export type AntigravityAction =
  | 'read_file'
  | 'atomic_write'
  | 'ast_patch'
  | 'delete_path'
  | 'shell_command'
  | 'desktop_action';

export interface AntigravityRequest {
  commandId?: string;
  action: AntigravityAction;
  targetPath?: string;
  payload?: Record<string, unknown>;
  diffLines?: number;
  deleteBytes?: number;
  approved?: boolean;
}

export interface AntigravityResult {
  ok: boolean;
  status: 'allowed' | 'blocked' | 'approval_required';
  reason: string;
  envelope: {
    atomic: boolean;
    backupRequired: boolean;
    backupRef?: string;
    astAwareRequired: boolean;
    rawOpenForbidden: true;
    ironGateTriggered: boolean;
  };
}

const TEN_LINE_DIFF_LIMIT = 10;
const FIFTY_MB = 50 * 1024 * 1024;

function backupRef(path?: string) {
  if (!path) return undefined;
  const safe = path.replace(/[^a-zA-Z0-9_.-]/g, '_');
  return `viking://camelot/backups/${Date.now()}_${safe}`;
}

export function runAntigravity(request: AntigravityRequest): AntigravityResult {
  const diffLines = request.diffLines || 0;
  const deleteBytes = request.deleteBytes || 0;
  const highRiskWrite = request.action === 'atomic_write' || request.action === 'ast_patch' || request.action === 'delete_path';
  const astAwareRequired = request.action === 'ast_patch' || request.action === 'atomic_write';
  const ironGateTriggered = diffLines > TEN_LINE_DIFF_LIMIT || deleteBytes > FIFTY_MB;

  if (request.action === 'shell_command') {
    return {
      ok: Boolean(request.approved),
      status: request.approved ? 'allowed' : 'approval_required',
      reason: request.approved ? 'Approved shell command may proceed.' : 'Shell commands require HITL approval.',
      envelope: {
        atomic: false,
        backupRequired: false,
        astAwareRequired: false,
        rawOpenForbidden: true,
        ironGateTriggered: !request.approved,
      }
    };
  }

  if (ironGateTriggered && !request.approved) {
    return {
      ok: false,
      status: 'approval_required',
      reason: 'Iron Gate v1.1 triggered: diff exceeds 10 lines or delete exceeds 50MB.',
      envelope: {
        atomic: request.action !== 'read_file',
        backupRequired: highRiskWrite,
        backupRef: highRiskWrite ? backupRef(request.targetPath) : undefined,
        astAwareRequired,
        rawOpenForbidden: true,
        ironGateTriggered,
      }
    };
  }

  if (request.action === 'delete_path' && !request.approved) {
    return {
      ok: false,
      status: 'approval_required',
      reason: 'Delete operations require explicit approval.',
      envelope: {
        atomic: true,
        backupRequired: true,
        backupRef: backupRef(request.targetPath),
        astAwareRequired: false,
        rawOpenForbidden: true,
        ironGateTriggered: true,
      }
    };
  }

  return {
    ok: true,
    status: 'allowed',
    reason: 'Antigravity envelope accepted. Execute through safe adapter only.',
    envelope: {
      atomic: request.action !== 'read_file',
      backupRequired: highRiskWrite,
      backupRef: highRiskWrite ? backupRef(request.targetPath) : undefined,
      astAwareRequired,
      rawOpenForbidden: true,
      ironGateTriggered,
    }
  };
}
