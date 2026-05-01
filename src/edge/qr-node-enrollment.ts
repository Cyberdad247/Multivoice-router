import crypto from 'crypto';
import { EdgeWorkerKind } from './edge-action-schema';

export interface NodeEnrollmentQrPayload {
  type: 'CAMELOT_NODE_ENROLLMENT';
  version: 'v1';
  enrollmentUrl: string;
  token: string;
  expiresAt: string;
  requestedKind: EdgeWorkerKind;
  orgId?: string;
  operatorId?: string;
  nonce: string;
}

export interface EnrolledNodeRecord {
  nodeId: string;
  kind: EdgeWorkerKind;
  orgId?: string;
  operatorId?: string;
  capabilityManifest: Record<string, unknown>;
  nodeSecretHash: string;
  status: 'pending' | 'approved' | 'revoked' | 'expired';
  createdAt: string;
  lastHeartbeatAt?: string;
}

export function createEnrollmentToken(bytes = 24): string {
  return `enroll_${crypto.randomBytes(bytes).toString('base64url')}`;
}

export function createNodeSecret(bytes = 32): string {
  return `node_${crypto.randomBytes(bytes).toString('base64url')}`;
}

export function hashNodeSecret(secret: string): string {
  return crypto.createHash('sha256').update(secret).digest('hex');
}

export function createNodeEnrollmentQrPayload(input: {
  enrollmentUrl: string;
  requestedKind: EdgeWorkerKind;
  orgId?: string;
  operatorId?: string;
  ttlSeconds?: number;
}): NodeEnrollmentQrPayload {
  const expires = new Date(Date.now() + (input.ttlSeconds || 300) * 1000);
  return {
    type: 'CAMELOT_NODE_ENROLLMENT',
    version: 'v1',
    enrollmentUrl: input.enrollmentUrl,
    token: createEnrollmentToken(),
    expiresAt: expires.toISOString(),
    requestedKind: input.requestedKind,
    orgId: input.orgId,
    operatorId: input.operatorId,
    nonce: crypto.randomBytes(16).toString('base64url'),
  };
}

export function serializeQrPayload(payload: NodeEnrollmentQrPayload): string {
  return JSON.stringify(payload);
}

export function parseQrPayload(raw: string): NodeEnrollmentQrPayload {
  const payload = JSON.parse(raw);
  if (payload.type !== 'CAMELOT_NODE_ENROLLMENT') throw new Error('Invalid QR payload type.');
  if (payload.version !== 'v1') throw new Error('Unsupported QR payload version.');
  if (new Date(payload.expiresAt).getTime() < Date.now()) throw new Error('Enrollment QR expired.');
  return payload;
}

export function createPendingNodeRecord(input: {
  payload: NodeEnrollmentQrPayload;
  capabilityManifest: Record<string, unknown>;
  nodeSecret: string;
}): EnrolledNodeRecord {
  return {
    nodeId: `node_${crypto.randomBytes(12).toString('base64url')}`,
    kind: input.payload.requestedKind,
    orgId: input.payload.orgId,
    operatorId: input.payload.operatorId,
    capabilityManifest: input.capabilityManifest,
    nodeSecretHash: hashNodeSecret(input.nodeSecret),
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
}
