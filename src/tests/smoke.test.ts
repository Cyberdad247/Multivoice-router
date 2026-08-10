import assert from 'node:assert/strict';
import { signDag, verifyDagSignature } from '../provenance/dag-signer';
import { buildPromptDependencyGraph, enforceAgentArmor } from '../security/agentarmor-pdg';
import { runAntigravity } from '../execution/antigravity-engine';
import { InMemoryCommandQueue } from '../runtime/command-queue';

const secret = 'test-secret-that-is-long-enough';

const envelope = signDag({
  dagId: 'dag_test',
  root: 'a',
  nodes: {
    a: { id: 'a', kind: 'test', intent: 'verify' }
  }
}, secret);
assert.equal(verifyDagSignature(envelope, secret), true);

const graph = buildPromptDependencyGraph({
  sourceLabel: 'web_page',
  sourceIntegrity: 'LOW_INTEGRITY',
  transforms: ['APEE'],
  sink: 'file_delete'
});
const armor = enforceAgentArmor(graph);
assert.equal(armor.allowed, false);

const ag = runAntigravity({ action: 'delete_path', targetPath: '/tmp/x', approved: false });
assert.equal(ag.ok, false);
assert.equal(ag.status, 'approval_required');

const queue = new InMemoryCommandQueue();
const cmd = await queue.enqueue({ input: 'test command' });
assert.equal(cmd.status, 'queued');
await queue.updateStatus(cmd.commandId, 'complete');
const done = await queue.get(cmd.commandId);
assert.equal(done?.status, 'complete');

// --- Bifrost Bridge / Sir Heimdall ----------------------------------------

const { buildCanonicalToken, signSessionEnvelope, verifySessionEnvelope } = await import('../bifrost/session-token');
const { evaluateCrossing } = await import('../bifrost/heimdall-guardian');
const { soundGjallarhorn } = await import('../bifrost/gjallarhorn');
const { tickBifrostSupervisor } = await import('../bifrost/autonomous-supervisor');
const { runBifrostCrossing } = await import('../bifrost/bifrost-runtime');
const { BIFROST_DEVICES, applyHeartbeat } = await import('../bifrost/device-registry');
const { openSession, transition } = await import('../bifrost/bifrost-session');

// Cross-language signing vector. The identical secret, canonical string and
// signature are asserted in services/heimdall-gatekeeper/src/token.rs and
// services/bifrost-broker/internal/token/token_test.go. If any implementation
// drifts from the canonical form, one of the three test suites fails.
const VECTOR_SECRET = 'bifrost-test-secret-0123456789';
const VECTOR_CANONICAL =
  'bifrost-v1|bfs_vector_001|desktop_primary|sunshine_moonlight|view|audio_out,screen_view|L1_DRAFT|' +
  '2026-08-10T12:00:00Z|2026-08-10T12:15:00Z|600|sir_heimdall';
const VECTOR_SIGNATURE = 'c20468d38da3a647f72f20de5c4c4a1468376cb563c01551c40a29f3aa853981';

const vectorClaims = {
  sessionId: 'bfs_vector_001',
  requestId: 'req_vector_001',
  deviceId: 'desktop_primary',
  transport: 'sunshine_moonlight' as const,
  fidelity: 'view' as const,
  // Deliberately unsorted — normalization must fix the order.
  scopes: ['screen_view', 'audio_out'] as any,
  riskClass: 'L1_DRAFT' as const,
  issuedBy: 'sir_heimdall',
  notBefore: new Date('2026-08-10T12:00:00Z'),
  notAfter: new Date('2026-08-10T12:15:00Z'),
  maxIdleSeconds: 600,
};

assert.equal(buildCanonicalToken(vectorClaims), VECTOR_CANONICAL);
const vectorEnvelope = signSessionEnvelope(vectorClaims, VECTOR_SECRET);
assert.equal(vectorEnvelope.signature, VECTOR_SIGNATURE);

// Valid inside the window, expired outside it.
assert.equal(verifySessionEnvelope(vectorEnvelope, VECTOR_SECRET, new Date('2026-08-10T12:05:00Z')).ok, true);
assert.equal(verifySessionEnvelope(vectorEnvelope, VECTOR_SECRET, new Date('2026-08-10T12:20:00Z')).ok, false);
assert.equal(verifySessionEnvelope(vectorEnvelope, 'a-different-secret-entirely', new Date('2026-08-10T12:05:00Z')).ok, false);

// Tampering with the granted scopes must break the signature.
const escalated = { ...vectorEnvelope, scopes: [...vectorEnvelope.scopes, 'shell_exec' as any] };
assert.equal(verifySessionEnvelope(escalated, VECTOR_SECRET, new Date('2026-08-10T12:05:00Z')).ok, true);
assert.equal(
  verifySessionEnvelope(
    { ...escalated, canonical: buildCanonicalToken({ ...vectorClaims, scopes: escalated.scopes }) },
    VECTOR_SECRET,
    new Date('2026-08-10T12:05:00Z')
  ).ok,
  false
);

const freshDesktop = applyHeartbeat(BIFROST_DEVICES[0], new Date());
const gpuBox = applyHeartbeat(BIFROST_DEVICES[1], new Date());

// Heimdall narrows: Sunshine cannot carry file transfer, so the scope is refused
// rather than the whole crossing being denied.
const narrowed = evaluateCrossing(
  {
    requestId: 'req_1',
    deviceId: 'desktop_primary',
    transport: 'sunshine_moonlight',
    fidelity: 'control',
    scopes: ['screen_view', 'file_push'],
    purpose: 'smoke test',
    requestedBy: 'test',
  },
  { device: freshDesktop }
);
assert.equal(narrowed.verdict, 'ALLOW');
assert.deepEqual(narrowed.grantedScopes, ['screen_view']);
assert.equal(narrowed.grantedFidelity, 'interact');
assert.equal(narrowed.refusedScopes[0].scope, 'file_push');

// A device that permanently denies a scope is not overridden by any transport.
const deviceDenied = evaluateCrossing(
  {
    requestId: 'req_2',
    deviceId: 'gpu_workstation',
    transport: 'sunshine_moonlight',
    fidelity: 'control',
    scopes: ['shell_exec'],
    purpose: 'smoke test',
    requestedBy: 'test',
  },
  { device: gpuBox }
);
assert.equal(deviceDenied.verdict, 'DENY');

// High-risk scopes always require a human, and TTL is clamped by risk.
const highRisk = evaluateCrossing(
  {
    requestId: 'req_3',
    deviceId: 'desktop_primary',
    transport: 'rustdesk_control',
    fidelity: 'control',
    scopes: ['file_push'],
    purpose: 'smoke test',
    requestedBy: 'test',
    requestedTtlSeconds: 86400,
  },
  { device: freshDesktop }
);
assert.equal(highRisk.verdict, 'APPROVAL_REQUIRED');
assert.equal(highRisk.riskClass, 'L4_HIGH_RISK');
assert.equal(highRisk.ttlSeconds, 300);

// A silent gatekeeper closes the bridge to its device.
const staleDenied = evaluateCrossing(
  {
    requestId: 'req_4',
    deviceId: 'desktop_primary',
    transport: 'sunshine_moonlight',
    fidelity: 'view',
    scopes: ['screen_view'],
    purpose: 'smoke test',
    requestedBy: 'test',
  },
  { device: BIFROST_DEVICES[0] } // no heartbeat applied
);
assert.equal(staleDenied.verdict, 'DENY');

// Gjallarhorn: a non-tailnet peer is a halting alarm.
const horn = soundGjallarhorn({
  devices: [freshDesktop],
  sessions: [],
  observations: [
    { peerAddress: '203.0.113.9', protocol: 'tcp', direction: 'inbound', bytes: 4096, observedAt: new Date().toISOString() },
  ],
});
assert.equal(horn.halt, true);
assert.equal(horn.alarms.some(a => a.rule === 'off_tailnet_peer'), true);

// A forbidden protocol means a remote-access path exists outside the bridge.
const forbidden = soundGjallarhorn({
  devices: [freshDesktop],
  sessions: [],
  observations: [
    { peerAddress: '100.64.0.10', protocol: 'vnc', direction: 'inbound', bytes: 512, observedAt: new Date().toISOString() },
  ],
});
assert.equal(forbidden.alarms.some(a => a.rule === 'forbidden_protocol'), true);

// The supervisor expires a session whose envelope window has closed.
const expiringEnvelope = signSessionEnvelope(
  { ...vectorClaims, sessionId: 'bfs_expiring', notBefore: new Date('2026-08-10T12:00:00Z'), notAfter: new Date('2026-08-10T12:01:00Z') },
  VECTOR_SECRET
);
let expiring = openSession(expiringEnvelope, new Date('2026-08-10T12:00:00Z'));
expiring = transition(expiring, 'gated', { now: new Date('2026-08-10T12:00:00Z') });
expiring = transition(expiring, 'provisioning', { now: new Date('2026-08-10T12:00:00Z') });
expiring = transition(expiring, 'active', { now: new Date('2026-08-10T12:00:30Z') });

const tick = tickBifrostSupervisor({
  devices: [applyHeartbeat(BIFROST_DEVICES[0], new Date('2026-08-10T12:04:50Z'))],
  sessions: [expiring],
  now: new Date('2026-08-10T12:05:00Z'),
});
assert.equal(tick.sessions[0].state, 'expired');
assert.equal(tick.actions.some(a => a.kind === 'expire_session'), true);

// A session still inside its window is revoked — not expired — when the horn
// sounds. Guards the ordering of the expiry and revocation branches.
const liveEnvelope = signSessionEnvelope(
  { ...vectorClaims, sessionId: 'bfs_live', notBefore: new Date('2026-08-10T12:00:00Z'), notAfter: new Date('2026-08-10T12:30:00Z') },
  VECTOR_SECRET
);
let liveSession = openSession(liveEnvelope, new Date('2026-08-10T12:00:00Z'));
liveSession = transition(liveSession, 'gated', { now: new Date('2026-08-10T12:00:00Z') });
liveSession = transition(liveSession, 'provisioning', { now: new Date('2026-08-10T12:00:00Z') });
liveSession = transition(liveSession, 'active', { now: new Date('2026-08-10T12:04:55Z') });

const revokingTick = tickBifrostSupervisor({
  devices: [applyHeartbeat(BIFROST_DEVICES[0], new Date('2026-08-10T12:04:50Z'))],
  sessions: [liveSession],
  observations: [
    { peerAddress: '198.51.100.7', protocol: 'tcp', direction: 'inbound', bytes: 128, observedAt: '2026-08-10T12:04:59Z' },
  ],
  now: new Date('2026-08-10T12:05:00Z'),
});
assert.equal(revokingTick.halt, true);
assert.equal(revokingTick.sessions[0].state, 'revoked');
assert.equal(revokingTick.sessions[0].terminationReason, 'gjallarhorn_halt');

// Illegal lifecycle transitions are refused rather than silently corrected.
assert.throws(() => transition(openSession(vectorEnvelope), 'active'));

// Full crossing: high-risk request without approval parks at the HITL gate and
// never mints an envelope.
const gated = await runBifrostCrossing({
  request: {
    requestId: 'req_gate',
    deviceId: 'desktop_primary',
    transport: 'rustdesk_control',
    fidelity: 'control',
    scopes: ['file_push'],
    purpose: 'smoke test',
    requestedBy: 'test',
    source: 'cli',
  },
  signingSecret: VECTOR_SECRET,
  devices: [freshDesktop],
  sessions: [],
});
assert.equal(gated.ok, false);
assert.equal(gated.stage, 'HITL_GATE');
assert.equal(gated.session, undefined);

// The same crossing with approval completes and produces a signed envelope.
const approvedCrossing = await runBifrostCrossing({
  request: {
    requestId: 'req_ok',
    deviceId: 'desktop_primary',
    transport: 'rustdesk_control',
    fidelity: 'control',
    scopes: ['file_push'],
    purpose: 'smoke test',
    requestedBy: 'test',
    source: 'cli',
  },
  signingSecret: VECTOR_SECRET,
  devices: [freshDesktop],
  sessions: [],
  approved: true,
});
assert.equal(approvedCrossing.ok, true);
assert.equal(approvedCrossing.stage, 'COMPLETE');
assert.equal(approvedCrossing.session?.state, 'provisioning');
assert.equal(
  verifySessionEnvelope(approvedCrossing.session!.envelope, VECTOR_SECRET).ok,
  true
);
assert.ok(approvedCrossing.ledgerEvent?.eventId);

console.log('Camelot smoke tests passed.');
