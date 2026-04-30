export type CommandStatus =
  | 'drafted'
  | 'queued'
  | 'compiled'
  | 'planned'
  | 'signed'
  | 'needs_approval'
  | 'approved'
  | 'executing'
  | 'complete'
  | 'failed'
  | 'dead_letter';

export type RiskClass = 'L0_OBSERVE' | 'L1_DRAFT' | 'L2_SAFE_EXECUTE' | 'L3_GUARDED_WRITE' | 'L4_HIGH_RISK' | 'L5_FORBIDDEN';

export interface CamelotCommandRecord {
  commandId: string;
  userId?: string;
  orgId?: string;
  input: string;
  status: CommandStatus;
  riskClass: RiskClass;
  cartridge?: string;
  targetNode?: string;
  requiresApproval: boolean;
  approvedBy?: string;
  dagHash?: string;
  ledgerEventId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CamelotApprovalRecord {
  approvalId: string;
  commandId: string;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  reason: string;
  riskClass: RiskClass;
  requestedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface CamelotCommandResult {
  commandId: string;
  ok: boolean;
  stage: string;
  outputRef?: string;
  error?: string;
  ledgerEventId?: string;
  completedAt: string;
}
