/**
 * Bifrost session token.
 *
 * A session envelope is only worth anything if the node on the far side can
 * verify it without calling home. The canonical form below is a flat,
 * pipe-delimited string precisely so the Rust gatekeeper and the Go broker can
 * rebuild it byte-for-byte without agreeing on a JSON canonicalization scheme.
 *
 * CANONICAL FORM — keep in lockstep with:
 *   services/heimdall-gatekeeper/src/token.rs
 *   services/bifrost-broker/internal/token/token.go
 *
 *   bifrost-v1|sessionId|deviceId|transport|fidelity|scopes|riskClass|notBefore|notAfter|maxIdleSeconds|issuedBy
 *
 * `scopes` is lowercase, de-duplicated, lexicographically sorted, comma-joined.
 * Timestamps are RFC3339 UTC with second precision (no milliseconds), because
 * Rust's and Go's default time formatting agree there and JavaScript's does not.
 */

import crypto from 'crypto';
import { BifrostFidelity, BifrostRiskClass, BifrostScope, BifrostSessionEnvelope, BifrostTransportId } from './types';

export const BIFROST_TOKEN_VERSION = 'bifrost-v1';

export interface SessionTokenClaims {
  sessionId: string;
  requestId: string;
  deviceId: string;
  transport: BifrostTransportId;
  fidelity: BifrostFidelity;
  scopes: BifrostScope[];
  riskClass: BifrostRiskClass;
  issuedBy: string;
  notBefore: Date;
  notAfter: Date;
  maxIdleSeconds: number;
}

/** RFC3339 UTC, second precision. `2026-08-10T15:26:00Z` */
export function toBifrostTimestamp(date: Date): string {
  return `${date.toISOString().slice(0, 19)}Z`;
}

export function normalizeScopes(scopes: BifrostScope[]): string {
  return Array.from(new Set(scopes.map(s => s.toLowerCase())))
    .sort()
    .join(',');
}

export function buildCanonicalToken(claims: SessionTokenClaims): string {
  return [
    BIFROST_TOKEN_VERSION,
    claims.sessionId,
    claims.deviceId,
    claims.transport,
    claims.fidelity,
    normalizeScopes(claims.scopes),
    claims.riskClass,
    toBifrostTimestamp(claims.notBefore),
    toBifrostTimestamp(claims.notAfter),
    String(claims.maxIdleSeconds),
    claims.issuedBy,
  ].join('|');
}

function hmac(canonical: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(canonical, 'utf8').digest('hex');
}

export function signSessionEnvelope(claims: SessionTokenClaims, secret: string): BifrostSessionEnvelope {
  if (!secret || secret.length < 16) {
    throw new Error('Bifrost signing secret must be at least 16 characters.');
  }

  const canonical = buildCanonicalToken(claims);

  return {
    sessionId: claims.sessionId,
    requestId: claims.requestId,
    deviceId: claims.deviceId,
    transport: claims.transport,
    fidelity: claims.fidelity,
    scopes: claims.scopes,
    riskClass: claims.riskClass,
    issuedBy: claims.issuedBy,
    notBefore: toBifrostTimestamp(claims.notBefore),
    notAfter: toBifrostTimestamp(claims.notAfter),
    maxIdleSeconds: claims.maxIdleSeconds,
    canonical,
    signature: hmac(canonical, secret),
    algorithm: 'HMAC-SHA256',
  };
}

export interface TokenVerification {
  ok: boolean;
  reason: string;
}

/**
 * Verify signature *and* validity window. A structurally valid signature over an
 * expired envelope is still a failure — the node-side daemon applies the same
 * two checks in the same order.
 */
export function verifySessionEnvelope(
  envelope: BifrostSessionEnvelope,
  secret: string,
  now: Date = new Date()
): TokenVerification {
  const expected = hmac(envelope.canonical, secret);
  const actual = envelope.signature;

  // Constant-time compare; timingSafeEqual throws on length mismatch.
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(actual, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, reason: 'Signature mismatch.' };
  }

  const notBefore = new Date(envelope.notBefore);
  const notAfter = new Date(envelope.notAfter);

  if (now < notBefore) return { ok: false, reason: `Session not valid until ${envelope.notBefore}.` };
  if (now >= notAfter) return { ok: false, reason: `Session expired at ${envelope.notAfter}.` };

  return { ok: true, reason: 'Session envelope valid.' };
}
