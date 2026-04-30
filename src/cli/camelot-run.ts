import 'dotenv/config';
import { runCamelotRuntime } from '../runtime/camelot-runtime';

const input = process.argv.slice(2).join(' ').trim();

if (!input) {
  console.error('Usage: npm run camelot:run -- "//PLAN build a safe patch"');
  process.exit(1);
}

const signingSecret = process.env.CAMELOT_SIGNING_SECRET;
if (!signingSecret) {
  console.error('Missing CAMELOT_SIGNING_SECRET.');
  process.exit(1);
}

const result = await runCamelotRuntime({
  input,
  signingSecret,
  context: {
    source: process.env.CAMELOT_DEFAULT_SOURCE || 'cli',
    signedBy: process.env.CAMELOT_DEFAULT_SIGNER || 'sir_aurelius',
  }
});

console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 2);
