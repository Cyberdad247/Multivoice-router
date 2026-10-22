/**
 * Mistral Voxtral voice provider for Multivoice-router.
 *
 * "Mitral voice" = Mistral AI's Voxtral family (user's wording, 2026-10-22):
 *   - TTS: voxtral-mini-tts-2603   POST /v1/audio/speech
 *   - STT: voxtral-mini-2602       POST /v1/audio/transcriptions
 * Both model IDs were verified live against the account's /v1/models list
 * on 2026-10-22 (53 models; voxtral-* family present).
 *
 * Routing ("via VPS + Bifrost_Bridge"):
 *   Multivoice server -> Bifrost Bridge / Atom gateway on the Hermes VPS
 *   (maximhq/bifrost, loopback :8180, tailnet http://100.92.0.44:8180)
 *   -> Mistral provider.
 *
 * Honest transport limits (verified in the bifrost upstream source,
 * core/providers/mistral/mistral.go):
 *   - Bifrost's Mistral provider supports chat + transcription, so STT
 *     goes through the bridge as `mistral/<stt-model>`.
 *   - Bifrost's Mistral provider returns Unsupported for Speech, so TTS
 *     tries the bridge first and falls back to the direct Mistral API
 *     (server-side only; the key never reaches the browser) when the
 *     bridge answers 400/404/501 or an "unsupported" error.
 *
 * The API key is read from the server environment only
 * (MISTRAL_API_KEY). Status objects expose presence, never the value.
 *
 * Voxtral is a PAID engine ($16 / 1M chars TTS per Mistral's model card).
 * Callers must pass confirmPaid — the omnivoice policy engine treats
 * 'mistral_voxtral' as a paid engine for the same reason.
 */

export const MISTRAL_TTS_MODEL = 'voxtral-mini-tts-2603';
export const MISTRAL_STT_MODEL = 'voxtral-mini-2602';
export const MISTRAL_REALTIME_STT_MODEL = 'voxtral-mini-transcribe-realtime-2602';
export const MISTRAL_DIRECT_BASE_URL = 'https://api.mistral.ai/v1';
/** Documented named alias accepted by the TTS endpoint (Mastra/LiveKit docs).
 *  The full preset catalogue is UUID-keyed and listed in Mistral Studio;
 *  override per knight via MISTRAL_VOICE_HEIMDALL / MISTRAL_VOICE_HERMES. */
export const MISTRAL_DEFAULT_VOICE_ID = 'en_paul_neutral';

export interface MistralVoiceConfig {
  /** Server-side only. Never serialise this into a status/response object. */
  apiKey?: string;
  /** Bifrost Bridge (Atom) base URL, e.g. http://127.0.0.1:8180 (VPS loopback)
   *  or http://100.92.0.44:8180 (tailnet). No trailing /v1 needed. */
  bifrostBaseUrl?: string;
  directBaseUrl: string;
  ttsModel: string;
  sttModel: string;
  timeoutMs: number;
}

export interface KnightMistralVoice {
  knightId: string;
  speakerId: string;
  displayName: string;
  role: string;
  voiceId: string;
  /** Env var that overrides voiceId with a Studio preset UUID or a clone id. */
  voiceEnvVar: string;
}

export const KNIGHT_MISTRAL_VOICES: KnightMistralVoice[] = [
  {
    knightId: 'heimdall',
    speakerId: 'heimdall_bridge_watcher',
    displayName: 'Sir Heimdall',
    role: 'Bifrost bridge guardian / bridge-triage knight',
    voiceId: MISTRAL_DEFAULT_VOICE_ID,
    voiceEnvVar: 'MISTRAL_VOICE_HEIMDALL',
  },
  {
    knightId: 'hermes',
    speakerId: 'hermes_control_plane',
    displayName: 'Sir Hermes',
    role: 'Hermes VPS control-plane agent (messenger / operator)',
    voiceId: MISTRAL_DEFAULT_VOICE_ID,
    voiceEnvVar: 'MISTRAL_VOICE_HERMES',
  },
];

export function getKnightMistralVoice(knightId: string): KnightMistralVoice | undefined {
  const needle = knightId.toLowerCase().replace(/^sir[_\s-]/, '');
  return KNIGHT_MISTRAL_VOICES.find(
    (k) => k.knightId === needle || k.speakerId === knightId.toLowerCase(),
  );
}

type EnvLike = Record<string, string | undefined>;

export function resolveMistralConfig(env: EnvLike = process.env): MistralVoiceConfig {
  return {
    apiKey: env.MISTRAL_API_KEY || undefined,
    bifrostBaseUrl: (env.BIFROST_BRIDGE_URL || env.ATOM_BASE_URL || '').replace(/\/$/, '') || undefined,
    directBaseUrl: (env.MISTRAL_BASE_URL || MISTRAL_DIRECT_BASE_URL).replace(/\/$/, ''),
    ttsModel: env.MISTRAL_TTS_MODEL || MISTRAL_TTS_MODEL,
    sttModel: env.MISTRAL_STT_MODEL || MISTRAL_STT_MODEL,
    timeoutMs: Number(env.MISTRAL_TIMEOUT_MS || 60_000),
  };
}

export function resolveKnightVoiceId(knightId: string, env: EnvLike = process.env): string {
  const knight = getKnightMistralVoice(knightId);
  if (!knight) return MISTRAL_DEFAULT_VOICE_ID;
  return env[knight.voiceEnvVar] || knight.voiceId;
}

/** Status safe to send to the browser: presence and routing, never secrets. */
export function mistralStatus(config: MistralVoiceConfig) {
  return {
    provider: 'mistral',
    engine: 'mistral_voxtral',
    configured: Boolean(config.apiKey),
    bifrostBridge: {
      configured: Boolean(config.bifrostBaseUrl),
      baseUrl: config.bifrostBaseUrl ?? null,
      sttViaBridge: Boolean(config.bifrostBaseUrl),
      ttsViaBridge:
        'attempted-first; Bifrost Mistral provider does not implement Speech, direct server-side fallback is expected',
    },
    models: { tts: config.ttsModel, stt: config.sttModel, realtimeStt: MISTRAL_REALTIME_STT_MODEL },
    knights: KNIGHT_MISTRAL_VOICES.map((k) => ({
      knightId: k.knightId,
      speakerId: k.speakerId,
      displayName: k.displayName,
      role: k.role,
      voiceEnvVar: k.voiceEnvVar,
    })),
    paid: true,
    note: 'Voxtral TTS is billed per character by Mistral; speak calls require confirmPaid.',
  };
}

export interface SpeechRequestBody {
  model: string;
  input: string;
  voice_id?: string;
  ref_audio?: string;
  response_format: string;
  stream: false;
}

/** Mistral's speech endpoint takes `voice_id` (not OpenAI's `voice`) and
 *  exactly one of voice_id / ref_audio. Verified against the Mistral SDK
 *  SpeechRequest schema. */
export function buildSpeechRequestBody(opts: {
  text: string;
  model: string;
  voiceId?: string;
  refAudio?: string;
  responseFormat?: string;
}): SpeechRequestBody {
  const body: SpeechRequestBody = {
    model: opts.model,
    input: opts.text,
    response_format: opts.responseFormat || 'mp3',
    stream: false,
  };
  if (opts.refAudio) body.ref_audio = opts.refAudio;
  else body.voice_id = opts.voiceId || MISTRAL_DEFAULT_VOICE_ID;
  return body;
}

export type FetchLike = (url: string, init: Record<string, unknown>) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  arrayBuffer: () => Promise<ArrayBuffer>;
  text: () => Promise<string>;
}>;

export interface SpeakResult {
  audioBase64: string;
  mimeType: string;
  model: string;
  voiceId?: string;
  transport: 'bifrost' | 'direct';
}

export interface TranscribeResult {
  text: string;
  language?: string;
  model: string;
  transport: 'bifrost' | 'direct';
}

function mimeForFormat(format: string): string {
  switch (format) {
    case 'wav': return 'audio/wav';
    case 'pcm': return 'audio/pcm';
    case 'flac': return 'audio/flac';
    case 'opus': return 'audio/opus';
    case 'aac': return 'audio/aac';
    default: return 'audio/mpeg';
  }
}

async function parseSpeechResponse(res: Awaited<ReturnType<FetchLike>>, format: string): Promise<{ audioBase64: string; mimeType: string }> {
  // Mistral's non-streaming speech response is JSON { audio_data: <base64> }.
  // Some gateways return raw audio bytes instead — read once, handle both.
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > 0 && buf[0] === 0x7b /* '{' */) {
    try {
      const data = JSON.parse(buf.toString('utf8')) as { audio_data?: string };
      if (data && typeof data.audio_data === 'string') {
        return { audioBase64: data.audio_data, mimeType: mimeForFormat(format) };
      }
    } catch {
      /* not the JSON shape — treat as raw audio */
    }
  }
  return { audioBase64: buf.toString('base64'), mimeType: mimeForFormat(format) };
}

function isUnsupportedSpeech(status: number, bodyText: string): boolean {
  return status === 400 || status === 404 || status === 501 || /unsupported/i.test(bodyText);
}

/**
 * Synthesize speech. Order: Bifrost Bridge (model `mistral/<tts>`) first,
 * direct Mistral second. Throws with the provider's status on total failure;
 * error text never includes the API key.
 */
export async function synthesizeSpeech(
  config: MistralVoiceConfig,
  opts: { text: string; knightId?: string; voiceId?: string; refAudio?: string; responseFormat?: string; env?: EnvLike },
  fetchImpl: FetchLike = fetch as unknown as FetchLike,
): Promise<SpeakResult> {
  if (!config.apiKey) throw new Error('MISTRAL_API_KEY is not configured on the server');
  const format = opts.responseFormat || 'mp3';
  const voiceId = opts.voiceId || (opts.knightId ? resolveKnightVoiceId(opts.knightId, opts.env ?? process.env) : MISTRAL_DEFAULT_VOICE_ID);
  const body = buildSpeechRequestBody({ text: opts.text, model: config.ttsModel, voiceId, refAudio: opts.refAudio, responseFormat: format });
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` };

  if (config.bifrostBaseUrl) {
    const bridgeBody = { ...body, model: `mistral/${config.ttsModel}` };
    try {
      const res = await fetchImpl(`${config.bifrostBaseUrl}/v1/audio/speech`, {
        method: 'POST', headers, body: JSON.stringify(bridgeBody),
        signal: AbortSignal.timeout(config.timeoutMs),
      });
      if (res.ok) {
        const parsed = await parseSpeechResponse(res, format);
        return { ...parsed, model: config.ttsModel, voiceId: body.voice_id, transport: 'bifrost' };
      }
      const errText = await res.text().catch(() => '');
      if (!isUnsupportedSpeech(res.status, errText)) {
        throw new Error(`Bifrost bridge speech failed [${res.status}]: ${errText.slice(0, 300)}`);
      }
      // Unsupported on the bridge is expected (see header note) — fall through.
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('Bifrost bridge speech failed')) throw err;
      // Network/timeout reaching the bridge — fall through to direct.
    }
  }

  const res = await fetchImpl(`${config.directBaseUrl}/audio/speech`, {
    method: 'POST', headers, body: JSON.stringify(body),
    signal: AbortSignal.timeout(config.timeoutMs),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Mistral speech failed [${res.status}]: ${errText.slice(0, 300)}`);
  }
  const parsed = await parseSpeechResponse(res, format);
  return { ...parsed, model: config.ttsModel, voiceId: body.voice_id, transport: 'direct' };
}

/**
 * Transcribe audio. Order: Bifrost Bridge first (Bifrost's Mistral provider
 * implements transcription as `mistral/<stt-model>`), direct second.
 * `formFactory` is injectable for tests (Node's global FormData by default).
 */
export async function transcribeAudio(
  config: MistralVoiceConfig,
  opts: { audio: Buffer; filename?: string; language?: string; mimeType?: string },
  fetchImpl: FetchLike = fetch as unknown as FetchLike,
  formFactory: () => FormData = () => new FormData(),
): Promise<TranscribeResult> {
  if (!config.apiKey) throw new Error('MISTRAL_API_KEY is not configured on the server');
  const filename = opts.filename || 'audio.mp3';

  const buildForm = (model: string): FormData => {
    const form = formFactory();
    const blob = new Blob([new Uint8Array(opts.audio)], { type: opts.mimeType || 'audio/mpeg' });
    form.append('file', blob, filename);
    form.append('model', model);
    if (opts.language) form.append('language', opts.language);
    return form;
  };

  const attempt = async (baseUrl: string, model: string) => {
    const res = await fetchImpl(`${baseUrl}/audio/transcriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.apiKey}` },
      body: buildForm(model),
      signal: AbortSignal.timeout(config.timeoutMs),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`[${res.status}] ${errText.slice(0, 300)}`);
    }
    const data = (await res.json()) as { text?: string; language?: string };
    if (typeof data.text !== 'string') throw new Error('Transcription response had no text field');
    return data;
  };

  if (config.bifrostBaseUrl) {
    try {
      const data = await attempt(`${config.bifrostBaseUrl}/v1`, `mistral/${config.sttModel}`);
      return { text: data.text, language: data.language, model: config.sttModel, transport: 'bifrost' };
    } catch {
      // fall through to direct
    }
  }
  try {
    const data = await attempt(config.directBaseUrl, config.sttModel);
    return { text: data.text, language: data.language, model: config.sttModel, transport: 'direct' };
  } catch (err) {
    throw new Error(`Mistral transcription failed ${err instanceof Error ? err.message : String(err)}`);
  }
}

/** Rough paid-cost estimate for the TTS lane: $16 per 1M characters. */
export function estimateTtsCostUsd(text: string): number {
  return Number(((text.length / 1_000_000) * 16).toFixed(6));
}
