import { DagSignatureEnvelope } from './dag-signer';

export type AttestationStatus =
  | 'contract_defined'
  | 'signed'
  | 'rotel_verified'
  | 'polygon_anchor_pending'
  | 'polygon_anchored';

export interface ProvenanceAttestation {
  type: 'GENESIS_ARTIFACT_EVENT' | 'COMMAND_EVENT' | 'EVOLUTION_PACKET_EVENT';
  version: string;
  command?: string;
  dagHash: string;
  signature: string;
  signedBy: string;
  signedAt: string;
  rotelVerified: boolean;
  rotelVerificationRef?: string;
  polygonAnchor?: {
    chain: 'polygon';
    txHash: string;
    blockNumber?: number;
  } | null;
  status: AttestationStatus;
  metadata?: Record<string, unknown>;
}

export function createProvenanceAttestation(input: {
  envelope: DagSignatureEnvelope;
  command?: string;
  version?: string;
  type?: ProvenanceAttestation['type'];
  metadata?: Record<string, unknown>;
}): ProvenanceAttestation {
  return {
    type: input.type || 'GENESIS_ARTIFACT_EVENT',
    version: input.version || 'v400.5.3',
    command: input.command,
    dagHash: input.envelope.dagHash,
    signature: input.envelope.signature,
    signedBy: input.envelope.signedBy,
    signedAt: input.envelope.signedAt,
    rotelVerified: false,
    polygonAnchor: null,
    status: 'signed',
    metadata: input.metadata,
  };
}

export function markRotelVerified(attestation: ProvenanceAttestation, rotelVerificationRef: string): ProvenanceAttestation {
  return {
    ...attestation,
    rotelVerified: true,
    rotelVerificationRef,
    status: 'rotel_verified',
  };
}

export function markPolygonAnchored(attestation: ProvenanceAttestation, txHash: string, blockNumber?: number): ProvenanceAttestation {
  return {
    ...attestation,
    polygonAnchor: {
      chain: 'polygon',
      txHash,
      blockNumber,
    },
    status: 'polygon_anchored',
  };
}

export function serializeAttestation(attestation: ProvenanceAttestation): string {
  return JSON.stringify(attestation, null, 2);
}
