import crypto from 'crypto';

export interface DagNode {
  id: string;
  kind: string;
  intent: string;
  deps?: string[];
  payload?: Record<string, unknown>;
}

export interface SignableDag {
  dagId: string;
  root: string;
  nodes: Record<string, DagNode>;
  metadata?: Record<string, unknown>;
}

export interface DagSignatureEnvelope {
  dag: SignableDag;
  canonical: string;
  dagHash: string;
  signature: string;
  algorithm: 'HMAC-SHA256';
  signedBy: string;
  signedAt: string;
}

function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortObject);
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortObject((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value;
}

export function canonicalizeDag(dag: SignableDag): string {
  return JSON.stringify(sortObject(dag));
}

export function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export function signDag(dag: SignableDag, secret: string, signedBy = 'sir_aurelius'): DagSignatureEnvelope {
  if (!secret || secret.length < 16) {
    throw new Error('DAG signing secret must be at least 16 characters.');
  }

  const canonical = canonicalizeDag(dag);
  const dagHash = `sha256:${sha256Hex(canonical)}`;
  const signature = crypto.createHmac('sha256', secret).update(canonical).digest('hex');

  return {
    dag,
    canonical,
    dagHash,
    signature: `hmac-sha256:${signature}`,
    algorithm: 'HMAC-SHA256',
    signedBy,
    signedAt: new Date().toISOString(),
  };
}

export function verifyDagSignature(envelope: DagSignatureEnvelope, secret: string): boolean {
  const expected = signDag(envelope.dag, secret, envelope.signedBy);
  return crypto.timingSafeEqual(
    Buffer.from(expected.signature),
    Buffer.from(envelope.signature)
  ) && expected.dagHash === envelope.dagHash;
}
