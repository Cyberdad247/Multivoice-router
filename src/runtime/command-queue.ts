import { CamelotApprovalRecord, CamelotCommandRecord, CamelotCommandResult, CommandStatus } from './command-types';

export interface EnqueueCommandInput {
  input: string;
  userId?: string;
  orgId?: string;
  riskClass?: CamelotCommandRecord['riskClass'];
  cartridge?: string;
  targetNode?: string;
  targetDeviceId?: string;
  requiresApproval?: boolean;
  runtimePayload?: Record<string, unknown>;
}

export interface CommandQueueAdapter {
  enqueue(input: EnqueueCommandInput): Promise<CamelotCommandRecord>;
  get(commandId: string): Promise<CamelotCommandRecord | undefined>;
  updateStatus(commandId: string, status: CommandStatus, patch?: Partial<CamelotCommandRecord>): Promise<CamelotCommandRecord>;
  requestApproval(input: Omit<CamelotApprovalRecord, 'approvalId' | 'requestedAt' | 'status'>): Promise<CamelotApprovalRecord>;
  resolveApproval(approvalId: string, status: 'approved' | 'denied', resolvedBy?: string): Promise<CamelotApprovalRecord>;
  recordResult(result: Omit<CamelotCommandResult, 'completedAt'>): Promise<CamelotCommandResult>;
  pollNext(statuses?: CommandStatus[], targetDeviceId?: string): Promise<CamelotCommandRecord | undefined>;
}

function now() { return new Date().toISOString(); }
function id(prefix: string) { return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`; }

export class InMemoryCommandQueue implements CommandQueueAdapter {
  private commands = new Map<string, CamelotCommandRecord>();
  private approvals = new Map<string, CamelotApprovalRecord>();
  private results = new Map<string, CamelotCommandResult>();

  async enqueue(input: EnqueueCommandInput): Promise<CamelotCommandRecord> {
    const commandId = id('cmd');
    const record: CamelotCommandRecord = {
      commandId,
      userId: input.userId,
      orgId: input.orgId,
      input: input.input,
      status: 'queued',
      riskClass: input.riskClass || 'L0_OBSERVE',
      cartridge: input.cartridge,
      targetNode: input.targetNode,
      requiresApproval: Boolean(input.requiresApproval),
      createdAt: now(),
      updatedAt: now(),
    };
    this.commands.set(commandId, record);
    return record;
  }

  async get(commandId: string): Promise<CamelotCommandRecord | undefined> {
    return this.commands.get(commandId);
  }

  async updateStatus(commandId: string, status: CommandStatus, patch: Partial<CamelotCommandRecord> = {}): Promise<CamelotCommandRecord> {
    const existing = this.commands.get(commandId);
    if (!existing) throw new Error(`Command not found: ${commandId}`);
    const updated = { ...existing, ...patch, status, updatedAt: now() };
    this.commands.set(commandId, updated);
    return updated;
  }

  async requestApproval(input: Omit<CamelotApprovalRecord, 'approvalId' | 'requestedAt' | 'status'>): Promise<CamelotApprovalRecord> {
    const approval: CamelotApprovalRecord = { ...input, approvalId: id('appr'), status: 'pending', requestedAt: now() };
    this.approvals.set(approval.approvalId, approval);
    await this.updateStatus(input.commandId, 'needs_approval', { requiresApproval: true });
    return approval;
  }

  async resolveApproval(approvalId: string, status: 'approved' | 'denied', resolvedBy?: string): Promise<CamelotApprovalRecord> {
    const existing = this.approvals.get(approvalId);
    if (!existing) throw new Error(`Approval not found: ${approvalId}`);
    const resolved = { ...existing, status, resolvedAt: now(), resolvedBy };
    this.approvals.set(approvalId, resolved);
    await this.updateStatus(existing.commandId, status === 'approved' ? 'approved' : 'failed', { approvedBy: resolvedBy });
    return resolved;
  }

  async recordResult(result: Omit<CamelotCommandResult, 'completedAt'>): Promise<CamelotCommandResult> {
    const full = { ...result, completedAt: now() };
    this.results.set(result.commandId, full);
    await this.updateStatus(result.commandId, result.ok ? 'complete' : 'failed', { ledgerEventId: result.ledgerEventId });
    return full;
  }

  async pollNext(statuses: CommandStatus[] = ['queued', 'approved'], targetDeviceId?: string): Promise<CamelotCommandRecord | undefined> {
    return Array.from(this.commands.values())
      .filter(c => statuses.includes(c.status))
      .filter(c => !targetDeviceId || c.targetNode === targetDeviceId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
  }
}
