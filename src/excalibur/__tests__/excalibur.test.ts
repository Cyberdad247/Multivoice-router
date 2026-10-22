/**
 * Excalibur module tests: registry completeness, honesty of integration
 * states (no fabricated live claims), the fail-closed consent gate, and
 * the knight roster shape.
 */
import { describe, it, expect } from 'vitest';
import {
  CLOUDBRAIN_COMPONENTS,
  KNIGHT_SEATS,
  ROUTER_LINKS,
  getComponentById,
} from '../cloudbrain-registry';
import { evaluateCrossing, type CrossingInput } from '../excalibur-gate';

const USER_NAMED = [
  'notebooklm',
  'open-notebook',
  'memcastle',
  'understand-anything',
  'openviking',
  'codegraph',
  'graphify',
  'graphiti',
  'qdrant',
];

const ALL_OPEN: CrossingInput = {
  identity: true,
  integrity: true,
  intent: true,
  payload: true,
  access: true,
  bridgeSealed: false,
  humanApproved: false,
  mutation: false,
};

describe('cloudbrain registry completeness', () => {
  it('contains all 9 user-named components plus redis-go, bifrost, roundtable', () => {
    const ids = CLOUDBRAIN_COMPONENTS.map((c) => c.id);
    for (const id of USER_NAMED) expect(ids).toContain(id);
    for (const id of ['redis-go', 'bifrost', 'roundtable']) expect(ids).toContain(id);
  });

  it('every component has a role, notes, and a coherent endpoint/state pairing', () => {
    for (const c of CLOUDBRAIN_COMPONENTS) {
      expect(c.name.length).toBeGreaterThan(0);
      expect(c.role.length).toBeGreaterThan(0);
      expect(c.notes.length).toBeGreaterThan(0);
      if (c.state === 'not-integrated' || c.state === 'design-only') {
        expect(c.endpoint).toBeNull();
      }
    }
  });

  it('router links cover the routing chain and the public BoB gateway', () => {
    const ids = ROUTER_LINKS.map((r) => r.id);
    expect(ids).toContain('roundtable-bifrost');
    expect(ids).toContain('bob-gateway-public');
    expect(ids).toContain('mesh-broker');
    expect(ids).toContain('anya-omega');
  });
});

describe('registry honesty — no fabricated live claims', () => {
  it('not-integrated / design-only / adapter-stub components never claim verified-live', () => {
    const weak = CLOUDBRAIN_COMPONENTS.filter((c) =>
      ['not-integrated', 'design-only', 'adapter-stub'].includes(c.state),
    );
    expect(weak.length).toBeGreaterThanOrEqual(5);
    for (const c of weak) {
      expect(c.state).not.toBe('verified-live');
      expect(c.notes.trim().length).toBeGreaterThan(0);
    }
  });

  it('memcastle is design-only and says plainly that no service runs on the VPS', () => {
    const memcastle = getComponentById('memcastle');
    expect(memcastle?.state).toBe('design-only');
    expect(memcastle?.endpoint).toBeNull();
    expect(memcastle?.notes).toMatch(/no MemPalace\/MemCastle service runs on the VPS/i);
  });

  it('graphiti is an adapter stub, not a live graph', () => {
    const graphiti = getComponentById('graphiti');
    expect(graphiti?.state).toBe('adapter-stub');
    expect(graphiti?.notes).toMatch(/stub/i);
    expect(graphiti?.notes).toMatch(/NOT a live graph/);
  });

  it('notebooklm is manual with no endpoint', () => {
    const notebooklm = getComponentById('notebooklm');
    expect(notebooklm?.state).toBe('manual');
    expect(notebooklm?.endpoint).toBeNull();
  });
});

describe('excalibur gate — fail-closed consent', () => {
  it('allows a read-only crossing when all gates hold and the bridge is unsealed', () => {
    const result = evaluateCrossing(ALL_OPEN);
    expect(result.allowed).toBe(true);
  });

  it('blocks everything while the bridge is sealed', () => {
    const result = evaluateCrossing({ ...ALL_OPEN, bridgeSealed: true, humanApproved: true, mutation: true });
    expect(result.allowed).toBe(false);
    expect(result.reasons.join(' ')).toMatch(/sealed/i);
  });

  it('blocks a mutation without human approval', () => {
    const result = evaluateCrossing({ ...ALL_OPEN, mutation: true, humanApproved: false });
    expect(result.allowed).toBe(false);
    expect(result.reasons.join(' ')).toMatch(/human approval/i);
  });

  it('allows a mutation with human approval and all gates open', () => {
    const result = evaluateCrossing({ ...ALL_OPEN, mutation: true, humanApproved: true });
    expect(result.allowed).toBe(true);
  });

  it('blocks when any single gate is missing', () => {
    for (const gate of ['identity', 'integrity', 'intent', 'payload', 'access'] as const) {
      const result = evaluateCrossing({ ...ALL_OPEN, [gate]: false });
      expect(result.allowed).toBe(false);
      expect(result.reasons.join(' ')).toMatch(new RegExp(gate, 'i'));
    }
  });

  it('never throws and fails closed on empty or malformed input', () => {
    expect(evaluateCrossing(undefined).allowed).toBe(false);
    expect(evaluateCrossing(null).allowed).toBe(false);
    expect(evaluateCrossing({}).allowed).toBe(false);
  });
});

describe('knight roster', () => {
  it('has exactly gawain, percival, mnemosyne, heimdall as runtime knights', () => {
    const runtime = KNIGHT_SEATS.filter((k) => k.runtimeKnight).map((k) => k.id);
    expect(runtime).toEqual(['gawain', 'percival', 'mnemosyne', 'heimdall']);
  });

  it('marks hermes as a pseudo-knight, not a runtime knight', () => {
    const hermes = KNIGHT_SEATS.find((k) => k.id === 'hermes');
    expect(hermes).toBeDefined();
    expect(hermes?.runtimeKnight).toBe(false);
  });

  it('heimdall carries the mistral-voxtral voice with kokoro fallback', () => {
    const heimdall = KNIGHT_SEATS.find((k) => k.id === 'heimdall');
    expect(heimdall?.voice).toMatch(/Voxtral/);
    expect(heimdall?.voice).toMatch(/Kokoro spk 6/);
  });
});
