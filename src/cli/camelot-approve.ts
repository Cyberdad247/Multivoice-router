import 'dotenv/config';
import { InMemoryCommandQueue } from '../runtime/command-queue';

const [approvalId, decision, resolvedBy] = process.argv.slice(2);

if (!approvalId || !decision || !resolvedBy || !['approved', 'denied'].includes(decision)) {
  console.error('Usage: npm run camelot:approve -- <approvalId> <approved|denied> <resolvedBy>');
  process.exit(1);
}

// This is a local scaffold. Production approval resolution should use SupabaseCommandQueue.
const queue = new InMemoryCommandQueue();

console.log(JSON.stringify({
  ok: false,
  note: 'Approval CLI scaffold created. Wire this to SupabaseCommandQueue in deployed runtime.',
  approvalId,
  decision,
  resolvedBy,
}, null, 2));
