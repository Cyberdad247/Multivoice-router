import React, { useState, useEffect, useMemo } from 'react';
import { Persona, Source } from '../types/persona';
import { RagMemoryChunk, RagQueryResult, RagChunkCategory, RagTelemetryEvent } from '../types/rag';
import { ragService } from '../services/rag-service';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Sparkles, 
  FileSearch, 
  Podcast, 
  CheckCircle2, 
  Loader2, 
  Brain,
  Search,
  Plus,
  RefreshCw,
  Radio,
  BookOpen,
  Database,
  Quote,
  Layers,
  ArrowRight,
  ExternalLink,
  MessageSquare,
  Sparkle
} from 'lucide-react';
import { toast } from 'sonner';

interface NotebookLMLabProps {
  persona: Persona;
  sources: Source[];
  disabled?: boolean;
}

export function NotebookLMLab({ persona, sources, disabled }: NotebookLMLabProps) {
  // Active sub-tab
  const [activeTab, setActiveTab] = useState<'rag' | 'memory_bank' | 'notebook_studio' | 'telemetry'>('rag');

  // RAG Index State
  const [chunks, setChunks] = useState<RagMemoryChunk[]>([]);
  const [isIndexing, setIsIndexing] = useState(false);

  // RAG Search State
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<RagChunkCategory | 'all'>('all');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<RagQueryResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Grounded Synthesis State
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [groundedResponse, setGroundedResponse] = useState<string | null>(null);

  // Memory Bank New Item State
  const [isAddingMemory, setIsAddingMemory] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<RagChunkCategory>('cloudbrain');
  const [newTags, setNewTags] = useState('');
  const [isSavingMemory, setIsSavingMemory] = useState(false);

  // Google Doc Cloud Brain Sync
  const [isSyncingDoc, setIsSyncingDoc] = useState(false);

  // NotebookLM Studio State
  const [isGeneratingStudio, setIsGeneratingStudio] = useState(false);
  const [studioInsight, setStudioInsight] = useState<{ title: string; content: string } | null>(null);

  // Real-time Telemetry State
  const [telemetryEvents, setTelemetryEvents] = useState<RagTelemetryEvent[]>(() => ragService.getTelemetryHistory());

  // Listen for Live RAG Telemetry
  useEffect(() => {
    const unsubscribe = ragService.subscribeToTelemetry((event) => {
      setTelemetryEvents(prev => [event, ...prev.slice(0, 49)]);
    });
    return () => unsubscribe();
  }, []);

  // Load / Index Chunks on persona change
  useEffect(() => {
    let isMounted = true;
    async function loadIndex() {
      setIsIndexing(true);
      try {
        const loadedChunks = await ragService.indexPersona(persona);
        if (isMounted) {
          setChunks(loadedChunks);
        }
      } catch (err) {
        console.error('Failed to index persona chunks', err);
      } finally {
        if (isMounted) setIsIndexing(false);
      }
    }
    loadIndex();
    setSearchResults([]);
    setHasSearched(false);
    setGroundedResponse(null);
    return () => { isMounted = false; };
  }, [persona]);

  // Persona-specific test query recommendations
  const recommendedQueries = useMemo(() => {
    switch (persona.id) {
      case 'nova':
        return [
          'What is your stance on quantum supremacy?',
          'When is the Mars colony expected?',
          'How do you approach AI ethics?'
        ];
      case 'elara':
        return [
          'What happened to the Library of Alexandria?',
          'How does Stoicism help modern mental health?',
          'Why did the Western Roman Empire fall?'
        ];
      case 'jax':
        return [
          'Why do you believe privacy is a myth?',
          'What happened during the 2024 global outage?',
          'How do decentralized networks protect us?'
        ];
      case 'atlas':
        return [
          'How intense is the pressure in the ocean abyss?',
          'What did you observe at the Atlantic Ridge hydrothermal vents?',
          'How much of the ocean floor is still unmapped?'
        ];
      case 'lyra':
        return [
          'How does synesthesia influence your art?',
          'Is algorithmic generative art true creativity?',
          'How do fractals relate to your thought process?'
        ];
      case 'sage':
        return [
          'How does the mycelial network connect the forest?',
          'What can we learn from nature\'s patience?',
          'Why is biodiversity essential for planetary healing?'
        ];
      default:
        return [
          `What are ${persona.name}'s core values and philosophy?`,
          `What is your domain expertise in ${persona.attributes.expertise[0] || 'your field'}?`,
          'Recall an important memory or revelation from your notes.'
        ];
    }
  }, [persona]);

  // Execute RAG Search
  const handleSearch = async (searchQuery = query) => {
    const q = searchQuery.trim();
    if (!q) {
      toast.error('Please enter a query to test memory retrieval');
      return;
    }
    setIsSearching(true);
    setGroundedResponse(null);
    try {
      const results = await ragService.searchPersonaRag(persona, q, {
        category: categoryFilter,
        topK: 4,
        emitTelemetry: true,
      });
      setSearchResults(results);
      setHasSearched(true);
      if (results.length === 0) {
        toast.info('No matching memory chunks above confidence threshold');
      } else {
        toast.success(`Retrieved ${results.length} memory chunks with up to ${Math.round(results[0].similarity * 100)}% match`);
      }
    } catch (e) {
      console.error('RAG search failed', e);
      toast.error('Memory retrieval failed');
    } finally {
      setIsSearching(false);
    }
  };

  // Synthesize Grounded Persona Response
  const handleSynthesize = async () => {
    if (searchResults.length === 0) {
      toast.error('Run a search first to retrieve grounding memories');
      return;
    }
    setIsSynthesizing(true);
    try {
      const text = await ragService.synthesizeGroundedResponse(persona, query, searchResults);
      setGroundedResponse(text);
      toast.success(`${persona.name} formulated a grounded response.`);
    } catch (e) {
      toast.error('Failed to synthesize grounded response');
    } finally {
      setIsSynthesizing(false);
    }
  };

  // Re-index all chunks with vector refresh
  const handleReindex = async () => {
    setIsIndexing(true);
    try {
      const refreshed = await ragService.indexPersona(persona, true);
      setChunks(refreshed);
      toast.success(`Successfully re-indexed ${refreshed.length} chunks with Gemini vectors`);
    } catch (e) {
      toast.error('Re-indexing failed');
    } finally {
      setIsIndexing(false);
    }
  };

  // Sync Google Doc Cloud Brain
  const handleSyncCloudBrain = async () => {
    if (!persona.notebookConfig?.enabled || !persona.notebookConfig.id) {
      toast.error('No Google Doc Cloud Brain linked. Link one in Persona Settings.');
      return;
    }
    setIsSyncingDoc(true);
    try {
      const { syncedCount } = await ragService.syncCloudBrainDoc(persona);
      const reloaded = await ragService.indexPersona(persona, true);
      setChunks(reloaded);
      toast.success(`Synced ${syncedCount} memory chunks from Google Doc Cloud Brain!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to sync Cloud Brain document');
    } finally {
      setIsSyncingDoc(false);
    }
  };

  // Commit New Memory Chunk
  const handleSaveNewMemory = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      toast.error('Title and content are required');
      return;
    }
    setIsSavingMemory(true);
    try {
      const tagsArray = newTags
        .split(',')
        .map(t => t.trim().toLowerCase())
        .filter(t => t.length > 0);

      const chunk = await ragService.addMemoryToCloudBrain(persona, {
        title: newTitle.trim(),
        content: newContent.trim(),
        category: newCategory,
        tags: tagsArray,
      });

      setChunks(prev => [chunk, ...prev]);
      setNewTitle('');
      setNewContent('');
      setNewTags('');
      setIsAddingMemory(false);
      toast.success('New memory chunk successfully vectorized and indexed!');
    } catch (e) {
      toast.error('Failed to commit memory chunk');
    } finally {
      setIsSavingMemory(false);
    }
  };

  // NotebookLM Studio Generation (Digest, Podcast, Fact-check)
  const generateStudioInsight = async (type: 'summary' | 'podcast' | 'factcheck') => {
    if (sources.length === 0 && chunks.length === 0) {
      toast.error('Add sources or persona memories to enable synthesis');
      return;
    }

    setIsGeneratingStudio(true);
    try {
      const sourcesText = [
        ...sources.map(s => `[SOURCE: ${s.name}]\n${s.content || s.url || ''}`),
        `[PERSONA CORE KNOWLEDGE & PHILOSOPHY]\n${persona.systemInstruction}\n\nCore Memories:\n` +
          persona.memory.map((m, i) => `${i + 1}. ${m}`).join('\n')
      ].join('\n\n---\n\n');

      const res = await fetch('/api/notebook/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personaName: persona.name,
          role: persona.role,
          type,
          sourcesText,
        }),
      });

      if (!res.ok) throw new Error('Synthesis failed');
      const data = await res.json();
      setStudioInsight({ title: data.title, content: data.content });
      toast.success(`${data.title} generated successfully`);
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate NotebookLM synthesis');
    } finally {
      setIsGeneratingStudio(false);
    }
  };

  // Chunk Counts
  const chunkCounts = useMemo(() => {
    const counts = {
      attribute: 0,
      memory: 0,
      cloudbrain: 0,
      source: 0,
      total: chunks.length,
    };
    chunks.forEach(c => {
      if (counts[c.category] !== undefined) {
        counts[c.category]++;
      }
    });
    return counts;
  }, [chunks]);

  return (
    <div className="space-y-6">
      {/* CloudBrain RAG Header & Status Banner */}
      <div className="rounded-xl border bg-card/60 backdrop-blur-sm p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Brain className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
                  <span>{persona.name}'s NotebookLM CloudBrain</span>
                  <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary bg-primary/5">
                    RAG Vector Engine
                  </Badge>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Retrieval-Augmented Generation for deep character consistency and long-term memory recall.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary/50 border text-muted-foreground">
              <Database className="w-3.5 h-3.5 text-primary" />
              <span>{chunkCounts.total} Chunks Indexed</span>
            </div>

            {persona.notebookConfig?.enabled && persona.notebookConfig.id ? (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs border-green-500/30 bg-green-500/5 hover:bg-green-500/10 text-green-600 dark:text-green-400"
                onClick={handleSyncCloudBrain}
                disabled={isSyncingDoc}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingDoc ? 'animate-spin' : ''}`} />
                <span>{isSyncingDoc ? 'Syncing...' : 'Sync Cloud Brain Doc'}</span>
              </Button>
            ) : null}

            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={handleReindex}
              disabled={isIndexing}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isIndexing ? 'animate-spin' : ''}`} />
              <span>{isIndexing ? 'Indexing...' : 'Re-index'}</span>
            </Button>
          </div>
        </div>

        {/* Vector Embedding Spec Badge */}
        <div className="mt-3 pt-3 border-t border-border/40 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-primary">
              <Sparkle className="w-3 h-3" />
              <span className="font-semibold">Gemini Embedding Model:</span>
            </span>
            <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">gemini-embedding-2-preview</code>
            <span>•</span>
            <span className="text-foreground/80 font-medium">Hybrid Cosine + TF-IDF Retrieval</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Attributes: <strong className="text-foreground">{chunkCounts.attribute}</strong></span>
            <span>Memories: <strong className="text-foreground">{chunkCounts.memory}</strong></span>
            <span>CloudBrain: <strong className="text-foreground">{chunkCounts.cloudbrain}</strong></span>
            <span>Sources: <strong className="text-foreground">{chunkCounts.source}</strong></span>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
        <TabsList className="grid grid-cols-4 w-full h-10 p-1 bg-muted/40">
          <TabsTrigger value="rag" className="text-xs gap-1.5 flex items-center">
            <Search className="w-3.5 h-3.5" />
            <span className="truncate">RAG Recall & Grounding</span>
          </TabsTrigger>
          <TabsTrigger value="memory_bank" className="text-xs gap-1.5 flex items-center">
            <Layers className="w-3.5 h-3.5" />
            <span className="truncate">Memory Bank ({chunkCounts.total})</span>
          </TabsTrigger>
          <TabsTrigger value="notebook_studio" className="text-xs gap-1.5 flex items-center">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="truncate">NotebookLM Studio</span>
          </TabsTrigger>
          <TabsTrigger value="telemetry" className="text-xs gap-1.5 flex items-center">
            <Radio className="w-3.5 h-3.5" />
            <span className="truncate">Live Telemetry</span>
            {telemetryEvents.length > 0 && (
              <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 bg-primary/10 text-primary">
                {telemetryEvents.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: RAG RECALL & GROUNDING */}
        <TabsContent value="rag" className="mt-4 space-y-4">
          <div className="p-4 rounded-xl border bg-card/40 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={`Search ${persona.name}'s memory bank (e.g., philosophical beliefs, core memories, technical expertise)...`}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearch();
                  }}
                  className="pl-9 h-10 text-xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as any)}
                  className="h-10 px-3 text-xs rounded-md border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                >
                  <option value="all">All Categories</option>
                  <option value="memory">Core Memories</option>
                  <option value="attribute">Attributes & Tone</option>
                  <option value="cloudbrain">Cloud Brain Notes</option>
                  <option value="source">Source Documents</option>
                </select>

                <Button
                  onClick={() => handleSearch()}
                  disabled={isSearching || !query.trim()}
                  className="h-10 text-xs px-4 gap-1.5"
                >
                  {isSearching ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Search className="w-3.5 h-3.5" />
                  )}
                  <span>Retrieve</span>
                </Button>
              </div>
            </div>

            {/* Recommended Query Chips */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                <Sparkle className="w-3 h-3 text-primary" />
                Suggested Character Prompts for {persona.name}:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {recommendedQueries.map((rq, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setQuery(rq);
                      handleSearch(rq);
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-full border bg-muted/30 hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all text-left"
                  >
                    "{rq}"
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Search Results Display */}
          {hasSearched && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Retrieved Knowledge Fragments ({searchResults.length})
                  </h4>
                  {searchResults.length > 0 && (
                    <Badge variant="outline" className="text-[10px] text-green-600 border-green-500/30 bg-green-500/5">
                      Character Consistent
                    </Badge>
                  )}
                </div>

                {searchResults.length > 0 && (
                  <Button
                    onClick={handleSynthesize}
                    disabled={isSynthesizing}
                    size="sm"
                    className="h-7 text-xs gap-1.5 bg-primary/90 hover:bg-primary"
                  >
                    {isSynthesizing ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    <span>Synthesize In-Character Response</span>
                  </Button>
                )}
              </div>

              {searchResults.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed text-muted-foreground text-xs">
                  No memory chunks matched query with sufficient confidence. Try another topic or broaden the search filter.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {searchResults.map((result, idx) => {
                    const similarityPct = Math.round(result.similarity * 100);
                    return (
                      <Card key={result.chunk.id} className="border-border/60 hover:border-primary/40 transition-all bg-card/60">
                        <CardHeader className="p-3.5 pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-0.5">
                              <Badge
                                variant="secondary"
                                className="text-[9px] uppercase px-1.5 py-0 font-semibold"
                              >
                                {result.chunk.category}
                              </Badge>
                              <CardTitle className="text-xs font-semibold text-foreground line-clamp-1 pt-1">
                                {result.chunk.title}
                              </CardTitle>
                            </div>

                            <div className="text-right shrink-0">
                              <div className="flex items-center gap-1">
                                <div className="text-xs font-bold font-mono text-primary">
                                  {similarityPct}%
                                </div>
                                <span className="text-[9px] text-muted-foreground">match</span>
                              </div>
                              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                                <div
                                  className="h-full bg-primary rounded-full transition-all"
                                  style={{ width: `${similarityPct}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="p-3.5 pt-0 text-xs text-muted-foreground space-y-2">
                          <p className="line-clamp-3 italic text-foreground/90 leading-relaxed font-serif bg-muted/20 p-2 rounded border border-border/30">
                            "{result.chunk.content}"
                          </p>

                          {result.matchedKeywords && result.matchedKeywords.length > 0 && (
                            <div className="flex flex-wrap gap-1 text-[10px]">
                              <span className="text-muted-foreground">Keywords:</span>
                              {result.matchedKeywords.map((kw, i) => (
                                <span key={i} className="px-1 py-0.5 rounded bg-primary/10 text-primary font-mono">
                                  {kw}
                                </span>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* Synthesized Grounded Response Output */}
              {isSynthesizing && (
                <div className="p-6 rounded-xl border bg-primary/5 border-dashed border-primary/30 flex items-center justify-center gap-3 text-xs text-primary">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Grounding {persona.name}'s voice with retrieved memories and philosophy...</span>
                </div>
              )}

              {groundedResponse && (
                <Card className="border-primary/30 bg-primary/5 shadow-xs overflow-hidden">
                  <CardHeader className="p-4 pb-2 bg-primary/10 border-b border-primary/20 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Quote className="w-4 h-4 text-primary" />
                      <CardTitle className="text-xs font-bold text-foreground">
                        {persona.name}'s Grounded Response
                      </CardTitle>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-background text-primary border-primary/30">
                      100% Character Grounded
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-4 text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap font-sans">
                    {groundedResponse}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: MEMORY BANK & CLOUD BRAIN INDEX */}
        <TabsContent value="memory_bank" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-foreground">CloudBrain Knowledge Base</h4>
              <p className="text-xs text-muted-foreground">
                All discrete memory units and character attributes indexed into the vector store.
              </p>
            </div>

            <Button
              size="sm"
              onClick={() => setIsAddingMemory(!isAddingMemory)}
              className="h-8 text-xs gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAddingMemory ? 'Close' : 'Add Memory Chunk'}</span>
            </Button>
          </div>

          {/* Add New Memory Form */}
          {isAddingMemory && (
            <Card className="border-primary/30 bg-card/70 shadow-sm">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs font-bold">Inject Memory into {persona.name}'s CloudBrain</CardTitle>
                <CardDescription className="text-[11px]">
                  New entries are automatically vectorized with Gemini and immediately accessible in RAG queries and live voice.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">Memory Title</label>
                    <Input
                      placeholder="e.g., Encounter at Marianas Trench"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">Category</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as any)}
                      className="w-full h-8 px-2 text-xs rounded-md border bg-background text-foreground focus:outline-hidden"
                    >
                      <option value="cloudbrain">Cloud Brain Note</option>
                      <option value="memory">Core Episodic Memory</option>
                      <option value="attribute">Attribute / Persona Rule</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Content</label>
                  <Textarea
                    placeholder="Describe the memory or factual knowledge from the persona's first-person perspective..."
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    rows={3}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Tags (comma separated)</label>
                  <Input
                    placeholder="e.g., ocean, expedition, 2024"
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsAddingMemory(false)}
                    className="h-8 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveNewMemory}
                    disabled={isSavingMemory || !newTitle.trim() || !newContent.trim()}
                    className="h-8 text-xs gap-1.5"
                  >
                    {isSavingMemory ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    <span>Vectorize & Commit</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* List of Indexed Chunks */}
          <ScrollArea className="h-[460px] pr-2">
            <div className="space-y-2.5">
              {chunks.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-lg border bg-card/40 hover:bg-card/70 transition-all space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-[9px] uppercase px-1.5 py-0 font-bold ${
                          c.category === 'memory'
                            ? 'border-purple-500/40 text-purple-600 dark:text-purple-400 bg-purple-500/5'
                            : c.category === 'attribute'
                            ? 'border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-500/5'
                            : c.category === 'cloudbrain'
                            ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5'
                            : 'border-orange-500/40 text-orange-600 dark:text-orange-400 bg-orange-500/5'
                        }`}
                      >
                        {c.category}
                      </Badge>
                      <span className="text-xs font-semibold text-foreground">{c.title}</span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                      {c.embedding ? (
                        <span className="text-green-500 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Vectorized
                        </span>
                      ) : (
                        <span className="text-yellow-500">Lexical Index</span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed font-sans">
                    {c.content}
                  </p>

                  {c.tags && c.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {c.tags.map((t, idx) => (
                        <span key={idx} className="text-[9px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* TAB 3: NOTEBOOKLM STUDIO */}
        <TabsContent value="notebook_studio" className="mt-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 p-4 bg-primary/5 hover:bg-primary/10 border-primary/20 text-left"
              onClick={() => generateStudioInsight('summary')}
              disabled={disabled || isGeneratingStudio}
            >
              <FileSearch className="w-5 h-5 text-primary" />
              <div className="text-center">
                <div className="text-xs font-bold">Digest</div>
                <div className="text-[10px] text-muted-foreground">Executive Summary</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-auto flex-col gap-2 p-4 bg-orange-500/5 hover:bg-orange-500/10 border-orange-500/20 text-left"
              onClick={() => generateStudioInsight('podcast')}
              disabled={disabled || isGeneratingStudio}
            >
              <Podcast className="w-5 h-5 text-orange-500" />
              <div className="text-center">
                <div className="text-xs font-bold">Audio Script</div>
                <div className="text-[10px] text-muted-foreground">2-Host Podcast</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-auto flex-col gap-2 p-4 bg-green-500/5 hover:bg-green-500/10 border-green-500/20 text-left"
              onClick={() => generateStudioInsight('factcheck')}
              disabled={disabled || isGeneratingStudio}
            >
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <div className="text-center">
                <div className="text-xs font-bold">Validate</div>
                <div className="text-[10px] text-muted-foreground">Fact Check & Claims</div>
              </div>
            </Button>
          </div>

          {isGeneratingStudio && (
            <div className="flex flex-col items-center justify-center py-12 space-y-3 border rounded-xl bg-muted/20 border-dashed">
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
              <div className="text-center space-y-1">
                <p className="text-xs font-bold text-foreground">Synthesizing with {persona.name}'s Brain...</p>
                <p className="text-[10px] text-muted-foreground">Cross-referencing memory vectors and source documents.</p>
              </div>
            </div>
          )}

          {!isGeneratingStudio && studioInsight && (
            <Card className="border-primary/20 overflow-hidden bg-primary/5">
              <CardHeader className="bg-primary/10 border-b py-2.5 px-4 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold flex items-center gap-2">
                  <Brain className="w-4 h-4 text-primary" />
                  {studioInsight.title}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => setStudioInsight(null)}
                >
                  Clear
                </Button>
              </CardHeader>
              <CardContent className="p-4">
                <ScrollArea className="h-[360px]">
                  <div className="whitespace-pre-wrap text-xs leading-relaxed text-foreground/90 font-sans">
                    {studioInsight.content}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB 4: LIVE RAG TELEMETRY */}
        <TabsContent value="telemetry" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Radio className="w-4 h-4 text-primary animate-pulse" />
                Live RAG Telemetry Feed
              </h4>
              <p className="text-xs text-muted-foreground">
                Real-time record of memory lookups performed by Gemini Live while speaking.
              </p>
            </div>
          </div>

          {telemetryEvents.length === 0 ? (
            <div className="py-12 text-center rounded-xl border border-dashed bg-muted/20 text-muted-foreground space-y-2">
              <Radio className="w-6 h-6 mx-auto opacity-40" />
              <p className="text-xs font-medium">No live memory lookups recorded yet.</p>
              <p className="text-[10px] max-w-sm mx-auto">
                Start a live voice conversation or run a query in the "RAG Recall" tab to observe real-time retrieval events.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {telemetryEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="p-3 rounded-lg border bg-card/40 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-muted-foreground">{evt.timestamp}</span>
                      <span className="font-semibold text-foreground">Query: "{evt.query}"</span>
                    </div>
                    <p className="text-muted-foreground text-[11px] flex items-center gap-1.5">
                      <span>Top Match:</span>
                      <strong className="text-foreground">{evt.topMatchTitle}</strong>
                      <Badge variant="outline" className="text-[9px] py-0 px-1">
                        {evt.topMatchCategory}
                      </Badge>
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold font-mono text-primary">
                      {evt.topMatchScore}%
                    </span>
                    <span className="text-[10px] text-muted-foreground block">similarity</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
