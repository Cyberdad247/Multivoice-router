export interface AnyaLedgerEntry {
  type: 'ANYA_COMPILE';
  input: string;
  normalized: string;
  intent: string;
  confidence: number;
  blocked: boolean;
  timestamp: string;
}

export function logAnyaEvent(entry: AnyaLedgerEntry) {
  console.log('[ANYA_LEDGER]', JSON.stringify(entry));
}
