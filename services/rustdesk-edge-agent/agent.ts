import fetch from 'node-fetch';

const API = process.env.API_URL || 'http://localhost:3000';
const NODE = 'rustdesk';

async function poll() {
  const res = await fetch(`${API}/api/commands?node=${NODE}`);
  const cmds = await res.json();

  for (const cmd of cmds) {
    const result = await execute(cmd);

    await fetch(`${API}/api/commands/result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commandId: cmd.id, result })
    });
  }
}

async function execute(cmd: any) {
  switch (cmd.action) {
    case 'open_app':
      return { ok: true, note: 'open_app simulated' };
    case 'open_url':
      return { ok: true, note: 'open_url simulated' };
    default:
      return { ok: false, error: 'unsupported action' };
  }
}

setInterval(poll, 2000);
