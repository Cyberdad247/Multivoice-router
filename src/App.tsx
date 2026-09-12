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
import { AssimilationProtocol } from './components/AssimilationProtocol';
import { CamelotCarousel } from './components/CamelotCarousel';
import { SoundscapeManager } from './components/SoundscapeManager';
import { PersonaBackdrop } from './components/PersonaBackdrop';
import { PlayVoicePreviewButton } from './components/PlayVoicePreviewButton';
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Badge } from './components/ui/badge';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import { useAuth } from './components/AuthProvider';
import { personaService, transcriptService } from './lib/firestore';
import { DiagnosticDialog } from './components/DiagnosticDialog';
import { VoiceStudio } from './components/VoiceStudio';
import { BlastDagModal } from './components/BlastDagModal';
import { TelephonyModal } from './components/TelephonyModal';
import { SystemVitalsBar } from './components/SystemVitalsBar';
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
  User as UserIcon,
  ShieldAlert,
  Mic2,
  Workflow,
  Layers,
  LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { getVoiceMetadata } from './constants/voices';

export default function App() {
  const { user, loading: authLoading, login, logout } = useAuth();
  const [personas, setPersonas] = useState<Persona[]>(INITIAL_PERSONAS);
  const [selectedPersona, setSelectedPersona] = useState<Persona>(INITIAL_PERSONAS[0]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<{ mode: 'create' | 'edit'; persona: Persona | null } | null>(null);
  const [tailscaleDevices, setTailscaleDevices] = useState<TailscaleDevice[]>([]);
  const [tailscaleConfigured, setTailscaleConfigured] = useState<boolean | null>(null);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false);
  const [showLiveChat, setShowLiveChat] = useState(false);
  const [showBlastHud, setShowBlastHud] = useState(false);
  const [showVoiceStudio, setShowVoiceStudio] = useState(false);
  const [showTelephony, setShowTelephony] = useState(false);

  const fetchTailscaleDevices = useCallback(async (isManual = false) => {
    setIsLoadingDevices(true);
    try {
      const res = await fetch('/api/tailscale/devices');
      if (!res.ok) {
        setTailscaleDevices([]);
        setTailscaleConfigured(false);
        if (isManual) {
          toast.error('Tailscale service is currently unavailable.');
        }
        return;
      }

      const data = await res.json();
      if (Array.isArray(data)) {
        setTailscaleDevices(data);
        setTailscaleConfigured(true);
        if (isManual) {
          toast.success(`Tailscale refreshed: ${data.length} device(s) found.`);
        }
      } else if (data && typeof data === 'object') {
        const devices = Array.isArray(data.devices) ? data.devices : [];
        setTailscaleDevices(devices);
        const configured = data.configured ?? (devices.length > 0);
        setTailscaleConfigured(configured);

        if (isManual) {
          if (!configured) {
            toast.info('Tailscale bridge is not configured (optional). Add TAILSCALE_API_KEY in settings to connect.');
          } else if (data.error) {
            toast.error(`Tailscale: ${data.error}`);
          } else {
            toast.success(`Tailscale refreshed: ${devices.length} device(s) found.`);
          }
        }
      } else {
        setTailscaleDevices([]);
        setTailscaleConfigured(false);
      }
    } catch (e) {
      // Non-blocking warning for polling / background queries to prevent false alarm toasts
      console.warn('Tailscale device query notice:', e);
      setTailscaleDevices([]);
      setTailscaleConfigured(false);
      if (isManual) {
        toast.error('Tailscale bridge unreachable. Check server connection or configuration.');
      }
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

      <DiagnosticDialog 
        isOpen={isDiagnosticOpen} 
        onClose={() => setIsDiagnosticOpen(false)} 
      />

      {/* Main Camelot Knight Voice Picker (Exact UI) */}
      <CamelotCarousel
        personas={personas}
        selectedPersona={selectedPersona}
        onSelectPersona={handlePersonaChange}
        isConnected={isConnected}
        isConnecting={isConnecting}
        onConnect={handleToggleConnection}
        showLiveChat={showLiveChat}
        onToggleLiveChat={() => setShowLiveChat(!showLiveChat)}
        showBlastHud={showBlastHud}
        onToggleBlastHud={() => setShowBlastHud(!showBlastHud)}
        onOpenDiagnostics={() => setIsDiagnosticOpen(true)}
        onOpenVoiceStudio={() => setShowVoiceStudio(true)}
        onOpenTelephony={() => setShowTelephony(true)}
      />

      {/* System 2 Sovereign Vitals & Enclave HUD Bar */}
      <SystemVitalsBar
        selectedPersona={selectedPersona}
        isConnected={isConnected}
      />

      {/* Knight Voice Studio Modal (Firebase Storage) */}
      <VoiceStudio 
        isOpen={showVoiceStudio}
        onClose={() => setShowVoiceStudio(false)}
        personas={personas}
        selectedPersona={selectedPersona}
        onSelectPersona={handlePersonaChange}
        onUpdatePersona={handleSavePersona}
      />

      {/* Sovereign Telephony & SIP Gateway Modal */}
      <TelephonyModal
        isOpen={showTelephony}
        onClose={() => setShowTelephony(false)}
        selectedPersona={selectedPersona}
      />

      {/* System 2 B.L.A.S.T. Kinetic Protocol DAG Modal with Formal Z3 Verifier */}
      <BlastDagModal
        isOpen={showBlastHud}
        onClose={() => setShowBlastHud(false)}
        selectedPersona={selectedPersona}
        isConnected={isConnected}
        onToggleConnection={handleToggleConnection}
      />

      {/* Slide-over / Expandable Live HUD & Intelligence Section */}
      {(showLiveChat || isConnected) && (
        <aside 
          className="fixed bottom-0 left-0 right-0 z-40 max-h-[50vh] border-t border-[#dfc486]/40 bg-[#080b10]/95 backdrop-blur-xl shadow-2xl flex flex-col transition-all overflow-hidden"
        >
          <div className="px-6 py-2.5 border-b border-[#dfc486]/20 bg-[#0b1622]/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-[#dfc486]'}`} />
              <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-[#dfc486]">
                Live Intelligence Chamber &bull; {selectedPersona.name} ({selectedPersona.voice})
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <SoundscapeManager 
                conversationIntensity={audioLevel}
                isConnected={isConnected}
              />
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 text-xs text-[#89909b] hover:text-[#efece4]"
                onClick={() => setShowLiveChat(false)}
              >
                Hide HUD ✕
              </Button>
            </div>
          </div>

          <div className="p-4 overflow-y-auto flex-1 max-w-6xl mx-auto w-full">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-4 space-y-4">
                <AudioVisualizer 
                  level={audioLevel} 
                  isActive={isConnected} 
                  color={isConnected ? "#dfc486" : "#89909b"}
                />
                <div className="p-3 rounded-lg border border-[#dfc486]/20 bg-black/40 text-xs space-y-1">
                  <div className="flex justify-between text-[#89909b]">
                    <span>Status</span>
                    <span className="font-mono text-[#dfc486]">{isConnected ? 'LIVE CONNECTED' : 'STANDBY'}</span>
                  </div>
                  <div className="flex justify-between text-[#89909b]">
                    <span>Persona</span>
                    <span className="text-[#efece4]">{selectedPersona.name}</span>
                  </div>
                  <div className="flex justify-between text-[#89909b]">
                    <span>Voice Model</span>
                    <span className="text-[#dfc486]">{selectedPersona.voice}</span>
                  </div>
                  <div className="flex justify-between text-[#89909b]">
                    <span>Armor Slot</span>
                    <span className="font-mono">Slot {selectedPersona.armorSlot ?? 0}</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-8">
                <Tabs defaultValue="chat" className="w-full">
                  <TabsList className="bg-transparent border-b border-[#dfc486]/20 h-9 gap-4">
                    <TabsTrigger value="chat" className="text-xs data-[state=active]:text-[#dfc486] data-[state=active]:border-b-2 data-[state=active]:border-[#dfc486] rounded-none px-2">
                      <History className="w-3.5 h-3.5 mr-1" />
                      Live Transcript
                    </TabsTrigger>
                    <TabsTrigger value="sources" className="text-xs data-[state=active]:text-[#dfc486] data-[state=active]:border-b-2 data-[state=active]:border-[#dfc486] rounded-none px-2">
                      <BookOpen className="w-3.5 h-3.5 mr-1" />
                      Sources ({selectedPersona.sources?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="notebook" className="text-xs data-[state=active]:text-[#dfc486] data-[state=active]:border-b-2 data-[state=active]:border-[#dfc486] rounded-none px-2">
                      <Brain className="w-3.5 h-3.5 mr-1" />
                      NotebookLM RAG
                    </TabsTrigger>
                    <TabsTrigger value="voice-studio" className="text-xs data-[state=active]:text-[#dfc486] data-[state=active]:border-b-2 data-[state=active]:border-[#dfc486] rounded-none px-2">
                      <Mic className="w-3.5 h-3.5 mr-1" />
                      Voice Studio
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="chat" className="pt-2 max-h-[30vh] overflow-y-auto">
                    <LiveChat messages={transcription} />
                  </TabsContent>

                  <TabsContent value="sources" className="pt-2">
                    <SourceManager 
                      sources={selectedPersona.sources || []}
                      onAddSource={handleAddSource}
                      onRemoveSource={handleRemoveSource}
                      disabled={isConnected || isConnecting}
                    />
                  </TabsContent>

                  <TabsContent value="notebook" className="pt-2">
                    <NotebookLMLab 
                      persona={selectedPersona}
                      sources={selectedPersona.sources || []}
                    />
                  </TabsContent>

                  <TabsContent value="voice-studio" className="pt-2 max-h-[32vh] overflow-y-auto">
                    <VoiceStudio 
                      embedded={true}
                      personas={personas}
                      selectedPersona={selectedPersona}
                      onSelectPersona={handlePersonaChange}
                      onUpdatePersona={handleSavePersona}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
