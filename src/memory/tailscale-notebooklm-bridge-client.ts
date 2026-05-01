export type BridgeConfidence = 'source_grounded' | 'partial' | 'unknown';

export interface BridgeRequestEnvelope<T = Record<string, unknown>> {
  requestId: string;
  orgId?: string;
  actor: string;
  action: string;
  riskClass: 'L0_OBSERVE' | 'L1_DRAFT' | 'L2_SAFE_EXECUTE' | 'L3_GUARDED_WRITE' | 'L4_HIGH_RISK' | 'L5_FORBIDDEN';
  payload: T;
  signature?: string;
}

export interface BridgeResponseEnvelope<T = Record<string, unknown>> {
  ok: boolean;
  requestId: string;
  status: 'queued' | 'running' | 'complete' | 'failed' | 'blocked';
  data?: T;
  confidence?: BridgeConfidence;
  memoryRefs?: string[];
  error?: string | null;
}

export interface TailscaleNotebookLmBridgeClientConfig {
  baseUrl: string;
  timeoutMs?: number;
  sharedSecret?: string;
}

export class TailscaleNotebookLmBridgeClient {
  constructor(private config: TailscaleNotebookLmBridgeClientConfig) {}

  private async post<TPayload, TData = Record<string, unknown>>(
    path: string,
    envelope: BridgeRequestEnvelope<TPayload>
  ): Promise<BridgeResponseEnvelope<TData>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs || 30000);
    try {
      const res = await fetch(`${this.config.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(this.config.sharedSecret ? { 'x-camelot-bridge-secret': this.config.sharedSecret } : {}),
        },
        body: JSON.stringify(envelope),
        signal: controller.signal,
      });
      const json = await res.json();
      if (!res.ok) {
        return { ok: false, requestId: envelope.requestId, status: 'failed', error: json?.error || res.statusText };
      }
      return json;
    } finally {
      clearTimeout(timeout);
    }
  }

  async health() {
    const res = await fetch(`${this.config.baseUrl}/health`);
    return res.json();
  }

  async authCheck(requestId = `auth_${Date.now()}`) {
    return this.post('/auth/check', {
      requestId,
      actor: 'sir_mnemo',
      action: 'auth_check',
      riskClass: 'L0_OBSERVE',
      payload: {},
    });
  }

  async query(input: { requestId: string; orgId?: string; notebookId: string; question: string }) {
    return this.post('/query', {
      requestId: input.requestId,
      orgId: input.orgId,
      actor: 'sir_mnemo',
      action: 'query',
      riskClass: 'L1_DRAFT',
      payload: { notebookId: input.notebookId, question: input.question },
    });
  }

  async addTextSource(input: { requestId: string; orgId?: string; notebookId: string; title: string; text: string }) {
    return this.post('/sources/add-text', {
      requestId: input.requestId,
      orgId: input.orgId,
      actor: 'ouroboros',
      action: 'add_text_source',
      riskClass: 'L2_SAFE_EXECUTE',
      payload: { notebookId: input.notebookId, title: input.title, text: input.text },
    });
  }

  async createAudio(input: { requestId: string; orgId?: string; notebookId: string; instructions?: string; approved?: boolean }) {
    return this.post('/studio/audio', {
      requestId: input.requestId,
      orgId: input.orgId,
      actor: 'sir_sonus',
      action: 'create_audio',
      riskClass: input.approved ? 'L2_SAFE_EXECUTE' : 'L3_GUARDED_WRITE',
      payload: { notebookId: input.notebookId, instructions: input.instructions, approved: Boolean(input.approved) },
    });
  }
}
