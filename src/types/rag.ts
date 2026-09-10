export type RagChunkCategory = 'attribute' | 'memory' | 'cloudbrain' | 'source';

export interface RagMemoryChunk {
  id: string;
  personaId: string;
  category: RagChunkCategory;
  title: string;
  content: string;
  tags: string[];
  embedding?: number[];
  createdAt: string;
  sourceRef?: string;
  confidence?: number;
}

export interface RagQueryResult {
  chunk: RagMemoryChunk;
  similarity: number;
  matchType: 'semantic' | 'keyword' | 'hybrid';
  matchedKeywords?: string[];
}

export interface RagSearchResponse {
  query: string;
  results: RagQueryResult[];
  groundingContext: string;
  synthesizedResponse?: string;
}

export interface CloudBrainLogEntry {
  id: string;
  timestamp: string;
  title: string;
  content: string;
  category: 'observation' | 'dialogue' | 'insight' | 'manual';
  tags?: string[];
}

export interface RagTelemetryEvent {
  id: string;
  timestamp: string;
  personaId: string;
  personaName: string;
  query: string;
  categoryFilter?: string;
  matchedCount: number;
  topMatchTitle: string;
  topMatchCategory: RagChunkCategory;
  topMatchScore: number;
}
