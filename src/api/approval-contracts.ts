export interface PendingApprovalView {
  approvalId: string;
  commandId: string;
  input: string;
  riskClass: string;
  reason: string;
  diffPreview?: string;
  rollbackPlan?: string;
  veritasFindings: unknown[];
  antigravityEnvelope: Record<string, unknown>;
  requestedAt: string;
}

export interface ApprovalDecisionRequest {
  approvalId: string;
  decision: 'approved' | 'denied';
  resolvedBy: string;
  note?: string;
}

export interface ApprovalDecisionResponse {
  ok: boolean;
  approvalId: string;
  commandId?: string;
  status: 'approved' | 'denied' | 'error';
  error?: string;
}

export function validateApprovalDecision(input: ApprovalDecisionRequest): string[] {
  const errors: string[] = [];
  if (!input.approvalId) errors.push('approvalId is required.');
  if (!['approved', 'denied'].includes(input.decision)) errors.push('decision must be approved or denied.');
  if (!input.resolvedBy) errors.push('resolvedBy is required.');
  return errors;
}
