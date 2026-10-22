/**
 * Mistral Voxtral provider tests: config hygiene, request shape,
 * Bifrost-bridge-first transport with direct fallback, knight wiring.
 * All network is faked — no live Mistral calls in CI.
 */
import { describe, it, expect } from 'vitest';
import {
  resolveMistralConfig,
  mistralStatus,
  buildSpeechRequestBody,
  getKnightMistralVoice,
  resolveKnightVoiceId,
  synthesizeSpeech,
  transcribeAudio,
  estimateTtsCostUsd,
  MISTRAL_TTS_MODEL,
  MISTRAL_STT_MODEL,
  type FetchLike,
  type MistralVoiceConfig,
} from '../mistral-voxtral';
import { planVoiceRender } from '../omnivoice-router';
import { getVoiceProfile } from '../voice-profile-registry';

const SECRET = 'test-secret-key-do-not-leak';

function cfg(overrides: Partial<MistralVoiceConfig> = {}): MistralVoiceConfig {
  return {
    apiKey: SECRET,
    bifrostBaseUrl: 'http://127.0.0.1:8180',
    directBaseUrl: 'https://api.mistral.ai/v1',
    ttsModel: MISTRAL_TTS_MODEL,
    sttModel: MISTRAL_STT_MODEL,
    timeoutMs: 5000,
    ...overrides,
  };
}

function fakeRes(opts: { ok?: boolean; status?: number; jsonBody?: unknown; raw?: Buffer; textBody?: string }) {
  const raw = opts.raw ?? Buffer.from(JSON.stringify(opts.jsonBody ?? {}));
  return {
    ok: opts.ok ?? true,
    status: opts.status ?? 200,
    json: async () => opts.jsonBody ?? JSON.parse(raw.toString('utf8')),
    arrayBuffer: async () => raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength),
    text: async () => opts.textBody ?? raw.toString('utf8'),
  };
}

describe('config + status hygiene', () => {
  it('resolves defaults and env overrides', () => {
    const c = resolveMistralConfig({ MISTRAL_API_KEY: SECRET, BIFROST_BRIDGE_URL: 'http://100.92.0.44:8180/' });
    expect(c.ttsModel).toBe('voxtral-mini-tts-2603');
    expect(c.sttModel).toBe('voxtral-mini-2602');
    expect(c.bifrostBaseUrl).toBe('http://100.92.0.44:8180');
  });

  it('status never contains the API key value', () => {
    const status = mistralStatus(cfg());
    expect(status.configured).toBe(true);
    expect(JSON.stringify(status)).not.toContain(SECRET);
    expect(status.knights.map((k) => k.knightId)).toEqual(['heimdall', 'hermes']);
  });
});

describe('speech request shape', () => {
  it('uses voice_id (not voice) and defaults to the documented alias', () => {
    const body = buildSpeechRequestBody({ text: 'Hail, bridge watcher.', model: MISTRAL_TTS_MODEL });
    expect(body.voice_id).toBe('en_paul_neutral');
    expect((body as unknown as Record<string, unknown>).voice).toBeUndefined();
    expect(body.stream).toBe(false);
  });

  it('ref_audio replaces voice_id (exactly one of the two)', () => {
    const body = buildSpeechRequestBody({ text: 'Clone me.', model: MISTRAL_TTS_MODEL, refAudio: 'QUJD' });
    expect(body.ref_audio).toBe('QUJD');
    expect(body.voice_id).toBeUndefined();
  });
});

describe('knight wiring (Heimdall + Hermes)', () => {
  it('resolves both knights, with or without the Sir prefix', () => {
    expect(getKnightMistralVoice('heimdall')?.displayName).toBe('Sir Heimdall');
    expect(getKnightMistralVoice('Sir Heimdall')?.speakerId).toBe('heimdall_bridge_watcher');
    expect(getKnightMistralVoice('hermes')?.displayName).toBe('Sir Hermes');
    expect(getKnightMistralVoice('gawain')).toBeUndefined();
  });

  it('per-knight voice can be overridden by env (Studio preset UUID)', () => {
    expect(resolveKnightVoiceId('heimdall', { MISTRAL_VOICE_HEIMDALL: 'uuid-preset-1' })).toBe('uuid-preset-1');
    expect(resolveKnightVoiceId('hermes', {})).toBe('en_paul_neutral');
  });

  it('both knights are registered voice profiles on the mistral engine', () => {
    expect(getVoiceProfile('heimdall_bridge_watcher')?.engine).toBe('mistral_voxtral');
    expect(getVoiceProfile('hermes_control_plane')?.engine).toBe('mistral_voxtral');
  });

  it('omnivoice policy treats mistral_voxtral as paid: approval required', () => {
    const plan = planVoiceRender({
      speakerId: 'heimdall_bridge_watcher',
      text: 'The bridge is open.',
      mode: 'single',
      destination: 'dashboard',
      budget: { preferLocal: false },
    });
    expect(plan.requiresApproval).toBe(true);
    expect(plan.selectedTier).toBe('transcript_only');
    const approved = planVoiceRender({
      speakerId: 'heimdall_bridge_watcher',
      text: 'The bridge is open.',
      mode: 'single',
      destination: 'dashboard',
      approvedForPaid: true,
      budget: { preferLocal: false, allowPaid: true, maxEstimatedCostUsd: 1 },
    });
    expect(approved.selectedTier).toBe('paid');
    expect(approved.selectedEngine).toBe('mistral_voxtral');
  });
});

describe('synthesizeSpeech transport', () => {
  it('goes through the Bifrost bridge first with a mistral/ model prefix', async () => {
    const seen: { url: string; body: Record<string, unknown> }[] = [];
    const audioB64 = Buffer.from('fake-mp3').toString('base64');
    const fetchImpl: FetchLike = async (url, init) => {
      seen.push({ url, body: JSON.parse(String((init as { body: string }).body)) });
      return fakeRes({ jsonBody: { audio_data: audioB64 } });
    };
    const out = await synthesizeSpeech(cfg(), { text: 'Hello', knightId: 'heimdall', env: {} }, fetchImpl);
    expect(out.transport).toBe('bifrost');
    expect(out.audioBase64).toBe(audioB64);
    expect(seen).toHaveLength(1);
    expect(seen[0].url).toBe('http://127.0.0.1:8180/v1/audio/speech');
    expect(seen[0].body.model).toBe(`mistral/${MISTRAL_TTS_MODEL}`);
    expect(seen[0].body.voice_id).toBe('en_paul_neutral');
  });

  it('falls back to direct Mistral when the bridge says Speech is unsupported', async () => {
    const urls: string[] = [];
    const fetchImpl: FetchLike = async (url) => {
      urls.push(url);
      if (url.includes('127.0.0.1')) return fakeRes({ ok: false, status: 501, textBody: 'operation unsupported' });
      return fakeRes({ raw: Buffer.from('ID3-raw-mp3-bytes') });
    };
    const out = await synthesizeSpeech(cfg(), { text: 'Hello', knightId: 'hermes', env: {} }, fetchImpl);
    expect(out.transport).toBe('direct');
    expect(out.audioBase64).toBe(Buffer.from('ID3-raw-mp3-bytes').toString('base64'));
    expect(urls[1]).toBe('https://api.mistral.ai/v1/audio/speech');
  });

  it('does not silently fall back on a real bridge error (429)', async () => {
    const fetchImpl: FetchLike = async () => fakeRes({ ok: false, status: 429, textBody: 'rate limited' });
    await expect(synthesizeSpeech(cfg(), { text: 'Hello' }, fetchImpl)).rejects.toThrow(/Bifrost bridge speech failed \[429\]/);
  });

  it('refuses without a configured key', async () => {
    const fetchImpl: FetchLike = async () => fakeRes({});
    await expect(synthesizeSpeech(cfg({ apiKey: undefined }), { text: 'x' }, fetchImpl)).rejects.toThrow(/not configured/);
  });
});

describe('transcribeAudio transport', () => {
  it('transcribes via the bridge with model mistral/<stt>', async () => {
    const models: string[] = [];
    const fetchImpl: FetchLike = async (_url, init) => {
      const form = (init as { body: FormData }).body;
      models.push(String(form.get('model')));
      return fakeRes({ jsonBody: { text: 'the bridge is open', language: 'en' } });
    };
    const out = await transcribeAudio(cfg(), { audio: Buffer.from('abc') }, fetchImpl);
    expect(out).toEqual({ text: 'the bridge is open', language: 'en', model: MISTRAL_STT_MODEL, transport: 'bifrost' });
    expect(models).toEqual([`mistral/${MISTRAL_STT_MODEL}`]);
  });

  it('falls back to direct Mistral when the bridge fails', async () => {
    let calls = 0;
    const fetchImpl: FetchLike = async () => {
      calls++;
      if (calls === 1) return fakeRes({ ok: false, status: 502, textBody: 'bridge down' });
      return fakeRes({ jsonBody: { text: 'direct transcript' } });
    };
    const out = await transcribeAudio(cfg(), { audio: Buffer.from('abc') }, fetchImpl);
    expect(out.transport).toBe('direct');
    expect(out.text).toBe('direct transcript');
  });
});

describe('cost estimate', () => {
  it('prices TTS at $16 per 1M characters', () => {
    expect(estimateTtsCostUsd('x'.repeat(1_000_000))).toBe(16);
    expect(estimateTtsCostUsd('hello')).toBeGreaterThan(0);
  });
});
