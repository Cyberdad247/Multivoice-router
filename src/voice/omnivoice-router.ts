import { VoiceMode, VoiceProfile, getVoiceProfile } from './voice-profile-registry';

export type VoiceCostTier = 'cache' | 'local_free' | 'remote_free' | 'paid' | 'transcript_only';
export type VoiceRenderDestination = 'local_playback' | 'dashboard' | 'download' | 'external_publish' | 'message_send';

export interface VoiceBudgetPolicy {
  allowPaid: boolean;
  maxEstimatedCostUsd: number;
  requireApprovalForPaid: boolean;
  preferLocal: boolean;
}

export interface VoiceRenderRequest {
  speakerId: string;
  text: string;
  mode: VoiceMode;
  destination: VoiceRenderDestination;
  approvedForPaid?: boolean;
  budget?: Partial<VoiceBudgetPolicy>;
}

export interface VoiceRenderPlan {
  speaker: VoiceProfile;
  normalizedText: string;
  cacheKey: string;
  selectedTier: VoiceCostTier;
  selectedEngine: string;
  estimatedCostUsd: number;
  requiresApproval: boolean;
  transcript: string;
  audioRef?: string;
  reason: string;
}

const DEFAULT_POLICY: VoiceBudgetPolicy = {
  allowPaid: false,
  maxEstimatedCostUsd: 0,
  requireApprovalForPaid: true,
  preferLocal: true,
};

const LOCAL_ENGINES = ['kokoro_onnx', 'piper', 'browser_speech_synthesis', 'android_system_tts'];
const REMOTE_FREE_ENGINES = ['omniroute_free_voice', 'free_tts_endpoint'];
const PAID_ENGINES = ['suno', 'udio', 'notebooklm_audio', 'premium_cloud_tts'];

function normalizeText(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

function hashKey(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash |= 0;
  }
  return `voice_cache_${Math.abs(hash).toString(16)}`;
}

function estimatePaidCost(text: string, mode: VoiceMode) {
  const chars = text.length;
  const base = mode === 'podcast' ? 0.25 : 0.03;
  return Number((base + (chars / 10000) * 0.10).toFixed(4));
}

function isExternalDestination(destination: VoiceRenderDestination) {
  return destination === 'external_publish' || destination === 'message_send';
}

export function planVoiceRender(request: VoiceRenderRequest, cacheHasKey = false): VoiceRenderPlan {
  const speaker = getVoiceProfile(request.speakerId);
  if (!speaker) throw new Error(`Unknown voice speaker: ${request.speakerId}`);

  const normalizedText = normalizeText(request.text);
  const cacheKey = hashKey(`${speaker.speakerId}:${request.mode}:${normalizedText}`);
  const policy = { ...DEFAULT_POLICY, ...(request.budget || {}) };

  if (cacheHasKey) {
    return {
      speaker,
      normalizedText,
      cacheKey,
      selectedTier: 'cache',
      selectedEngine: 'voice_cache',
      estimatedCostUsd: 0,
      requiresApproval: false,
      transcript: normalizedText,
      audioRef: `cache://${cacheKey}`,
      reason: 'Cached audio exists. No generation required.'
    };
  }

  if (policy.preferLocal) {
    const localEngine = LOCAL_ENGINES.includes(speaker.engine) ? speaker.engine : LOCAL_ENGINES[0];
    return {
      speaker,
      normalizedText,
      cacheKey,
      selectedTier: 'local_free',
      selectedEngine: localEngine,
      estimatedCostUsd: 0,
      requiresApproval: false,
      transcript: normalizedText,
      reason: 'Local/free TTS selected by default to avoid surprise billing.'
    };
  }

  const paidEstimate = estimatePaidCost(normalizedText, request.mode);
  const paidNeeded = PAID_ENGINES.includes(speaker.engine) || request.mode === 'podcast' || isExternalDestination(request.destination);

  if (paidNeeded) {
    const allowed = policy.allowPaid && request.approvedForPaid && paidEstimate <= policy.maxEstimatedCostUsd;
    if (!allowed) {
      return {
        speaker,
        normalizedText,
        cacheKey,
        selectedTier: 'transcript_only',
        selectedEngine: 'none',
        estimatedCostUsd: paidEstimate,
        requiresApproval: true,
        transcript: normalizedText,
        reason: 'Paid or external voice render requires approval. Returning transcript fallback.'
      };
    }

    return {
      speaker,
      normalizedText,
      cacheKey,
      selectedTier: 'paid',
      selectedEngine: speaker.engine,
      estimatedCostUsd: paidEstimate,
      requiresApproval: false,
      transcript: normalizedText,
      reason: 'Paid voice render approved within budget policy.'
    };
  }

  return {
    speaker,
    normalizedText,
    cacheKey,
    selectedTier: 'remote_free',
    selectedEngine: REMOTE_FREE_ENGINES[0],
    estimatedCostUsd: 0,
    requiresApproval: false,
    transcript: normalizedText,
    reason: 'Remote free voice lane selected.'
  };
}

export function buildVoiceReceipt(plan: VoiceRenderPlan) {
  return {
    speakerId: plan.speaker.speakerId,
    knightId: plan.speaker.knightId,
    engine: plan.selectedEngine,
    tier: plan.selectedTier,
    estimatedCostUsd: plan.estimatedCostUsd,
    requiresApproval: plan.requiresApproval,
    cacheKey: plan.cacheKey,
    reason: plan.reason,
  };
}
