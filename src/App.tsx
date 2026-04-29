import { useState, useEffect, useCallback, useRef } from 'react';
import { PERSONAS as INITIAL_PERSONAS } from './constants/personas';
import { Persona, TailscaleDevice } from './types/persona';
import { useGeminiLive } from './hooks/use-gemini-live';
import { PersonaCard } from './components/PersonaCard';
import { AudioVisualizer } from './components/AudioVisualizer';
import { LiveChat } from './components/LiveChat';
import { PersonaDialog } from './components/PersonaDialog';
import { SourceManager } from './components/SourceManager';
import { NotebookLMLab } from './components/NotebookLMLab';
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Badge } from './components/ui/badge';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import { useAuth } from './components/AuthProvider';
import { personaService, transcriptService } from './lib/firestore';
import { 
  Mic, 
  MicOff, 
  BrainCircuit, 
  History, 
  Settings2, 
  Activity,
  Zap,
  Cpu,
  Plus,
  Library,
  BookOpen,
  Network,
  Monitor,
  RefreshCw,
  Shield,
  Loader2,
  Sparkles,
  Brain,
  LogIn,
  LogOut,
  User as UserIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const { user, loading: authLoading, login, logout } = useAuth();
  const [personas, setPersonas] = useState<Persona[]>(INITIAL_PERSONAS);
  const [selectedPersona, setSelectedPersona] = useState<Persona>(INITIAL_PERSONAS[0]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<{ mode: 'create' | 'edit'; persona: Persona | null } | null>(null);
  const [tailscaleDevices, setTailscaleDevices] = useState<TailscaleDevice[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);

  const fetchTailscaleDevices = useCallback(async () => {
    setIsLoadingDevices(true);
    try {
      const res = await fetch('/api/tailscale/devices');
      const data = await res.json();
      
      if (res.ok) {
        setTailscaleDevices(data);
      } else {
        console.error('Tailscale API Error:', data.error);
        if (res.status === 400) {
          // Semi-silent for 400 (unconfigured) to avoid annoying new users
          console.warn('Tailscale not configured yet');
        } else {
          toast.error(`Tailscale Error: ${data.error || 'Failed to fetch devices'}`);
        }
      }
    } catch (e) {
      console.error('Failed to fetch Tailscale devices:', e);
      toast.error('Network error connecting to Tailscale bridge');
    } finally {
      setIsLoadingDevices(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchTailscaleDevices();
    // Poll every 30 seconds
    const interval = setInterval(fetchTailscaleDevices, 30000);
    return () => clearInterval(interval);
  }, [fetchTailscaleDevices]);

  // Firebase Sync
  useEffect(() => {
    if (user) {
      const loadPersonas = async () => {
        setIsSyncing(true);
        try {
          const cloudPersonas = await personaService.listPersonas();
          if (cloudPersonas.length > 0) {
            setPersonas(cloudPersonas);
            setSelectedPersona(cloudPersonas[0]);
          } else {
            // First time login - save defaults to cloud
            for (const p of INITIAL_PERSONAS) {
              await personaService.savePersona(p);
            }
          }
        } catch (e) {
          console.error("Sync error:", e);
        } finally {
          setIsSyncing(false);
        }
      };
      loadPersonas();
    } else {
      setPersonas(INITIAL_PERSONAS);
      setSelectedPersona(INITIAL_PERSONAS[0]);
    }
  }, [user]);
  
  const handleAddSource = async (source: any) => {
    const updatedPersona = {
      ...selectedPersona,
      sources: [...(selectedPersona.sources || []), source]
    };
    setSelectedPersona(updatedPersona);
    setPersonas(personas.map(p => p.id === updatedPersona.id ? updatedPersona : p));
    if (user) await personaService.savePersona(updatedPersona);
  };

  const handleRemoveSource = async (id: string) => {
    const updatedPersona = {
      ...selectedPersona,
      sources: (selectedPersona.sources || []).filter(s => s.id !== id)
    };
    setSelectedPersona(updatedPersona);
    setPersonas(personas.map(p => p.id === updatedPersona.id ? updatedPersona : p));
    if (user) await personaService.savePersona(updatedPersona);
  };

  const { 
    isConnected, 
    isConnecting, 
    connect, 
    disconnect, 
    updateConfig,
    transcription, 
    audioLevel 
  } = useGeminiLive(selectedPersona);

  const handleToggleConnection = () => {
    if (isConnected) {
      disconnect();
      toast.info("Session ended");
    } else {
      connect();
      toast.success(`Connecting as ${selectedPersona.name}...`);
    }
  };

  const handlePersonaChange = (persona: Persona) => {
    setSelectedPersona(persona);
    if (isConnected) {
      updateConfig(persona);
    }
  };

  const handleSavePersona = async (updatedPersona: Persona) => {
    if (dialogConfig?.mode === 'create') {
      const newPersonas = [...personas, updatedPersona];
      setPersonas(newPersonas);
      if (user) await personaService.savePersona(updatedPersona);
      toast.success(`${updatedPersona.name} created successfully`);
    } else {
      const newPersonas = personas.map(p => p.id === updatedPersona.id ? updatedPersona : p);
      setPersonas(newPersonas);
      
      // Update selected persona if it was the one edited
      if (selectedPersona.id === updatedPersona.id) {
        setSelectedPersona(updatedPersona);
      }
      if (user) await personaService.savePersona(updatedPersona);
      toast.success(`${updatedPersona.name} updated successfully`);
    }
    
    setDialogConfig(null);
  };

  const handleCreateNew = () => {
    if (isConnected) {
      toast.error("Disconnect current session before creating new personas");
      return;
    }
    setDialogConfig({ mode: 'create', persona: null });
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/10">
      <Toaster position="top-center" />
      
      <PersonaDialog 
        persona={dialogConfig?.persona || null}
        isOpen={!!dialogConfig}
        mode={dialogConfig?.mode || 'create'}
        onClose={() => setDialogConfig(null)}
        onSave={handleSavePersona}
      />

      {/* Header */}
      <header className="border-bottom bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <BrainCircuit className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="font-display font-bold text-xl tracking-tight">PersonaLive</h1>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              {user ? (
                <div className="flex items-center gap-2 pr-4 border-r">
                  <div className="text-right">
                    <p className="text-[10px] font-bold leading-none">{user.displayName || 'Persona User'}</p>
                    <p className="text-[9px] text-muted-foreground">{user.email}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={logout}>
                    <LogOut className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="h-8 text-xs gap-2 rounded-full" onClick={login}>
                  <LogIn className="w-3.5 h-3.5" />
                  Sign In
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/50 border text-xs font-medium">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-muted'}`} />
              {isConnected ? 'Live Session Active' : isSyncing ? 'Syncing...' : 'Ready'}
            </div>
            <Button 
              variant={isConnected ? "destructive" : "default"}
              size="sm"
              onClick={handleToggleConnection}
              disabled={isConnecting}
              className="rounded-full px-6"
            >
              {isConnecting ? (
                <Cpu className="w-4 h-4 animate-spin mr-2" />
              ) : isConnected ? (
                <MicOff className="w-4 h-4 mr-2" />
              ) : (
                <Mic className="w-4 h-4 mr-2" />
              )}
              {isConnecting ? 'Initializing...' : isConnected ? 'End Session' : 'Start Live Conversation'}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Persona Selection & Details */}
          <div className="lg:col-span-4 space-y-6">
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <h2 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground">Select Persona</h2>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 px-3 text-xs gap-1.5 rounded-full"
                  onClick={handleCreateNew}
                  disabled={isConnected || isConnecting}
                >
                  <Plus className="w-3.5 h-3.5" />
                  New
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {personas.map(p => (
                  <PersonaCard 
                    key={p.id}
                    persona={p}
                    isSelected={selectedPersona.id === p.id}
                    onSelect={handlePersonaChange}
                    onEdit={(persona) => setDialogConfig({ mode: 'edit', persona })}
                    disabled={isConnected || isConnecting}
                  />
                ))}
              </div>
            </section>

            <Card className="bg-secondary/10 border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-display uppercase tracking-widest opacity-50">Persona Attributes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Personality</label>
                  <p className="text-sm font-medium">{selectedPersona.attributes.personality}</p>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Tone of Voice</label>
                  <p className="text-sm font-medium">{selectedPersona.attributes.tone}</p>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Core Memory Fragments</label>
                  <ul className="mt-2 space-y-2">
                    {selectedPersona.memory.map((m, i) => (
                      <li key={i} className="text-xs text-muted-foreground bg-background/50 p-2 rounded border border-dashed">
                        "{m}"
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Live Interaction */}
          <div className="lg:col-span-8 space-y-6">
            <Card className="overflow-hidden border-2 border-primary/10">
              <div className="bg-primary/5 p-6 border-b">
                <div className="flex items-center justify-between mb-6">
                  <div className="space-y-1">
                    <CardTitle className="text-2xl font-display flex items-center gap-2">
                      {isConnected ? (
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ repeat: Infinity, duration: 2 }}
                        >
                          <Activity className="w-6 h-6 text-primary" />
                        </motion.div>
                      ) : (
                        <Mic className="w-6 h-6 text-muted-foreground" />
                      )}
                      {isConnected ? `Conversing with ${selectedPersona.name}` : 'Ready to Connect'}
                    </CardTitle>
                    <CardDescription>
                      {isConnected 
                        ? 'Speak naturally. The AI is listening and will respond in real-time.' 
                        : 'Select a persona and click the button above to start a live voice session.'}
                    </CardDescription>
                  </div>
                </div>

                <AudioVisualizer 
                  level={audioLevel} 
                  isActive={isConnected} 
                  color={isConnected ? "hsl(var(--primary))" : "hsl(var(--muted))"}
                />
              </div>

              <CardContent className="p-0">
                <Tabs defaultValue="chat" className="w-full">
                  <div className="px-6 border-b bg-muted/30">
                    <TabsList className="bg-transparent h-12 gap-6">
                      <TabsTrigger value="chat" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 flex gap-2">
                        <History className="w-4 h-4" />
                        Live Transcript
                      </TabsTrigger>
                      <TabsTrigger value="sources" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 flex gap-2">
                        <BookOpen className="w-4 h-4" />
                        Sources
                      </TabsTrigger>
                      <TabsTrigger value="notebook" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 flex gap-2">
                        <Sparkles className="w-4 h-4" />
                        NotebookLM
                      </TabsTrigger>
                      <TabsTrigger value="mcp" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 flex gap-2">
                        <Settings2 className="w-4 h-4" />
                        MCP Context
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="chat" className="p-6 m-0">
                    <LiveChat messages={transcription} />
                  </TabsContent>

                  <TabsContent value="sources" className="p-6 m-0">
                    <SourceManager 
                      sources={selectedPersona.sources || []}
                      onAddSource={handleAddSource}
                      onRemoveSource={handleRemoveSource}
                      disabled={isConnected || isConnecting}
                    />
                  </TabsContent>

                  <TabsContent value="notebook" className="p-6 m-0">
                    <NotebookLMLab 
                      persona={selectedPersona}
                      sources={selectedPersona.sources || []}
                    />
                  </TabsContent>

                  <TabsContent value="mcp" className="p-6 m-0">
                    <div className="space-y-6">
                      <div className="p-4 rounded-lg bg-secondary/20 border border-dashed">
                        <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
                          <Cpu className="w-4 h-4" />
                          Model Context Protocol (MCP) Integration
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          This session is linked to a simulated MCP server. The brain can access persona-specific RAG memory and external attributes on demand via tool calling.
                        </p>
                      </div>

                      {selectedPersona.bridgeConfig?.enabled && (
                        <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
                          <h3 className="text-sm font-bold mb-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Network className="w-4 h-4 text-blue-500" />
                              Rust Bridge (Tailscale)
                            </div>
                            <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-500 border-green-500/20">
                              Active
                            </Badge>
                          </h3>
                          <div className="space-y-2">
                            <div className="flex justify-between text-[10px]">
                              <span className="text-muted-foreground">Node IP</span>
                              <span className="font-mono">{selectedPersona.bridgeConfig.ip}</span>
                            </div>
                            <div className="flex justify-between text-[10px]">
                              <span className="text-muted-foreground">Protocol</span>
                              <span className="font-mono uppercase">{selectedPersona.bridgeConfig.protocol}</span>
                            </div>
                            <div className="flex justify-between text-[10px]">
                              <span className="text-muted-foreground">Port</span>
                              <span className="font-mono">{selectedPersona.bridgeConfig.port}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {selectedPersona.rustDeskConfig?.enabled && (
                        <div className="p-4 rounded-lg bg-orange-500/5 border border-orange-500/20">
                          <h3 className="text-sm font-bold mb-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Monitor className="w-4 h-4 text-orange-500" />
                              RustDesk Remote Desktop
                            </div>
                            <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-500 border-green-500/20">
                              Configured
                            </Badge>
                          </h3>
                          <div className="space-y-2">
                            <div className="flex justify-between text-[10px]">
                              <span className="text-muted-foreground">User ID</span>
                              <span className="font-mono">{selectedPersona.rustDeskConfig.id}</span>
                            </div>
                            {selectedPersona.rustDeskConfig.server && (
                              <div className="flex justify-between text-[10px]">
                                <span className="text-muted-foreground">Relay Server</span>
                                <span className="font-mono truncate max-w-[150px]">{selectedPersona.rustDeskConfig.server}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {selectedPersona.notebookConfig?.enabled && selectedPersona.notebookConfig.id && (
                        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                          <h3 className="text-sm font-bold mb-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Brain className="w-4 h-4 text-primary" />
                              Cloud Brain (Google Notebook)
                            </div>
                            <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-500 border-green-500/20">
                              Synced
                            </Badge>
                          </h3>
                          <div className="space-y-2">
                            <div className="flex justify-between text-[10px]">
                              <span className="text-muted-foreground">Notebook Name</span>
                              <span className="font-bold">{selectedPersona.notebookConfig.name}</span>
                            </div>
                            <div className="flex justify-between text-[10px]">
                              <span className="text-muted-foreground">Notebook ID</span>
                              <span className="font-mono truncate max-w-[150px]">{selectedPersona.notebookConfig.id}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                            <Shield className="w-3 h-3" />
                            Tailscale Network Health
                          </h3>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6" 
                            onClick={fetchTailscaleDevices}
                            disabled={isLoadingDevices}
                          >
                            <RefreshCw className={`w-3 h-3 ${isLoadingDevices ? 'animate-spin' : ''}`} />
                          </Button>
                        </div>
                        
                        <div className="grid gap-2">
                          {tailscaleDevices.length > 0 ? (
                            tailscaleDevices.map(device => (
                              <div key={device.id} className="flex items-center justify-between p-3 rounded-lg border bg-card/50 text-[11px]">
                                <div className="flex items-center gap-3">
                                  <div className={`w-2 h-2 rounded-full ${device.online ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-muted'}`} />
                                  <div>
                                    <div className="font-bold flex items-center gap-2">
                                      {device.name.split('.')[0]}
                                      <Badge variant="secondary" className="text-[9px] py-0 px-1 h-3.5 bg-muted/50">{device.os}</Badge>
                                    </div>
                                    <div className="text-muted-foreground font-mono text-[10px]">{device.addresses[0]}</div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-muted-foreground text-[10px]">
                                    {device.online ? 'Connected' : `Last seen ${new Date(device.lastSeen).toLocaleDateString()}`}
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="py-8 text-center border border-dashed rounded-lg">
                              <p className="text-xs text-muted-foreground">No devices found on your tailnet.</p>
                              <p className="text-[10px] text-muted-foreground mt-1 px-4">Ensure TAILSCALE_API_KEY and TAILSCALE_TAILNET are correctly configured in Settings.</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 rounded-md border bg-card">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Active Tools</span>
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="outline" className="text-[10px]">memory_retrieval</Badge>
                            <Badge variant="outline" className="text-[10px]">persona_attributes</Badge>
                            {selectedPersona.bridgeConfig?.enabled && (
                              <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-500">bridge_query</Badge>
                            )}
                            <Badge variant="outline" className="text-[10px] border-green-500/30 text-green-500">list_tailscale_devices</Badge>
                            <Badge variant="outline" className="text-[10px] border-orange-500/30 text-orange-500">get_rustdesk_info</Badge>
                            {selectedPersona.notebookConfig?.enabled && (
                              <>
                                <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">query_cloud_brain</Badge>
                                <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">write_to_cloud_brain</Badge>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="p-3 rounded-md border bg-card">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Context Window</span>
                          <div className="text-xs font-mono">1.0M tokens</div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Footer Info */}
            <div className="flex items-center justify-center gap-8 py-4 opacity-30 grayscale">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Neural Engine v3.1</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Low Latency PCM</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">MCP Linked</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
