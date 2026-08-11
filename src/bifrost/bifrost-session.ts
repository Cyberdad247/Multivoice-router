/**
 * Bifrost session lifecycle.
 *
 * Sessions move through an explicit state machine. Illegal transitions throw
 * rather than silently correcting, because a session that reaches `active`
 * without passing `gated` would be an open bridge nobody authorized.
 */

import { BifrostSession, BifrostSessionEnvelope, BifrostSessionState } from './types';

const LEGAL_TRANSITIONS: Record<BifrostSessionState, BifrostSessionState[]> = {
  requested: ['gated', 'revoked'],
  gated: ['provisioning', 'revoked'],
  provisioning: ['active', 'degraded', 'revoked', 'expired'],
  active: ['degraded', 'closed', 'revoked', 'expired'],
  degraded: ['active', 'closed', 'revoked', 'expired'],
  // Terminal.
  revoked: [],
  expired: [],
  closed: [],
};

export const TERMINAL_STATES: BifrostSessionState[] = ['revoked', 'expired', 'closed'];

export function isTerminal(state: BifrostSessionState): boolean {
  return TERMINAL_STATES.includes(state);
}

export function canTransition(from: BifrostSessionState, to: BifrostSessionState): boolean {
  return LEGAL_TRANSITIONS[from].includes(to);
}

export function openSession(envelope: BifrostSessionEnvelope, now: Date = new Date()): BifrostSession {
  return {
    envelope,
    state: 'requested',
    openedAt: now.toISOString(),
    lastActivityAt: now.toISOString(),
  };
}

export function transition(
  session: BifrostSession,
  to: BifrostSessionState,
  options: { reason?: string; now?: Date } = {}
): BifrostSession {
  const now = options.now || new Date();

  if (!canTransition(session.state, to)) {
    throw new Error(
      `Illegal Bifrost session transition ${session.state} → ${to} for ${session.envelope.sessionId}.`
    );
  }

  const next: BifrostSession = {
    ...session,
    state: to,
    lastActivityAt: now.toISOString(),
  };

  if (to === 'degraded') next.degradedReason = options.reason;
  if (isTerminal(to)) next.terminationReason = options.reason;
  if (to === 'active') next.degradedReason = undefined;

  return next;
}

/** Record activity without changing state. Feeds the idle-timeout rule. */
export function touch(session: BifrostSession, now: Date = new Date()): BifrostSession {
  return { ...session, lastActivityAt: now.toISOString() };
}

export function isExpired(session: BifrostSession, now: Date = new Date()): boolean {
  return now >= new Date(session.envelope.notAfter);
}

export function idleSeconds(session: BifrostSession, now: Date = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(session.lastActivityAt).getTime()) / 1000));
}

export function remainingSeconds(session: BifrostSession, now: Date = new Date()): number {
  return Math.max(0, Math.floor((new Date(session.envelope.notAfter).getTime() - now.getTime()) / 1000));
}

/**
 * Force a session to a terminal state from wherever it is. Used by the
 * supervisor when the horn sounds — revocation must never be blocked by the
 * state machine.
 */
export function forceRevoke(
  session: BifrostSession,
  reason: string,
  now: Date = new Date()
): BifrostSession {
  if (isTerminal(session.state)) return session;
  return {
    ...session,
    state: 'revoked',
    lastActivityAt: now.toISOString(),
    terminationReason: reason,
  };
}
