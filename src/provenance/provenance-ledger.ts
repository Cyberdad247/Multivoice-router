import { ProvenanceAttestation } from './attestation';

export interface ProvenanceLedgerEvent {
  eventId: string;
  eventType: ProvenanceAttestation['type'];
  dagHash: string;
  signature: string;
  signedBy: string;
  status: ProvenanceAttestation['status'];
  timestamp: string;
  attestation: ProvenanceAttestation;
}

function stableEventId(attestation: ProvenanceAttestation): string {
  const base = `${attestation.type}:${attestation.dagHash}:${attestation.signature}`;
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    hash = ((hash << 5) - hash) + base.charCodeAt(i);
    hash |= 0;
  }
  return `prov_${Math.abs(hash).toString(16).padStart(8, '0')}`;
}

export function buildLedgerEvent(attestation: ProvenanceAttestation): ProvenanceLedgerEvent {
  return {
    eventId: stableEventId(attestation),
    eventType: attestation.type,
    dagHash: attestation.dagHash,
    signature: attestation.signature,
    signedBy: attestation.signedBy,
    status: attestation.status,
    timestamp: new Date().toISOString(),
    attestation,
  };
}

export function appendLedgerLine(event: ProvenanceLedgerEvent): string {
  return JSON.stringify(event);
}
