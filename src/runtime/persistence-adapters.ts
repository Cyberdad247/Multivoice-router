import { ProvenanceLedgerEvent } from '../provenance/provenance-ledger';

export type SupabaseClientLike = { from: (table: string) => any };

export async function persistLedgerEvent(supabase: SupabaseClientLike, event: ProvenanceLedgerEvent) {
  const { data, error } = await supabase.from('camelot_ledger_events').upsert({
    event_id: event.eventId,
    event_type: event.eventType,
    dag_hash: event.dagHash,
    signature: event.signature,
    signed_by: event.signedBy,
    status: event.status,
    attestation: event.attestation,
  }, { onConflict: 'event_id' }).select('*').single();

  if (error) throw error;
  return data;
}

export async function persistMemoryRefs(input: {
  supabase: SupabaseClientLike;
  commandId?: string;
  memory: any;
}) {
  const refs = input.memory?.hydrationRefs || [];
  const ukg = input.memory?.ukg;
  const rows = refs.map((ref: string) => ({
    command_id: input.commandId,
    memory_kind: ref.includes('/l0/') ? 'l0' : ref.includes('/l1/') ? 'l1' : ref.includes('/l2/') ? 'l2' : 'ukg',
    ref,
    anchors: ukg?.anchors || [],
    payload: { ukg },
  }));

  if (rows.length === 0 && ukg) {
    rows.push({
      command_id: input.commandId,
      memory_kind: 'ukg',
      ref: ukg.id,
      anchors: ukg.anchors || [],
      payload: { ukg },
    });
  }

  if (rows.length === 0) return [];

  const { data, error } = await input.supabase.from('camelot_memory_refs').insert(rows).select('*');
  if (error) throw error;
  return data;
}
