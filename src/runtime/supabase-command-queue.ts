import { CamelotApprovalRecord, CamelotCommandRecord, CamelotCommandResult, CommandStatus } from './command-types';
import { CommandQueueAdapter, EnqueueCommandInput } from './command-queue';

type SupabaseClientLike = {
  from: (table: string) => any;
};

function mapDbCommand(row: any): CamelotCommandRecord {
  return {
    commandId: row.id,
    userId: row.user_id,
    orgId: row.org_id,
    input: row.input,
    status: row.status,
    riskClass: row.risk_class,
    cartridge: row.cartridge,
    targetNode: row.target_node || row.target_device_id,
    requiresApproval: row.requires_approval,
    approvedBy: row.approved_by,
    dagHash: row.dag_hash,
    ledgerEventId: row.ledger_event_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDbApproval(row: any): CamelotApprovalRecord {
  return {
    approvalId: row.id,
    commandId: row.command_id,
    status: row.status,
    reason: row.reason,
    riskClass: row.risk_class,
    requestedAt: row.requested_at,
    resolvedAt: row.resolved_at,
    resolvedBy: row.resolved_by,
  };
}

export class SupabaseCommandQueue implements CommandQueueAdapter {
  constructor(private supabase: SupabaseClientLike) {}

  async enqueue(input: EnqueueCommandInput): Promise<CamelotCommandRecord> {
    const { data, error } = await this.supabase.from('camelot_commands').insert({
      org_id: input.orgId,
      user_id: input.userId,
      input: input.input,
      status: 'queued',
      risk_class: input.riskClass || 'L0_OBSERVE',
      cartridge: input.cartridge,
      target_node: input.targetNode,
      target_device_id: input.targetDeviceId,
      requires_approval: Boolean(input.requiresApproval),
      runtime_payload: input.runtimePayload || {},
    }).select('*').single();
    if (error) throw error;
    return mapDbCommand(data);
  }

  async get(commandId: string): Promise<CamelotCommandRecord | undefined> {
    const { data, error } = await this.supabase.from('camelot_commands').select('*').eq('id', commandId).maybeSingle();
    if (error) throw error;
    return data ? mapDbCommand(data) : undefined;
  }

  async updateStatus(commandId: string, status: CommandStatus, patch: Partial<CamelotCommandRecord> = {}): Promise<CamelotCommandRecord> {
    const payload: any = {
      status,
      cartridge: patch.cartridge,
      target_node: patch.targetNode,
      requires_approval: patch.requiresApproval,
      approved_by: patch.approvedBy,
      dag_hash: patch.dagHash,
      ledger_event_id: patch.ledgerEventId,
    };
    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
    const { data, error } = await this.supabase.from('camelot_commands').update(payload).eq('id', commandId).select('*').single();
    if (error) throw error;
    return mapDbCommand(data);
  }

  async requestApproval(input: Omit<CamelotApprovalRecord, 'approvalId' | 'requestedAt' | 'status'>): Promise<CamelotApprovalRecord> {
    const { data, error } = await this.supabase.from('camelot_approvals').insert({
      command_id: input.commandId,
      reason: input.reason,
      risk_class: input.riskClass,
      status: 'pending',
    }).select('*').single();
    if (error) throw error;
    await this.updateStatus(input.commandId, 'needs_approval', { requiresApproval: true });
    return mapDbApproval(data);
  }

  async resolveApproval(approvalId: string, status: 'approved' | 'denied', resolvedBy?: string): Promise<CamelotApprovalRecord> {
    const { data, error } = await this.supabase.from('camelot_approvals').update({
      status,
      resolved_by: resolvedBy,
      resolved_at: new Date().toISOString(),
    }).eq('id', approvalId).select('*').single();
    if (error) throw error;
    await this.updateStatus(data.command_id, status === 'approved' ? 'approved' : 'failed', { approvedBy: resolvedBy });
    return mapDbApproval(data);
  }

  async recordResult(result: Omit<CamelotCommandResult, 'completedAt'>): Promise<CamelotCommandResult> {
    const { data, error } = await this.supabase.from('camelot_command_results').insert({
      command_id: result.commandId,
      ok: result.ok,
      stage: result.stage,
      output_ref: result.outputRef,
      error: result.error,
      ledger_event_id: result.ledgerEventId,
      result_payload: {},
    }).select('*').single();
    if (error) throw error;
    await this.updateStatus(result.commandId, result.ok ? 'complete' : 'failed', { ledgerEventId: result.ledgerEventId });
    return {
      commandId: data.command_id,
      ok: data.ok,
      stage: data.stage,
      outputRef: data.output_ref,
      error: data.error,
      ledgerEventId: data.ledger_event_id,
      completedAt: data.completed_at,
    };
  }

  async pollNext(statuses: CommandStatus[] = ['queued', 'approved'], targetDeviceId?: string): Promise<CamelotCommandRecord | undefined> {
    let q = this.supabase.from('camelot_commands').select('*').in('status', statuses).order('created_at', { ascending: true }).limit(1);
    if (targetDeviceId) q = q.eq('target_device_id', targetDeviceId);
    const { data, error } = await q.maybeSingle();
    if (error) throw error;
    return data ? mapDbCommand(data) : undefined;
  }
}
