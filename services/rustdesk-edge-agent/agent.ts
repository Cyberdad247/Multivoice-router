import fetch from 'node-fetch';

const API = process.env.API_URL || 'http://localhost:3000';
const NODE = 'rustdesk';

interface EdgeCommand {
  id: string;
  action: string;
}

async function poll() {
  const res = await fetch(`${API}/api/commands?node=${NODE}`);
  const payload = await res.json();
  const cmds = Array.isArray(payload) ? (payload as EdgeCommand[]) : [];

  for (const cmd of cmds) {
    const result = await execute(cmd);

    await fetch(`${API}/api/commands/result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commandId: cmd.id, result })
    });
  }
}

async function execute(cmd: EdgeCommand) {
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
