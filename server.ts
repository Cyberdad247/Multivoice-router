import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { google } from 'googleapis';
import cookieSession from 'cookie-session';
import { runBifrostCrossing } from './src/bifrost/bifrost-runtime';
import { BIFROST_TRANSPORTS } from './src/bifrost/transport-registry';
import { BIFROST_DEVICES, applyHeartbeat, isHeartbeatFresh } from './src/bifrost/device-registry';
import { tickBifrostSupervisor } from './src/bifrost/autonomous-supervisor';
import { forceRevoke } from './src/bifrost/bifrost-session';
import { buildProvisioningPlan, buildTeardownPlan } from './src/bifrost/desktop/node-provisioner';
import { SessionJournal } from './src/bifrost/observability/session-journal';
import { assessTelemetry, telemetryAlarms } from './src/bifrost/observability/node-telemetry';
import { runRedteam, redteamAlarms, formatRedteamReport } from './src/bifrost/redteam/redteam-runner';
import { authorizePipeline } from './src/bifrost/cicd/pipeline-authorization';
import { executePipelineRun, planPipelineRun, PipelineRunRecord } from './src/bifrost/cicd/pipeline-runtime';
import type { BifrostCrossingRequest, BifrostDevice, BifrostSession } from './src/bifrost/types';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type EdgeRoute = {
  intent?: string;
  targetNode?: string;
  riskLevel?: 'low' | 'medium' | 'high';
  requiresApproval?: boolean;
  payload?: Record<string, any>;
};

const pendingApprovals = new Map<string, EdgeRoute>();

/**
 * Bifrost state, held in-process for the same reason `pendingApprovals` is:
 * this is the dev/single-instance server. Restarting drops every device
 * heartbeat and live session, and multiple instances do not share state. A
 * deployment with more than one instance must run services/bifrost-broker and
 * point these handlers at it instead.
 *
 * Failing this way is safe rather than convenient: losing heartbeats makes
 * every device look stale, and Heimdall denies crossings to stale devices.
 */
const bifrostDevices = new Map<string, BifrostDevice>(BIFROST_DEVICES.map(d => [d.deviceId, d]));
const bifrostSessions = new Map<string, BifrostSession>();
const pendingCrossings = new Map<string, BifrostCrossingRequest>();
const bifrostJournal = new SessionJournal();
const pipelineRunHistory: PipelineRunRecord[] = [];

function bifrostSigningSecret(): string | undefined {
  return process.env.CAMELOT_SIGNING_SECRET;
}

function currentDevices(): BifrostDevice[] {
  return Array.from(bifrostDevices.values());
}

function currentSessions(): BifrostSession[] {
  return Array.from(bifrostSessions.values());
}

function createCommandId(prefix = 'cmd') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function edgeResponse(route: EdgeRoute, targetNode: string, message: string) {
  const commandId = createCommandId(targetNode);
  if (route.requiresApproval) {
    pendingApprovals.set(commandId, route);
    return {
      accepted: true,
      status: 'approval_required',
      commandId,
      targetNode,
      message: `${message}. Approval required before execution.`,
      route,
    };
  }

  return {
    accepted: true,
    status: 'queued',
    commandId,
    targetNode,
    message,
    route,
  };
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);
  const HOST = process.env.HOST || '::';

  app.use(cookieSession({
    name: 'session',
    keys: [process.env.SESSION_SECRET || 'persona-live-secret'],
    maxAge: 24 * 60 * 60 * 1000,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    httpOnly: true,
  }));

  app.use(express.json({ limit: '10mb' }));

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.APP_URL || `http://localhost:${PORT}`}/auth/google/callback`
  );

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'multivoice-router', mode: process.env.NODE_ENV || 'development' });
  });

  app.get('/api/auth/google/url', (_req, res) => {
    const scopes = [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/documents',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ];

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
    });

    res.json({ url });
  });

  app.get(['/auth/google/callback', '/auth/google/callback/'], async (req, res) => {
    const { code } = req.query;
    try {
      const { tokens } = await oauth2Client.getToken(code as string);
      (req as any).session.tokens = tokens;

      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', provider: 'google' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. You can close this window.</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('Google OAuth Error:', error);
      res.status(500).send('Authentication failed');
    }
  });

  app.get('/api/auth/status', (req, res) => {
    res.json({ google: !!(req as any).session?.tokens });
  });

  app.post('/api/auth/logout', (req, res) => {
    (req as any).session = null;
    res.json({ success: true });
  });

  app.post('/api/bridge/query', async (req, res) => {
    const { ip, port, protocol, path: bridgePath, method, data } = req.body;
    if (!ip) return res.status(400).json({ error: 'Bridge IP is required' });

    const targetUrl = `${protocol || 'http'}://${ip}:${port || 80}${bridgePath || '/'}`;

    try {
      const response = await fetch(targetUrl, {
        method: method || 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: data ? JSON.stringify(data) : undefined,
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        return res.status(response.status).json({
          error: `Bridge returned error: ${response.statusText}`,
          details: await response.text(),
        });
      }

      const result = await response.json();
      res.json(result);
    } catch (error) {
      console.error('Bridge Query Error:', error);
      res.status(500).json({
        error: 'Failed to reach bridge',
        message: error instanceof Error ? error.message : 'Unknown error',
        hint: `Ensure Tailscale is connected and the bridge is reachable at ${targetUrl}`,
      });
    }
  });

  app.get('/api/bridge/status/:ip', async (req, res) => {
    const { ip } = req.params;
    const { port, protocol } = req.query;
    const targetUrl = `${protocol || 'http'}://${ip}:${port || 80}/health`;

    try {
      const response = await fetch(targetUrl, { signal: AbortSignal.timeout(2000) });
      res.json({ online: response.ok });
    } catch (_e) {
      res.json({ online: false });
    }
  });

  app.get('/api/tailscale/devices', async (_req, res) => {
    const apiKey = process.env.TAILSCALE_API_KEY;
    const tailnet = process.env.TAILSCALE_TAILNET;

    if (!apiKey || !tailnet) {
      return res.status(400).json({
        error: 'Tailscale API not configured',
        details: 'Missing TAILSCALE_API_KEY or TAILSCALE_TAILNET in environment variables.',
      });
    }

    try {
      const auth = Buffer.from(`${apiKey}:`).toString('base64');
      const response = await fetch(`https://api.tailscale.com/api/v2/tailnet/${tailnet}/devices`, {
        headers: { Authorization: `Basic ${auth}` },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Tailscale API error [${response.status}]:`, errorText);
        return res.status(response.status).json({
          error: `Tailscale API Error: ${response.statusText}`,
          details: errorText,
        });
      }

      const data = await response.json();
      res.json(data.devices || []);
    } catch (error) {
      console.error('Tailscale Network Error:', error);
      res.status(500).json({ error: 'Failed to connect to Tailscale API' });
    }
  });

  app.post('/api/edge/android', async (req, res) => {
    res.json(edgeResponse(req.body, 'phoneclaw', 'Android task routed to PhoneClaw'));
  });

  app.post('/api/edge/browser', async (req, res) => {
    res.json(edgeResponse(req.body, 'superpowers_chrome', 'Browser task routed to superpowers-chrome'));
  });

  app.post('/api/edge/cli', async (req, res) => {
    res.json(edgeResponse(req.body, 'termux', 'CLI task routed to Termux'));
  });

  app.post('/api/edge/rescue', async (req, res) => {
    res.json(edgeResponse(req.body, 'rustdesk', 'RustDesk rescue route prepared'));
  });

  app.post('/api/edge/conversation', async (req, res) => {
    res.json({ accepted: true, status: 'executed', targetNode: 'gemini', message: 'Conversation remains inside Gemini Live', route: req.body });
  });

  app.get('/api/edge/approvals', (_req, res) => {
    res.json(Array.from(pendingApprovals.entries()).map(([commandId, route]) => ({ commandId, route })));
  });

  app.post('/api/edge/approval', async (req, res) => {
    const { commandId, decision } = req.body;
    if (!commandId || !pendingApprovals.has(commandId)) {
      return res.status(404).json({ accepted: false, status: 'error', message: 'Approval command not found' });
    }

    const route = pendingApprovals.get(commandId)!;
    pendingApprovals.delete(commandId);

    if (decision !== 'approved') {
      return res.json({ accepted: true, status: 'blocked', commandId, targetNode: route.targetNode, message: 'Command rejected by approval gate', route });
    }

    return res.json({ accepted: true, status: 'queued', commandId, targetNode: route.targetNode, message: 'Command approved and queued for execution', route });
  });

  // --- Bifrost Bridge (Sir Heimdall) ------------------------------------
  //
  // Crossing requests never carry their own approval. A caller cannot set
  // `approved` — high-risk crossings are parked here and must be resolved
  // through /api/bifrost/crossing/approve, mirroring the edge approval flow.

  app.get('/api/bifrost/transports', (_req, res) => {
    res.json(BIFROST_TRANSPORTS);
  });

  app.get('/api/bifrost/devices', (_req, res) => {
    const now = new Date();
    res.json(
      currentDevices().map(device => ({
        ...device,
        heartbeatFresh: isHeartbeatFresh(device, now),
      }))
    );
  });

  app.post('/api/bifrost/heartbeat', (req, res) => {
    const { deviceId, gatekeeperFingerprint } = req.body || {};
    const device = deviceId ? bifrostDevices.get(deviceId) : undefined;

    if (!device) {
      return res.status(404).json({ ok: false, error: `Unknown device '${deviceId}'.` });
    }

    // Server time, never the node's self-reported clock.
    const updated = applyHeartbeat(device, new Date(), gatekeeperFingerprint);
    bifrostDevices.set(updated.deviceId, updated);
    res.json({ ok: true, deviceId: updated.deviceId, lastHeartbeatAt: updated.lastHeartbeatAt });
  });

  app.post('/api/bifrost/crossing', async (req, res) => {
    const secret = bifrostSigningSecret();
    if (!secret) {
      return res.status(500).json({ ok: false, error: 'CAMELOT_SIGNING_SECRET is not configured.' });
    }

    const request: BifrostCrossingRequest = {
      requestId: `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      deviceId: req.body?.deviceId,
      transport: req.body?.transport,
      fidelity: req.body?.fidelity,
      scopes: Array.isArray(req.body?.scopes) ? req.body.scopes : [],
      purpose: req.body?.purpose || '',
      requestedBy: req.body?.requestedBy || 'dashboard',
      requestedTtlSeconds: req.body?.requestedTtlSeconds,
      source: 'dashboard',
    };

    if (!request.deviceId || !request.transport || !request.fidelity || !request.purpose) {
      return res.status(400).json({
        ok: false,
        error: 'deviceId, transport, fidelity and purpose are required.',
      });
    }

    const result = await runBifrostCrossing({
      request,
      signingSecret: secret,
      devices: currentDevices(),
      sessions: currentSessions(),
      // Approval is never taken from the request body.
      approved: false,
    });

    if (result.stage === 'HITL_GATE') {
      pendingCrossings.set(request.requestId, request);
      return res.json({ ...result, crossingId: request.requestId });
    }

    if (result.ok && result.session) {
      bifrostSessions.set(result.session.envelope.sessionId, result.session);
    }

    res.status(result.ok ? 200 : 403).json(result);
  });

  app.get('/api/bifrost/crossing/pending', (_req, res) => {
    res.json(Array.from(pendingCrossings.entries()).map(([crossingId, request]) => ({ crossingId, request })));
  });

  app.post('/api/bifrost/crossing/approve', async (req, res) => {
    const secret = bifrostSigningSecret();
    if (!secret) {
      return res.status(500).json({ ok: false, error: 'CAMELOT_SIGNING_SECRET is not configured.' });
    }

    const { crossingId, decision, resolvedBy } = req.body || {};
    const request = crossingId ? pendingCrossings.get(crossingId) : undefined;

    if (!request) {
      return res.status(404).json({ ok: false, error: 'Pending crossing not found.' });
    }

    pendingCrossings.delete(crossingId);

    if (decision !== 'approved') {
      return res.json({ ok: false, status: 'blocked', crossingId, message: 'Crossing denied at the approval gate.' });
    }

    // Re-run the full pipeline. Approval authorizes the crossing; it does not
    // skip Gjallarhorn or Heimdall, so anything that changed since the request
    // was parked is re-evaluated here.
    const result = await runBifrostCrossing({
      request,
      signingSecret: secret,
      devices: currentDevices(),
      sessions: currentSessions(),
      approved: true,
      context: { signedBy: resolvedBy || 'operator' },
    });

    if (result.ok && result.session) {
      bifrostSessions.set(result.session.envelope.sessionId, result.session);
    }

    res.status(result.ok ? 200 : 403).json(result);
  });

  app.get('/api/bifrost/sessions', (_req, res) => {
    res.json(currentSessions());
  });

  app.post('/api/bifrost/sessions/revoke', (req, res) => {
    const { sessionId, reason } = req.body || {};
    const session = sessionId ? bifrostSessions.get(sessionId) : undefined;

    if (!session) {
      return res.status(404).json({ ok: false, error: 'Unknown session.' });
    }

    const revoked = forceRevoke(session, reason || 'revoked_by_operator');
    bifrostSessions.set(sessionId, revoked);
    res.json({ ok: true, session: revoked });
  });

  /** Run one supervisor tick: expire, reap, degrade and alarm. */
  app.post('/api/bifrost/supervisor/tick', (req, res) => {
    const tick = tickBifrostSupervisor({
      devices: currentDevices(),
      sessions: currentSessions(),
      observations: Array.isArray(req.body?.observations) ? req.body.observations : undefined,
      unhealthyTransports: Array.isArray(req.body?.unhealthyTransports) ? req.body.unhealthyTransports : undefined,
    });

    for (const session of tick.sessions) {
      bifrostSessions.set(session.envelope.sessionId, session);
    }

    res.json(tick);
  });

  // --- Per-node desktop provisioning ------------------------------------

  app.post('/api/bifrost/provision', (req, res) => {
    const { sessionId, capability, link, hostAddress, preferred, teardown } = req.body || {};
    const session = sessionId ? bifrostSessions.get(sessionId) : undefined;

    if (!session) {
      return res.status(404).json({ ok: false, error: 'Unknown session.' });
    }

    try {
      const plan = teardown
        ? buildTeardownPlan(session.envelope)
        : buildProvisioningPlan({ envelope: session.envelope, capability, link, hostAddress, preferred });

      bifrostJournal.append({
        kind: 'session_provisioned',
        actor: 'server',
        summary: `${plan.steps.length} provisioning step(s) for ${plan.transport}`,
        sessionId: session.envelope.sessionId,
        deviceId: session.envelope.deviceId,
        transport: session.envelope.transport,
        scopes: session.envelope.scopes,
        detail: { steps: plan.steps.map(s => s.verb), teardown: Boolean(teardown) },
      });

      res.json({ ok: true, plan });
    } catch (error: any) {
      res.status(400).json({ ok: false, error: error?.message || String(error) });
    }
  });

  // --- Monitoring --------------------------------------------------------

  app.post('/api/bifrost/telemetry', (req, res) => {
    const report = req.body;
    if (!report?.deviceId || !report?.link) {
      return res.status(400).json({ ok: false, error: 'deviceId and link are required.' });
    }

    const session = report.sessionId ? bifrostSessions.get(report.sessionId) : undefined;
    const assessment = assessTelemetry(report);
    const alarms = telemetryAlarms(report, session?.envelope.scopes || []);

    bifrostJournal.append({
      kind: 'telemetry_sampled',
      actor: report.deviceId,
      summary: `health=${assessment.health} score=${assessment.score}`,
      sessionId: report.sessionId,
      deviceId: report.deviceId,
      detail: { findings: assessment.findings, alarms: alarms.map(a => a.rule) },
    });

    res.json({ ok: true, assessment, alarms });
  });

  app.get('/api/bifrost/journal', (req, res) => {
    const tenant = typeof req.query.tenant === 'string' ? req.query.tenant : undefined;
    res.json({
      ok: true,
      entries: tenant ? bifrostJournal.forTenant(tenant) : bifrostJournal.all(),
      head: bifrostJournal.head(),
    });
  });

  app.get('/api/bifrost/journal/verify', (_req, res) => {
    const verification = bifrostJournal.verify();
    res.status(verification.ok ? 200 : 409).json({ ok: verification.ok, verification });
  });

  // --- Camelot Defense Redteam ------------------------------------------

  app.post('/api/bifrost/redteam', (req, res) => {
    const report = runRedteam(
      {
        devices: currentDevices(),
        sessions: currentSessions(),
        journal: bifrostJournal.all(),
        // The current design shares one symmetric secret across every node.
        sharedSigningSecret: true,
      },
      { only: Array.isArray(req.body?.only) ? req.body.only : undefined, minSeverity: req.body?.minSeverity }
    );

    for (const critical of report.findings.filter(f => f.severity === 'critical')) {
      bifrostJournal.append({
        kind: 'redteam_finding',
        actor: 'camelot_redteam',
        summary: critical.title,
        deviceId: critical.deviceId,
        sessionId: critical.sessionId,
        detail: { probeId: critical.probeId, remediation: critical.remediation },
      });
    }

    res.json({
      ok: report.ok,
      report,
      alarms: redteamAlarms(report),
      text: req.body?.format === 'text' ? formatRedteamReport(report) : undefined,
    });
  });

  // --- Private CI/CD -----------------------------------------------------

  app.post('/api/bifrost/pipelines/authorize', (req, res) => {
    const secret = bifrostSigningSecret();
    if (!secret) {
      return res.status(500).json({ ok: false, error: 'CAMELOT_SIGNING_SECRET is not configured.' });
    }

    const { pipeline, limits, approvedBy } = req.body || {};
    if (!pipeline || !limits || !approvedBy) {
      return res.status(400).json({ ok: false, error: 'pipeline, limits and approvedBy are required.' });
    }

    const issued = authorizePipeline({ pipeline, limits, approvedBy, secret });
    if (!issued.ok) {
      return res.status(400).json({ ok: false, errors: issued.errors });
    }

    bifrostJournal.append({
      kind: 'crossing_approved',
      actor: approvedBy,
      summary: `Pipeline '${pipeline.pipelineId}' authorized`,
      tenantId: pipeline.tenantId,
      detail: { grantId: issued.grant!.grantId, pipelineHash: issued.grant!.pipelineHash },
    });

    res.json({ ok: true, grant: issued.grant });
  });

  app.post('/api/bifrost/pipelines/plan', (req, res) => {
    const secret = bifrostSigningSecret();
    if (!secret) {
      return res.status(500).json({ ok: false, error: 'CAMELOT_SIGNING_SECRET is not configured.' });
    }

    const { pipeline, grant } = req.body || {};
    if (!pipeline || !grant) {
      return res.status(400).json({ ok: false, error: 'pipeline and grant are required.' });
    }

    const plan = planPipelineRun({
      pipeline,
      grant,
      secret,
      devices: currentDevices(),
      recentRuns: pipelineRunHistory,
    });

    res.status(plan.ok ? 200 : 400).json(plan);
  });

  app.post('/api/bifrost/pipelines/run', async (req, res) => {
    const secret = bifrostSigningSecret();
    if (!secret) {
      return res.status(500).json({ ok: false, error: 'CAMELOT_SIGNING_SECRET is not configured.' });
    }

    const { pipeline, grant } = req.body || {};
    if (!pipeline || !grant) {
      return res.status(400).json({ ok: false, error: 'pipeline and grant are required.' });
    }

    const result = await executePipelineRun({
      pipeline,
      grant,
      secret,
      signingSecret: secret,
      devices: currentDevices(),
      sessions: currentSessions(),
      recentRuns: pipelineRunHistory,
    });

    // Only a run that actually opened a crossing counts against the rate limit.
    if (result.outcomes.length > 0) {
      pipelineRunHistory.push({
        runId: result.runId,
        pipelineId: result.pipelineId,
        tenantId: result.tenantId,
        startedAt: result.startedAt,
      });
    }

    for (const outcome of result.outcomes) {
      bifrostJournal.append({
        kind: 'pipeline_step',
        actor: `pipeline:${result.pipelineId}`,
        summary: `stage ${outcome.stageId} → ${outcome.stage}`,
        tenantId: result.tenantId,
        deviceId: outcome.deviceId,
        sessionId: outcome.sessionId,
        detail: { ok: outcome.ok, errors: outcome.errors },
      });
    }

    res.status(result.ok ? 200 : 400).json(result);
  });

  app.get('/api/google/drive/files', async (req, res) => {
    const tokens = (req as any).session?.tokens;
    if (!tokens) return res.status(401).json({ error: 'Not authenticated' });

    oauth2Client.setCredentials(tokens);
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    try {
      const response = await drive.files.list({
        pageSize: 20,
        fields: 'nextPageToken, files(id, name, mimeType)',
        q: "mimeType = 'application/vnd.google-apps.document' or mimeType = 'text/plain' or mimeType = 'application/pdf'",
      });
      res.json(response.data.files);
    } catch (error) {
      console.error('Drive API Error:', error);
      res.status(500).json({ error: 'Failed to fetch files' });
    }
  });

  app.get('/api/google/drive/file/:fileId', async (req, res) => {
    const tokens = (req as any).session?.tokens;
    if (!tokens) return res.status(401).json({ error: 'Not authenticated' });

    oauth2Client.setCredentials(tokens);
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    const { fileId } = req.params;

    try {
      const file = await drive.files.get({ fileId, fields: 'name, mimeType' });
      let content = '';

      if (file.data.mimeType === 'application/vnd.google-apps.document') {
        const docResponse = await drive.files.export({ fileId, mimeType: 'text/plain' });
        content = docResponse.data as string;
      } else {
        const docResponse = await drive.files.get({ fileId, alt: 'media' });
        content = docResponse.data as string;
      }

      res.json({ name: file.data.name, content });
    } catch (error) {
      console.error('Drive File Error:', error);
      res.status(500).json({ error: 'Failed to fetch file content' });
    }
  });

  app.post('/api/google/notebook/append', async (req, res) => {
    const tokens = (req as any).session?.tokens;
    if (!tokens) return res.status(401).json({ error: 'Not authenticated' });

    const { docId, content } = req.body;
    if (!docId || !content) return res.status(400).json({ error: 'docId and content required' });

    oauth2Client.setCredentials(tokens);
    const docs = google.docs({ version: 'v1', auth: oauth2Client });

    try {
      await docs.documents.batchUpdate({
        documentId: docId,
        requestBody: {
          requests: [{
            insertText: {
              location: { index: 1 },
              text: `\n\n[CLOUD BRAIN LOG - ${new Date().toISOString()}]\n${content}\n`,
            },
          }],
        },
      });
      res.json({ success: true });
    } catch (error) {
      console.error('Notebook Append Error:', error);
      res.status(500).json({ error: 'Failed to append to notebook' });
    }
  });

  app.post('/api/google/notebook/create', async (req, res) => {
    const tokens = (req as any).session?.tokens;
    if (!tokens) return res.status(401).json({ error: 'Not authenticated' });

    const { title } = req.body;

    oauth2Client.setCredentials(tokens);
    const docs = google.docs({ version: 'v1', auth: oauth2Client });

    try {
      const doc = await docs.documents.create({ requestBody: { title: title || 'Persona Cloud Brain' } });
      res.json({ docId: doc.data.documentId, title: doc.data.title });
    } catch (error) {
      console.error('Notebook Create Error:', error);
      res.status(500).json({ error: 'Failed to create notebook' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`Multivoice Router running on http://localhost:${PORT}`);
  });
}

startServer();
