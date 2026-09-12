export interface SuperpowerSkill {
  id: string;
  name: string;
  category: 'engineering' | 'verification' | 'orchestration' | 'devtools';
  description: string;
  phases: string[];
  systemPromptGuideline: string;
  iconName: string;
}

export interface SkillExecutionPhase {
  name: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  output?: string;
  durationMs?: number;
}

export interface SkillExecutionResult {
  skillId: string;
  skillName: string;
  input: string;
  status: 'running' | 'completed' | 'failed';
  phases: SkillExecutionPhase[];
  finalSynthesis: string;
  executionTimeMs: number;
}

export interface SubagentTask {
  id: string;
  name: string;
  goal: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  subagentType: 'code-verifier' | 'researcher' | 'debugger' | 'security-auditor';
  result?: string;
  startedAt: string;
  completedAt?: string;
}

export interface LLMHardwareProfile {
  cpu: string;
  cores: number;
  systemRamGb: number;
  availableRamGb: number;
  gpuName: string;
  vramGb: number;
  memoryBandwidthGbps: number;
  hostType: 'apple-silicon' | 'nvidia-cuda' | 'amd-rocm' | 'cpu-only';
  recommendedModels: RecommendedModelFit[];
}

export interface RecommendedModelFit {
  modelName: string;
  family: string;
  parameters: string;
  quantization: string;
  memoryRequiredGb: number;
  fitScore: number; // 0 - 100
  estimatedTokensPerSec: number;
  status: 'perfect' | 'viable' | 'constrained' | 'impossible';
  backend: 'mlx' | 'ollama' | 'llama.cpp' | 'colibri';
}

export interface BifrostRouteTelemetry {
  routeId: string;
  provider: string;
  model: string;
  endpoint: string;
  status: 'online' | 'degraded' | 'offline';
  avgLatencyMs: number;
  p99LatencyMs: number;
  trafficSharePct: number;
  cacheHitRatePct: number;
  requestsTotal: number;
}

export interface BifrostSemanticCache {
  totalEntries: number;
  hits: number;
  misses: number;
  hitRatePct: number;
  savedTokens: number;
  avgLatencySavingsMs: number;
}

export interface OmniRouteCompressionResult {
  originalLength: number;
  compressedLength: number;
  originalTokens: number;
  compressedTokens: number;
  reductionPercentage: number;
  method: 'rtk_caveman' | 'syntactic_pruning' | 'hybrid';
  originalText: string;
  compressedText: string;
  compressionTimeMs: number;
}

export interface OmniRouteProviderStatus {
  id: string;
  name: string;
  family: string;
  latencyMs: number;
  costPerMillionInput: number;
  quotaRemainingPct: number;
  status: 'healthy' | 'warning' | 'rate-limited' | 'down';
  priorityOrder: number;
}

export interface ColibriTierState {
  engineVersion: string;
  modelName: string;
  totalParameters: string;
  activeParameterSubset: string;
  totalExperts: number;
  activeExpertsPerToken: number;
  expertHeatmap: number[]; // Activity score 0.0 - 1.0 for each expert
  memoryTiers: {
    vram: { usedGb: number; totalGb: number; bandwidthGbps: number };
    hostRam: { usedGb: number; totalGb: number; bandwidthGbps: number };
    nvme: { streamRateGbps: number; ioQueueDepth: number; readHitRatePct: number };
  };
  currentInferenceTokensPerSec: number;
  cacheHitRatio: number;
}

export interface PIDesktopPackageMeta {
  pluginId: string;
  version: string;
  author: string;
  personaName: string;
  voice: string;
  capabilities: string[];
  permissions: string[];
  exportDate: string;
}

export interface RNVoiceEventStream {
  isListening: boolean;
  rmsVolumeDb: number;
  partialResults: string[];
  finalTranscript: string;
  recognizedLocale: string;
  offlineMode: boolean;
  engineBackend: 'apple-sfspeech' | 'google-speech' | 'whisper-offline';
}

export interface VoiceStudioLocalEngine {
  engineName: string;
  modelFamily: 'F5-TTS' | 'StyleTTS2' | 'XTTS-v2' | 'Piper-Neural' | 'Kokoro-82M';
  isLocalOnly: boolean;
  vramUsageMb: number;
  languagesSupported: number;
  zeroShotCloningCapable: boolean;
  sampleReferenceSec: number;
  rtf: number;
  status: 'online' | 'ready' | 'standby';
}

export interface VoiceAssimilationAudit {
  target: string;
  repoUrl: string;
  category: string;
  verdict: 'Adopt' | 'Integrate Bridge' | 'Fork & Refactor' | 'Reference Pattern';
  score: number;
  strengths: string[];
  limitations: string[];
  assimilationStrategy: string;
}

