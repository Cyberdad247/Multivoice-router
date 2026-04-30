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

console.log('Camelot smoke tests passed.');
