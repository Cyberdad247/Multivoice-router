import { Persona } from '../types/persona';
import { 
  RagMemoryChunk, 
  RagQueryResult, 
  RagChunkCategory, 
  RagTelemetryEvent 
} from '../types/rag';

type QueryListener = (event: RagTelemetryEvent) => void;

class RagService {
  private chunksCache: Map<string, RagMemoryChunk[]> = new Map();
  private queryListeners: Set<QueryListener> = new Set();
  private telemetryHistory: RagTelemetryEvent[] = [];

  // Subscribe to real-time RAG query events during sessions
  public subscribeToTelemetry(listener: QueryListener): () => void {
    this.queryListeners.add(listener);
    return () => this.queryListeners.delete(listener);
  }

  public getTelemetryHistory(): RagTelemetryEvent[] {
    return [...this.telemetryHistory];
  }

  private notifyTelemetry(event: RagTelemetryEvent) {
    this.telemetryHistory = [event, ...this.telemetryHistory.slice(0, 49)];
    this.queryListeners.forEach(listener => {
      try {
        listener(event);
      } catch (err) {
        console.error('Error in RAG telemetry listener:', err);
      }
    });
  }

  /**
   * Decompose persona attributes, core memories, Cloud Brain logs,
   * and attached sources into discrete RAG memory chunks.
   */
  public createPersonaChunks(persona: Persona): RagMemoryChunk[] {
    const chunks: RagMemoryChunk[] = [];
    const now = new Date().toISOString();

    // 1. Core Identity & Attributes
    chunks.push({
      id: `attr_personality_${persona.id}`,
      personaId: persona.id,
      category: 'attribute',
      title: `${persona.name} — Personality Core`,
      content: `Personality Archetype: ${persona.attributes.personality}. Key Behavioral Trait: Manifests as ${persona.attributes.personality} in dialogue, decision-making, and emotional responses. Role: ${persona.role}.`,
      tags: ['attribute', 'personality', persona.attributes.personality.toLowerCase()],
      createdAt: now,
    });

    chunks.push({
      id: `attr_tone_${persona.id}`,
      personaId: persona.id,
      category: 'attribute',
      title: `${persona.name} — Vocal & Dialogue Cadence`,
      content: `Tone of Voice: ${persona.attributes.tone}. Communication Style: Speaks with a ${persona.attributes.tone} demeanor, maintaining natural character consistency at all times.`,
      tags: ['attribute', 'tone', 'voice'],
      createdAt: now,
    });

    persona.attributes.expertise.forEach((exp, idx) => {
      chunks.push({
        id: `attr_expertise_${persona.id}_${idx}`,
        personaId: persona.id,
        category: 'attribute',
        title: `Domain Expertise: ${exp}`,
        content: `Specialized Knowledge Field: ${exp}. ${persona.name} has deep theoretical and operational knowledge in ${exp} and applies its conceptual principles to questions.`,
        tags: ['attribute', 'expertise', exp.toLowerCase()],
        createdAt: now,
      });
    });

    // 2. Core Episodic Memories
    persona.memory.forEach((mem, idx) => {
      chunks.push({
        id: `mem_core_${persona.id}_${idx}`,
        personaId: persona.id,
        category: 'memory',
        title: `Core Memory Fragment #${idx + 1}`,
        content: mem,
        tags: ['memory', 'core_fragment', `mem_${idx + 1}`],
        createdAt: now,
      });
    });

    // 3. Cloud Brain Persistent Logs
    if (persona.cloudBrainLogs && persona.cloudBrainLogs.length > 0) {
      persona.cloudBrainLogs.forEach(entry => {
        chunks.push({
          id: `cloudbrain_${persona.id}_${entry.id}`,
          personaId: persona.id,
          category: 'cloudbrain',
          title: `Cloud Brain Note: ${entry.title}`,
          content: entry.content,
          tags: ['cloudbrain', entry.category, ...(entry.tags || [])],
          createdAt: entry.timestamp || now,
          sourceRef: 'CloudBrain_NotebookLM',
        });
      });
    }

    // 4. Attached Sources & Documents (NotebookLM context)
    if (persona.sources && persona.sources.length > 0) {
      persona.sources.forEach(source => {
        if (source.content && source.content.trim().length > 0) {
          // Split large documents into manageable chunks (~400 chars)
          const paragraphs = source.content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
          paragraphs.forEach((p, pIdx) => {
            chunks.push({
              id: `source_${persona.id}_${source.id}_${pIdx}`,
              personaId: persona.id,
              category: 'source',
              title: `Source Excerpt: ${source.name} (Part ${pIdx + 1})`,
              content: p.trim(),
              tags: ['source', source.name.toLowerCase()],
              createdAt: now,
              sourceRef: source.name,
            });
          });
        }
      });
    }

    return chunks;
  }

  /**
   * Generate embeddings via backend Gemini endpoint (/api/rag/embed)
   * with fallback to local storage cache or TF-IDF vectorizer.
   */
  public async indexPersona(persona: Persona, forceRefresh = false): Promise<RagMemoryChunk[]> {
    const storageKey = `persona_rag_index_${persona.id}`;
    
    if (!forceRefresh) {
      // Check in-memory cache
      if (this.chunksCache.has(persona.id)) {
        return this.chunksCache.get(persona.id)!;
      }

      // Check localStorage
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored) as RagMemoryChunk[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.chunksCache.set(persona.id, parsed);
            return parsed;
          }
        }
      } catch (e) {
        console.warn('Could not read RAG cache from localStorage', e);
      }
    }

    const chunks = this.createPersonaChunks(persona);

    try {
      // Send texts to server to generate Gemini vectors
      const textsToEmbed = chunks.map(c => `[${c.category.toUpperCase()}] ${c.title}: ${c.content}`);
      const res = await fetch('/api/rag/embed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts: textsToEmbed }),
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.embeddings) && data.embeddings.length === chunks.length) {
          chunks.forEach((chunk, i) => {
            chunk.embedding = data.embeddings[i];
          });
        }
      }
    } catch (err) {
      console.warn('Backend vector embedding unavailable; falling back to lexical hybrid vectorization', err);
    }

    // Save to memory cache & localStorage
    this.chunksCache.set(persona.id, chunks);
    try {
      localStorage.setItem(storageKey, JSON.stringify(chunks));
    } catch (e) {
      console.warn('Could not cache chunks in localStorage', e);
    }

    return chunks;
  }

  /**
   * Search persona memory using hybrid vector semantic similarity + BM25 keyword matching
   */
  public async searchPersonaRag(
    persona: Persona,
    query: string,
    options: {
      topK?: number;
      category?: RagChunkCategory | 'all';
      minThreshold?: number;
      emitTelemetry?: boolean;
    } = {}
  ): Promise<RagQueryResult[]> {
    const { topK = 4, category = 'all', minThreshold = 0.15, emitTelemetry = true } = options;
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    let chunks = await this.indexPersona(persona);
    if (category !== 'all') {
      chunks = chunks.filter(c => c.category === category);
    }

    if (chunks.length === 0) return [];

    // 1. Try to get query embedding
    let queryEmbedding: number[] | null = null;
    try {
      const res = await fetch('/api/rag/embed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts: [cleanQuery] }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.embeddings) && data.embeddings[0]) {
          queryEmbedding = data.embeddings[0];
        }
      }
    } catch (e) {
      // Embedding server down, fallback to lexical
    }

    // 2. Tokenize query for keyword scoring
    const queryTokens = this.tokenize(cleanQuery);

    const scoredResults: RagQueryResult[] = chunks.map(chunk => {
      let semanticScore = 0;
      let hasEmbedding = false;

      if (queryEmbedding && chunk.embedding && chunk.embedding.length > 0) {
        semanticScore = this.cosineSimilarity(queryEmbedding, chunk.embedding);
        hasEmbedding = true;
      }

      const { keywordScore, matchedWords } = this.calculateKeywordScore(queryTokens, chunk);

      let finalScore = 0;
      let matchType: 'semantic' | 'keyword' | 'hybrid' = 'keyword';

      if (hasEmbedding && semanticScore > 0) {
        finalScore = semanticScore * 0.70 + keywordScore * 0.30;
        matchType = keywordScore > 0.3 ? 'hybrid' : 'semantic';
      } else {
        finalScore = keywordScore;
        matchType = 'keyword';
      }

      return {
        chunk,
        similarity: Math.min(Math.max(finalScore, 0), 1),
        matchType,
        matchedKeywords: matchedWords,
      };
    });

    const filtered = scoredResults
      .filter(r => r.similarity >= minThreshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);

    // Emit real-time telemetry event if requested
    if (emitTelemetry && filtered.length > 0) {
      const topMatch = filtered[0];
      this.notifyTelemetry({
        id: crypto.randomUUID(),
        timestamp: new Date().toLocaleTimeString(),
        personaId: persona.id,
        personaName: persona.name,
        query: cleanQuery,
        categoryFilter: category,
        matchedCount: filtered.length,
        topMatchTitle: topMatch.chunk.title,
        topMatchCategory: topMatch.chunk.category,
        topMatchScore: Math.round(topMatch.similarity * 100),
      });
    }

    return filtered;
  }

  /**
   * Format retrieved chunks into an organized markdown block for prompting
   */
  public buildGroundingContext(results: RagQueryResult[]): string {
    if (results.length === 0) return '';

    const lines: string[] = ['### RETRIEVED PERSONA KNOWLEDGE & MEMORY (RAG):'];
    results.forEach((r, idx) => {
      const tagStr = r.chunk.tags.length > 0 ? `[Tags: ${r.chunk.tags.join(', ')}]` : '';
      const confidence = Math.round(r.similarity * 100);
      lines.push(
        `${idx + 1}. [${r.chunk.category.toUpperCase()} - ${confidence}% match] ${r.chunk.title} ${tagStr}\n   "${r.chunk.content}"`
      );
    });
    return lines.join('\n\n');
  }

  /**
   * Call server endpoint to generate a character-grounded response using Gemini
   */
  public async synthesizeGroundedResponse(
    persona: Persona,
    query: string,
    results: RagQueryResult[]
  ): Promise<string> {
    const retrievedContext = this.buildGroundingContext(results);

    try {
      const res = await fetch('/api/rag/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personaName: persona.name,
          role: persona.role,
          personality: persona.attributes.personality,
          tone: persona.attributes.tone,
          query,
          retrievedContext,
        }),
      });

      if (!res.ok) {
        throw new Error(`Synthesize API error: ${res.statusText}`);
      }

      const data = await res.json();
      return data.text || 'No response generated.';
    } catch (err: any) {
      console.error('Failed to synthesize grounded response', err);
      throw err;
    }
  }

  /**
   * Commit a new memory fragment or Cloud Brain entry to a persona and update index
   */
  public async addMemoryToCloudBrain(
    persona: Persona,
    entry: {
      title: string;
      content: string;
      category: RagChunkCategory;
      tags?: string[];
    }
  ): Promise<RagMemoryChunk> {
    const chunkId = `custom_${persona.id}_${Date.now()}`;
    const newChunk: RagMemoryChunk = {
      id: chunkId,
      personaId: persona.id,
      category: entry.category,
      title: entry.title,
      content: entry.content,
      tags: entry.tags || [entry.category],
      createdAt: new Date().toISOString(),
      sourceRef: 'CloudBrain_Manual',
    };

    try {
      const res = await fetch('/api/rag/embed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts: [`[${newChunk.category.toUpperCase()}] ${newChunk.title}: ${newChunk.content}`] }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.embeddings) && data.embeddings[0]) {
          newChunk.embedding = data.embeddings[0];
        }
      }
    } catch (e) {
      console.warn('Could not generate embedding for new chunk', e);
    }

    const current = this.chunksCache.get(persona.id) || [];
    const updated = [newChunk, ...current];
    this.chunksCache.set(persona.id, updated);

    try {
      localStorage.setItem(`persona_rag_index_${persona.id}`, JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not save updated RAG chunks to localStorage', e);
    }

    return newChunk;
  }

  /**
   * Sync and ingest content from a linked Google Doc Cloud Brain
   */
  public async syncCloudBrainDoc(persona: Persona): Promise<{ syncedCount: number; chunks: RagMemoryChunk[] }> {
    if (!persona.notebookConfig?.enabled || !persona.notebookConfig.id) {
      throw new Error('No Cloud Brain Google Doc linked to this persona.');
    }

    const docId = persona.notebookConfig.id;
    const res = await fetch(`/api/google/drive/file/${docId}`);
    if (!res.ok) {
      throw new Error('Failed to retrieve Cloud Brain document from Google Drive.');
    }

    const data = await res.json();
    const rawContent: string = data.content || '';

    // Split document into meaningful log blocks or paragraphs
    const blocks = rawContent
      .split(/(?=\[CLOUD BRAIN LOG|###|\n\n---\n\n)/gi)
      .map(b => b.trim())
      .filter(b => b.length > 20);

    const now = new Date().toISOString();
    const newDocChunks: RagMemoryChunk[] = blocks.map((block, i) => {
      const firstLine = block.split('\n')[0].replace(/\[|\]|#/g, '').trim();
      return {
        id: `gdoc_${persona.id}_${docId}_${i}`,
        personaId: persona.id,
        category: 'cloudbrain',
        title: firstLine.length < 50 ? firstLine : `Cloud Brain Entry #${i + 1}`,
        content: block,
        tags: ['cloudbrain', 'google_doc', persona.notebookConfig?.name || 'NotebookLM'],
        createdAt: now,
        sourceRef: persona.notebookConfig?.name || 'Google Doc',
      };
    });

    // Embed newly synced chunks
    try {
      const texts = newDocChunks.map(c => `[CLOUDBRAIN] ${c.title}: ${c.content}`);
      const embedRes = await fetch('/api/rag/embed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts }),
      });
      if (embedRes.ok) {
        const embedData = await embedRes.json();
        if (Array.isArray(embedData.embeddings)) {
          newDocChunks.forEach((c, idx) => {
            c.embedding = embedData.embeddings[idx];
          });
        }
      }
    } catch (e) {
      console.warn('Failed to embed synced Cloud Brain doc chunks', e);
    }

    // Merge with existing chunks
    const existing = (this.chunksCache.get(persona.id) || []).filter(c => !c.id.startsWith(`gdoc_${persona.id}`));
    const merged = [...newDocChunks, ...existing];
    this.chunksCache.set(persona.id, merged);

    try {
      localStorage.setItem(`persona_rag_index_${persona.id}`, JSON.stringify(merged));
    } catch (e) {
      console.warn('Failed to update localStorage after Cloud Brain sync', e);
    }

    return { syncedCount: newDocChunks.length, chunks: newDocChunks };
  }

  /**
   * Analyze conversation transcript, extract key insights, and commit to Cloud Brain
   */
  public async extractAndCommitSessionMemories(
    persona: Persona,
    transcript: string
  ): Promise<RagMemoryChunk[]> {
    if (!transcript || transcript.trim().length < 40) return [];

    try {
      const res = await fetch('/api/rag/extract-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personaName: persona.name,
          transcript,
        }),
      });

      if (!res.ok) return [];

      const data = await res.json();
      const extractedMemories: Array<{ title: string; content: string; tags: string[]; category?: string }> = data.memories || [];

      const createdChunks: RagMemoryChunk[] = [];
      for (const m of extractedMemories) {
        const chunk = await this.addMemoryToCloudBrain(persona, {
          title: m.title || 'Session Insight',
          content: m.content,
          category: 'cloudbrain',
          tags: ['session_learned', ...(m.tags || [])],
        });
        createdChunks.push(chunk);
      }

      return createdChunks;
    } catch (err) {
      console.error('Error auto-extracting session memories:', err);
      return [];
    }
  }

  // Helper: Vector Cosine Similarity
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length || vecA.length === 0) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Helper: Tokenize text
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);
  }

  // Helper: Token Keyword Scoring
  private calculateKeywordScore(
    queryTokens: string[],
    chunk: RagMemoryChunk
  ): { keywordScore: number; matchedWords: string[] } {
    if (queryTokens.length === 0) return { keywordScore: 0, matchedWords: [] };

    const targetText = `${chunk.title} ${chunk.content} ${chunk.tags.join(' ')}`.toLowerCase();
    const matched: string[] = [];

    queryTokens.forEach(t => {
      if (targetText.includes(t)) {
        matched.push(t);
      }
    });

    const uniqueMatches = Array.from(new Set(matched));
    const keywordScore = uniqueMatches.length / Math.max(queryTokens.length, 1);
    return { keywordScore: Math.min(keywordScore, 1), matchedWords: uniqueMatches };
  }
}

export const ragService = new RagService();
