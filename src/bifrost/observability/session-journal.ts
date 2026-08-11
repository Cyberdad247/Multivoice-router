/**
 * Tamper-evident session journal.
 *
 * Every meaningful thing that happens to a crossing is appended here, and each
 * entry carries the hash of the one before it. Removing or editing an entry
 * breaks the chain from that point forward, which `verifyJournalChain` detects
 * and locates.
 *
 * This is an integrity mechanism, not a secrecy one: the chain proves the log
 * was not *edited*, and says nothing about who could read it. Entry hashes are
 * plain SHA-256 over canonical fields — an attacker who can rewrite the whole
 * file can also recompute the chain. Anchor the head hash into the provenance
 * ledger (`buildLedgerEvent`) to close that gap.
 */

import crypto from 'crypto';
import { BifrostRiskClass, BifrostScope, BifrostTransportId } from '../types';

export type JournalEventKind =
  | 'crossing_requested'
  | 'crossing_denied'
  | 'crossing_gated'
  | 'crossing_approved'
  | 'session_issued'
  | 'session_provisioned'
  | 'profile_adapted'
  | 'action_authorized'
  | 'action_refused'
  | 'telemetry_sampled'
  | 'alarm_raised'
  | 'session_degraded'
  | 'session_revoked'
  | 'session_expired'
  | 'session_closed'
  | 'redteam_finding'
  | 'pipeline_step';

export interface JournalEvent {
  kind: JournalEventKind;
  sessionId?: string;
  deviceId?: string;
  tenantId?: string;
  actor: string;
  summary: string;
  riskClass?: BifrostRiskClass;
  transport?: BifrostTransportId;
  scopes?: BifrostScope[];
  detail?: Record<string, unknown>;
}

export interface JournalEntry extends JournalEvent {
  seq: number;
  timestamp: string;
  prevHash: string;
  hash: string;
}

/** Chain root. The first entry's prevHash. */
export const JOURNAL_GENESIS = '0'.repeat(64);

/**
 * Deterministic JSON with recursively sorted object keys.
 *
 * `JSON.stringify` preserves insertion order, which means two logically
 * identical details can hash differently — and, worse, that the Go verifier in
 * services/bifrost-broker could not reproduce the hash at all. Sorting makes
 * the encoding a function of the value rather than of how it was built.
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;

  const record = value as Record<string, unknown>;
  const body = Object.keys(record)
    .sort()
    .map(key => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(',');

  return `{${body}}`;
}

function canonicalEntry(entry: Omit<JournalEntry, 'hash'>): string {
  // Field order is fixed and explicit — never Object.keys over a mutable shape.
  return [
    String(entry.seq),
    entry.timestamp,
    entry.kind,
    entry.sessionId || '',
    entry.deviceId || '',
    entry.tenantId || '',
    entry.actor,
    entry.summary,
    entry.riskClass || '',
    entry.transport || '',
    (entry.scopes || []).slice().sort().join(','),
    canonicalJson(entry.detail ?? {}),
    entry.prevHash,
  ].join('|');
}

export function hashEntry(entry: Omit<JournalEntry, 'hash'>): string {
  return crypto.createHash('sha256').update(canonicalEntry(entry), 'utf8').digest('hex');
}

export function appendJournal(
  entries: JournalEntry[],
  event: JournalEvent,
  now: Date = new Date()
): JournalEntry {
  const prev = entries[entries.length - 1];
  const draft: Omit<JournalEntry, 'hash'> = {
    ...event,
    seq: prev ? prev.seq + 1 : 0,
    timestamp: now.toISOString(),
    prevHash: prev ? prev.hash : JOURNAL_GENESIS,
  };

  return { ...draft, hash: hashEntry(draft) };
}

export interface ChainVerification {
  ok: boolean;
  /** Index of the first entry that failed, or -1 when the chain is intact. */
  brokenAt: number;
  reason: string;
  /** Hash of the last valid entry — anchor this into the provenance ledger. */
  headHash: string;
}

export function verifyJournalChain(entries: JournalEntry[]): ChainVerification {
  let expectedPrev = JOURNAL_GENESIS;

  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index];

    if (entry.seq !== index) {
      return { ok: false, brokenAt: index, reason: `Entry ${index} has sequence ${entry.seq}; entries are missing or reordered.`, headHash: expectedPrev };
    }
    if (entry.prevHash !== expectedPrev) {
      return { ok: false, brokenAt: index, reason: `Entry ${index} does not follow its predecessor; an earlier entry was altered or removed.`, headHash: expectedPrev };
    }

    const { hash, ...rest } = entry;
    if (hashEntry(rest) !== hash) {
      return { ok: false, brokenAt: index, reason: `Entry ${index} was modified after it was written.`, headHash: expectedPrev };
    }

    expectedPrev = entry.hash;
  }

  return { ok: true, brokenAt: -1, reason: 'Journal chain intact.', headHash: expectedPrev };
}

/** In-memory journal with the same append/verify semantics as a persisted one. */
export class SessionJournal {
  private entries: JournalEntry[] = [];

  append(event: JournalEvent, now: Date = new Date()): JournalEntry {
    const entry = appendJournal(this.entries, event, now);
    this.entries.push(entry);
    return entry;
  }

  all(): JournalEntry[] {
    return [...this.entries];
  }

  forSession(sessionId: string): JournalEntry[] {
    return this.entries.filter(e => e.sessionId === sessionId);
  }

  forTenant(tenantId: string): JournalEntry[] {
    return this.entries.filter(e => e.tenantId === tenantId);
  }

  verify(): ChainVerification {
    return verifyJournalChain(this.entries);
  }

  head(): string {
    const last = this.entries[this.entries.length - 1];
    return last ? last.hash : JOURNAL_GENESIS;
  }

  size(): number {
    return this.entries.length;
  }
}

/** Newline-delimited JSON, suitable for shipping to durable storage. */
export function serializeJournal(entries: JournalEntry[]): string {
  return entries.map(entry => JSON.stringify(entry)).join('\n');
}
