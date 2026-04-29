export type AuroraTokenizerType = 'vqvae' | 'ovis_index';
export type AuroraFusionMode = 'interleave' | 'moe' | 'pooled';
export type AuroraInputKind = 'image' | 'video' | 'screen';

export interface AuroraConfig {
  visionModel: string;
  tokenizerType: AuroraTokenizerType;
  vqCodebookSize?: number;
  maxFrames: number;
  imageResolution: number;
  fusionMode: AuroraFusionMode;
  enableAuxHeads: boolean;
  memoryPaths: {
    l0: string;
    l1: string;
    l2: string;
  };
}

export interface AuroraEncodeRequest {
  inputKind: AuroraInputKind;
  sourceRef: string;
  prompt?: string;
  config?: Partial<AuroraConfig>;
}

export interface AuroraEncodeResult {
  sourceRef: string;
  visualTokensRef: string;
  sceneSummary: string;
  patchIndexRef?: string;
  embeddingRef?: string;
  memoryRefs: {
    l0: string;
    l1: string;
    l2: string;
  };
}

export const DEFAULT_AURORA_CONFIG: AuroraConfig = {
  visionModel: 'vit-base',
  tokenizerType: 'ovis_index',
  maxFrames: 8,
  imageResolution: 336,
  fusionMode: 'interleave',
  enableAuxHeads: true,
  memoryPaths: {
    l0: 'viking://camelot/vision/l0',
    l1: 'viking://camelot/vision/l1',
    l2: 'viking://camelot/vision/l2'
  }
};

export function normalizeAuroraConfig(partial: Partial<AuroraConfig> = {}): AuroraConfig {
  return {
    ...DEFAULT_AURORA_CONFIG,
    ...partial,
    memoryPaths: {
      ...DEFAULT_AURORA_CONFIG.memoryPaths,
      ...(partial.memoryPaths || {})
    }
  };
}
