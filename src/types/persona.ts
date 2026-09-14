import { CloudBrainLogEntry } from './rag';

export interface Source {
  id: string;
  type: 'url' | 'file';
  name: string;
  content?: string; // For files
  url?: string; // For URLs
}

export type GeminiLiveVoice = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr' | 'Aoede';

export interface GeminiVoiceMetadata {
  id: GeminiLiveVoice;
  name: string;
  gender: 'Female' | 'Male' | 'Neutral';
  tone: string;
  pitch: string;
  tempo: string;
  tag: string;
  description: string;
  sampleQuote: string;
  color?: string;
}

export interface Persona {
  id: string;
  name: string;
  role: string;
  description: string;
  voice: GeminiLiveVoice;
  synthesisEngine?: string; // Specific synthesis engine (e.g., 'Gemini-Voice-1.0' or custom model)
  systemInstruction: string;
  attributes: {
    tone: string;
    expertise: string[];
    personality: string;
  };
  memory: string[];
  armorSlot?: number;
  traits?: string[];
  color?: string;
  signatureQuote?: string;
  cloudBrainLogs?: CloudBrainLogEntry[];
  ragConfig?: {
    enabled?: boolean;
    autoRetrieveInLive?: boolean;
    topK?: number;
    minSimilarityThreshold?: number;
    autoExtractSessionNotes?: boolean;
  };
  sources?: Source[];
  notebookConfig?: {
    enabled: boolean;
    id: string; // Google Doc ID
    name: string;
    lastSynced?: string;
  };
  bridgeConfig?: {
    enabled: boolean;
    ip: string;
    port: number;
    protocol: 'http' | 'https';
  };
  rustDeskConfig?: {
    enabled: boolean;
    id: string;
    password?: string;
    server?: string;
  };
  backdropUrl?: string;
  backdropTheme?: string;
  crop?: [number, number, number, number];
  previewUrl?: string;
  baseVoiceSampleId?: string;
  baseVoiceSampleUrl?: string;
}

export interface TailscaleDevice {
  id: string;
  name: string;
  addresses: string[];
  lastSeen: string;
  online: boolean;
  os: string;
}

export type BulkTraitCategory = 'system' | 'memory';

export interface BulkTraitDefinition {
  id: string;
  name: string;
  category: BulkTraitCategory;
  description: string;
  directiveContent: string; // The specific system directive or memory statement to inject
  badgeColor?: string;
  isCustom?: boolean;
}

export interface BulkTaggingOptions {
  targetPersonaIds: string[];
  traits: BulkTraitDefinition[];
  applyToTraitsList: boolean;
  applyToMemory: boolean;
  applyToSystemInstruction: boolean;
  mode: 'append' | 'replace';
}
