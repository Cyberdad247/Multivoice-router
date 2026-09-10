import React, { useState, useEffect } from 'react';
import { Persona, GeminiLiveVoice, GeminiVoiceMetadata } from '../types/persona';
import { GEMINI_LIVE_VOICES, getVoiceMetadata } from '../constants/voices';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { ScrollArea } from "./ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Badge } from "./ui/badge";
import { cn } from "../lib/utils";
import { 
  X, 
  Plus, 
  Trash2, 
  Network, 
  Monitor, 
  Book, 
  Cloud, 
  Brain, 
  Loader2, 
  Mic2, 
  Radio, 
  ListFilter, 
  Volume2, 
  Square,
  Sparkles 
} from 'lucide-react';
import { Switch } from "./ui/switch";
import { toast } from 'sonner';

interface PersonaDialogProps {
  persona: Persona | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedPersona: Persona) => void;
  mode: 'create' | 'edit';
}

const DEFAULT_PERSONA: Persona = {
  id: '',
  name: '',
  role: '',
  description: '',
  voice: 'Zephyr',
  systemInstruction: '',
  attributes: {
    tone: '',
    expertise: [],
    personality: '',
  },
  memory: [],
  notebookConfig: {
    enabled: false,
    id: '',
    name: 'Persona Brain',
  },
  bridgeConfig: {
    enabled: false,
    ip: '',
    port: 80,
    protocol: 'http',
  },
  rustDeskConfig: {
    enabled: false,
    id: '',
    password: '',
    server: '',
  },
  ragConfig: {
    enabled: true,
    autoRetrieveInLive: true,
    topK: 3,
    minSimilarityThreshold: 0.25,
    autoExtractSessionNotes: true,
  },
};

export function PersonaDialog({ persona, isOpen, onClose, onSave, mode }: PersonaDialogProps) {
  const [formData, setFormData] = useState<Persona>(DEFAULT_PERSONA);
  const [isCreatingNotebook, setIsCreatingNotebook] = useState(false);
  const [voiceSelectorMode, setVoiceSelectorMode] = useState<'radio' | 'dropdown'>('radio');
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);

  const stopVoiceSample = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setPreviewingVoice(null);
  };

  useEffect(() => {
    return () => {
      stopVoiceSample();
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      stopVoiceSample();
    }
  }, [isOpen]);

  const handleVoiceSelect = (voiceId: GeminiLiveVoice) => {
    const meta = getVoiceMetadata(voiceId);
    setFormData(prev => ({
      ...prev,
      voice: voiceId,
      attributes: {
        ...prev.attributes,
        tone: prev.attributes.tone ? prev.attributes.tone : meta.tone
      }
    }));
  };

  const playVoiceSample = (e: React.MouseEvent, voiceMeta: GeminiVoiceMetadata) => {
    e.stopPropagation();
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      toast.info(`Voice sample: "${voiceMeta.sampleQuote}"`);
      return;
    }

    if (previewingVoice === voiceMeta.id) {
      stopVoiceSample();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(voiceMeta.sampleQuote);
    
    if (voiceMeta.id === 'Charon') {
      utterance.pitch = 0.6;
      utterance.rate = 0.88;
    } else if (voiceMeta.id === 'Puck') {
      utterance.pitch = 1.35;
      utterance.rate = 1.15;
    } else if (voiceMeta.id === 'Fenrir') {
      utterance.pitch = 0.9;
      utterance.rate = 1.25;
    } else if (voiceMeta.id === 'Kore') {
      utterance.pitch = 0.95;
      utterance.rate = 0.92;
    } else if (voiceMeta.id === 'Aoede') {
      utterance.pitch = 1.15;
      utterance.rate = 0.95;
    } else {
      utterance.pitch = 1.05;
      utterance.rate = 1.0;
    }

    utterance.onend = () => setPreviewingVoice(null);
    utterance.onerror = () => setPreviewingVoice(null);

    setPreviewingVoice(voiceMeta.id);
    window.speechSynthesis.speak(utterance);
  };

  const createNotebook = async () => {
    setIsCreatingNotebook(true);
    try {
      const res = await fetch('/api/google/notebook/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: `${formData.name}'s Persona Brain` })
      });
      const data = await res.json();
      if (data.docId) {
        setFormData({
          ...formData,
          notebookConfig: {
            enabled: true,
            id: data.docId,
            name: data.title
          }
        });
        toast.success("Cloud Brain notebook created and linked!");
      }
    } catch (e) {
      toast.error("Failed to create notebook. Ensure you are signed in to Google.");
    } finally {
      setIsCreatingNotebook(false);
    }
  };

  useEffect(() => {
    if (mode === 'edit' && persona) {
      setFormData({ ...persona });
    } else {
      setFormData({ ...DEFAULT_PERSONA, id: crypto.randomUUID() });
    }
  }, [persona, mode, isOpen]);

  const handleMemoryChange = (index: number, value: string) => {
    const newMemory = [...formData.memory];
    newMemory[index] = value;
    setFormData({ ...formData, memory: newMemory });
  };

  const addMemoryFragment = () => {
    // Validation: Check if there's already an empty fragment
    if (formData.memory.some(m => !m.trim())) {
      toast.error("Please fill in existing memory fragments before adding a new one.");
      return;
    }
    
    // Limit check
    if (formData.memory.length >= 20) {
      toast.error("Memory fragments are limited to 20 per persona to maintain context clarity.");
      return;
    }

    setFormData({ ...formData, memory: [...formData.memory, ""] });
    toast.success("New memory fragment slot added.");
  };

  const removeMemoryFragment = (index: number) => {
    const newMemory = formData.memory.filter((_, i) => i !== index);
    setFormData({ ...formData, memory: newMemory });
  };

  const handleExpertiseChange = (index: number, value: string) => {
    const newExpertise = [...formData.attributes.expertise];
    newExpertise[index] = value;
    setFormData({
      ...formData,
      attributes: { ...formData.attributes, expertise: newExpertise },
    });
  };

  const addExpertise = () => {
    // Validation: Check for empty fields
    if (formData.attributes.expertise.some(e => !e.trim())) {
      toast.error("Please fill in existing expertise areas before adding a new one.");
      return;
    }

    // Limit check
    if (formData.attributes.expertise.length >= 10) {
      toast.error("Expertise areas are limited to 10 per persona.");
      return;
    }

    setFormData({
      ...formData,
      attributes: {
        ...formData.attributes,
        expertise: [...formData.attributes.expertise, ""],
      },
    });
    toast.success("New expertise area slot added.");
  };

  const removeExpertise = (index: number) => {
    const newExpertise = formData.attributes.expertise.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      attributes: { ...formData.attributes, expertise: newExpertise },
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>{mode === 'edit' ? `Edit Persona: ${persona?.name}` : 'Create New Persona'}</DialogTitle>
          <DialogDescription>
            {mode === 'edit' 
              ? 'Modify the identity, instructions, neural voice, and memory fragments for this AI persona.' 
              : 'Define a new AI persona with unique traits, distinct Gemini Live voice, and memories.'}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 p-6 pt-2">
          <div className="space-y-6 pb-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input 
                  id="name" 
                  placeholder="e.g. Orion"
                  value={formData.name} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input 
                  id="role" 
                  placeholder="e.g. Quantum Mechanic"
                  value={formData.role} 
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Short Description</Label>
              <Input 
                id="description" 
                placeholder="A brief summary of who this persona is..."
                value={formData.description} 
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="personality">Personality Type</Label>
                <Input 
                  id="personality" 
                  placeholder="e.g. Stoic, Enthusiastic"
                  value={formData.attributes.personality} 
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    attributes: { ...formData.attributes, personality: e.target.value } 
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tone">Tone of Voice</Label>
                <Input 
                  id="tone" 
                  placeholder="e.g. Calm and scholarly"
                  value={formData.attributes.tone} 
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    attributes: { ...formData.attributes, tone: e.target.value } 
                  })}
                />
              </div>
            </div>

            {/* AI Voice Model (Gemini Multimodal Live) Section */}
            <div className="space-y-3 p-4 rounded-xl border border-primary/20 bg-primary/5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Mic2 className="w-4 h-4 text-primary" />
                    <Label className="text-sm font-semibold text-foreground">AI Voice Model</Label>
                    <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                      Gemini Multimodal Live
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Select the neural speech model used during live multimodal audio sessions.
                  </p>
                </div>

                {/* Dropdown or Radio Selector Toggle */}
                <div className="flex items-center rounded-lg bg-background p-1 border shadow-xs shrink-0 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setVoiceSelectorMode('radio')}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer",
                      voiceSelectorMode === 'radio'
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Radio className="w-3.5 h-3.5" />
                    <span>Radio Cards</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVoiceSelectorMode('dropdown')}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer",
                      voiceSelectorMode === 'dropdown'
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <ListFilter className="w-3.5 h-3.5" />
                    <span>Dropdown</span>
                  </button>
                </div>
              </div>

              {voiceSelectorMode === 'radio' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1" role="radiogroup" aria-label="Gemini Live Voice Models">
                  {GEMINI_LIVE_VOICES.map((voice) => {
                    const isSelected = formData.voice === voice.id;
                    const isAudioPlaying = previewingVoice === voice.id;

                    return (
                      <div
                        key={voice.id}
                        role="radio"
                        aria-checked={isSelected}
                        tabIndex={0}
                        onClick={() => handleVoiceSelect(voice.id)}
                        onKeyDown={(e) => {
                          if (e.key === ' ' || e.key === 'Enter') {
                            e.preventDefault();
                            handleVoiceSelect(voice.id);
                          }
                        }}
                        className={cn(
                          "p-3 rounded-lg border text-left cursor-pointer transition-all relative flex flex-col justify-between group",
                          isSelected
                            ? "bg-background border-primary shadow-sm ring-1 ring-primary"
                            : "bg-background/60 hover:bg-background border-border/80 hover:border-border"
                        )}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2">
                              <div
                                className={cn(
                                  "w-4 h-4 rounded-full border flex items-center justify-center transition-all shrink-0",
                                  isSelected
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-muted-foreground/40 group-hover:border-muted-foreground"
                                )}
                              >
                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
                              </div>
                              <div>
                                <span className="font-semibold text-sm text-foreground">{voice.name}</span>
                                <span className="text-[10px] text-muted-foreground ml-1.5 font-mono">({voice.gender})</span>
                              </div>
                            </div>

                            <Badge
                              variant="outline"
                              className={cn("text-[9px] px-1.5 py-0 font-medium", voice.color)}
                            >
                              {voice.tag}
                            </Badge>
                          </div>

                          <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2 mb-2">
                            {voice.description}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-2 text-[10px]">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <span className="font-mono">{voice.pitch}</span>
                            <span>•</span>
                            <span className="font-mono">{voice.tempo}</span>
                          </div>

                          <Button
                            type="button"
                            variant={isAudioPlaying ? "default" : "secondary"}
                            size="sm"
                            className="h-6 text-[10px] px-2 gap-1 rounded-md"
                            onClick={(e) => playVoiceSample(e, voice)}
                            title={`Preview sample for ${voice.name}`}
                          >
                            {isAudioPlaying ? (
                              <>
                                <Square className="w-2.5 h-2.5 fill-current" />
                                <span>Stop</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3 h-3 text-primary" />
                                <span>Preview</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  <div className="space-y-1.5">
                    <Label htmlFor="voice-dropdown" className="text-xs text-muted-foreground">
                      Voice Selection Dropdown
                    </Label>
                    <Select
                      value={formData.voice}
                      onValueChange={(value: GeminiLiveVoice) => handleVoiceSelect(value)}
                    >
                      <SelectTrigger id="voice-dropdown" className="bg-background h-10 w-full">
                        <SelectValue placeholder="Select a Gemini Live voice model" />
                      </SelectTrigger>
                      <SelectContent>
                        {GEMINI_LIVE_VOICES.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            <div className="flex items-center justify-between w-full gap-3 py-0.5">
                              <span className="font-medium text-foreground">{v.name} ({v.gender})</span>
                              <span className="text-xs text-muted-foreground">{v.tag} • {v.pitch}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Selected Voice Preview Card */}
                  {(() => {
                    const activeMeta = getVoiceMetadata(formData.voice);
                    const isAudioPlaying = previewingVoice === activeMeta.id;
                    return (
                      <div className="p-3 rounded-lg border bg-background flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-foreground">{activeMeta.name}</span>
                            <span className="text-[10px] text-muted-foreground">({activeMeta.gender})</span>
                            <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0", activeMeta.color)}>
                              {activeMeta.tag}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {activeMeta.pitch} • {activeMeta.tempo}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">{activeMeta.description}</p>
                          <p className="text-[10px] text-muted-foreground/80 italic">"{activeMeta.sampleQuote}"</p>
                        </div>

                        <Button
                          type="button"
                          variant={isAudioPlaying ? "default" : "outline"}
                          size="sm"
                          className="h-8 text-xs px-3 gap-1.5 shrink-0 self-start sm:self-auto"
                          onClick={(e) => playVoiceSample(e, activeMeta)}
                        >
                          {isAudioPlaying ? (
                            <>
                              <Square className="w-3 h-3 fill-current" />
                              <span>Stop Preview</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3.5 h-3.5 text-primary" />
                              <span>Preview Voice</span>
                            </>
                          )}
                        </Button>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="systemInstruction">System Instruction (The "Brain")</Label>
              <Textarea 
                id="systemInstruction" 
                placeholder="Detailed instructions on how the AI should behave, speak, and think..."
                className="min-h-[120px] font-mono text-xs"
                value={formData.systemInstruction} 
                onChange={(e) => setFormData({ ...formData, systemInstruction: e.target.value })}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Expertise Areas</Label>
                <Button variant="outline" size="sm" onClick={addExpertise} className="h-7 px-2 text-xs">
                  <Plus className="w-3 h-3 mr-1" /> Add Area
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {formData.attributes.expertise.map((exp, i) => (
                  <div key={i} className="flex gap-2">
                    <Input 
                      value={exp} 
                      onChange={(e) => handleExpertiseChange(i, e.target.value)}
                      className="text-xs h-8 font-mono"
                      placeholder="e.g. Astrophysics"
                    />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive shrink-0"
                      onClick={() => removeExpertise(i)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <Network className="w-4 h-4 text-primary" />
                    Rust Bridge Integration (Tailscale)
                  </Label>
                  <p className="text-[10px] text-muted-foreground">
                    Connect this persona to your Rust bridge on Tailscale.
                  </p>
                </div>
                <Switch 
                  checked={formData.bridgeConfig?.enabled} 
                  onCheckedChange={(checked) => setFormData({ 
                    ...formData, 
                    bridgeConfig: { ...(formData.bridgeConfig || DEFAULT_PERSONA.bridgeConfig!), enabled: checked } 
                  })}
                />
              </div>

              {formData.bridgeConfig?.enabled && (
                <div className="grid grid-cols-12 gap-4 pt-2">
                  <div className="col-span-6 space-y-2">
                    <Label htmlFor="bridge-ip">Tailscale IP / Hostname</Label>
                    <Input 
                      id="bridge-ip" 
                      placeholder="e.g. 100.106.246.126"
                      value={formData.bridgeConfig.ip} 
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        bridgeConfig: { ...formData.bridgeConfig!, ip: e.target.value } 
                      })}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="col-span-3 space-y-2">
                    <Label htmlFor="bridge-port">Port</Label>
                    <Input 
                      id="bridge-port" 
                      type="number"
                      placeholder="80"
                      value={formData.bridgeConfig.port} 
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        bridgeConfig: { ...formData.bridgeConfig!, port: parseInt(e.target.value) || 80 } 
                      })}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="col-span-3 space-y-2">
                    <Label htmlFor="bridge-proto">Protocol</Label>
                    <Select 
                      value={formData.bridgeConfig.protocol} 
                      onValueChange={(value: any) => setFormData({ 
                        ...formData, 
                        bridgeConfig: { ...formData.bridgeConfig!, protocol: value } 
                      })}
                    >
                      <SelectTrigger id="bridge-proto" className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="http">HTTP</SelectItem>
                        <SelectItem value="https">HTTPS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-primary" />
                    RustDesk Remote Desktop
                  </Label>
                  <p className="text-[10px] text-muted-foreground">
                    Link a RustDesk agent for remote assistance.
                  </p>
                </div>
                <Switch 
                  checked={formData.rustDeskConfig?.enabled} 
                  onCheckedChange={(checked) => setFormData({ 
                    ...formData, 
                    rustDeskConfig: { ...(formData.rustDeskConfig || DEFAULT_PERSONA.rustDeskConfig!), enabled: checked } 
                  })}
                />
              </div>

              {formData.rustDeskConfig?.enabled && (
                <div className="grid grid-cols-12 gap-4 pt-2">
                  <div className="col-span-4 space-y-2">
                    <Label htmlFor="rd-id">RustDesk ID</Label>
                    <Input 
                      id="rd-id" 
                      placeholder="User ID"
                      value={formData.rustDeskConfig.id} 
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        rustDeskConfig: { ...formData.rustDeskConfig!, id: e.target.value } 
                      })}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="col-span-4 space-y-2">
                    <Label htmlFor="rd-pw">Password (Optional)</Label>
                    <Input 
                      id="rd-pw" 
                      type="password"
                      placeholder="Password"
                      value={formData.rustDeskConfig.password} 
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        rustDeskConfig: { ...formData.rustDeskConfig!, password: e.target.value } 
                      })}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="col-span-4 space-y-2">
                    <Label htmlFor="rd-server">Relay Server</Label>
                    <Input 
                      id="rd-server" 
                      placeholder="e.g. rustdesk.example.com"
                      value={formData.rustDeskConfig.server} 
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        rustDeskConfig: { ...formData.rustDeskConfig!, server: e.target.value } 
                      })}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4 border rounded-lg p-4 bg-primary/5 border-primary/20">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-primary" />
                    Cloud Brain (Google Notebook)
                  </Label>
                  <p className="text-[10px] text-muted-foreground">
                    Link a Google Doc as a persistent long-term memory for this persona.
                  </p>
                </div>
                <Switch 
                  checked={formData.notebookConfig?.enabled} 
                  onCheckedChange={(checked) => setFormData({ 
                    ...formData, 
                    notebookConfig: { ...(formData.notebookConfig || DEFAULT_PERSONA.notebookConfig!), enabled: checked } 
                  })}
                />
              </div>

              {formData.notebookConfig?.enabled && (
                <div className="space-y-3 pt-2">
                  {!formData.notebookConfig.id ? (
                    <Button 
                      variant="outline" 
                      className="w-full h-10 border-dashed"
                      onClick={createNotebook}
                      disabled={isCreatingNotebook}
                    >
                      {isCreatingNotebook ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Cloud className="w-4 h-4 mr-2" />
                      )}
                      Initialize Cloud Brain Notebook
                    </Button>
                  ) : (
                    <div className="flex items-center justify-between p-2 rounded bg-background border text-[11px]">
                      <div className="flex items-center gap-2">
                        <Book className="w-4 h-4 text-primary" />
                        <div>
                          <p className="font-bold">{formData.notebookConfig.name}</p>
                          <p className="text-muted-foreground font-mono text-[9px]">{formData.notebookConfig.id}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => setFormData({
                        ...formData,
                        notebookConfig: { ...formData.notebookConfig!, id: '', name: '' }
                      })}>
                        Disconnect
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* RAG Memory Retrieval Configuration */}
            <div className="space-y-4 border rounded-lg p-4 bg-purple-500/5 border-purple-500/20">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    RAG Knowledge & Memory Engine
                  </Label>
                  <p className="text-[10px] text-muted-foreground">
                    Enables NotebookLM CloudBrain vector retrieval during live voice and conversational recall.
                  </p>
                </div>
                <Switch 
                  checked={formData.ragConfig?.enabled ?? true} 
                  onCheckedChange={(checked) => setFormData({ 
                    ...formData, 
                    ragConfig: { ...(formData.ragConfig || { enabled: true, autoRetrieveInLive: true, topK: 3, minSimilarityThreshold: 0.25 }), enabled: checked } 
                  })}
                />
              </div>

              {(formData.ragConfig?.enabled ?? true) && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between p-2.5 rounded bg-background/60 border text-xs">
                    <div className="space-y-0.5">
                      <span className="font-semibold text-foreground">Live Voice Auto-Retrieval</span>
                      <p className="text-[10px] text-muted-foreground">
                        Allows Gemini Live to automatically trigger query_persona_rag to ground voice responses.
                      </p>
                    </div>
                    <Switch
                      checked={formData.ragConfig?.autoRetrieveInLive ?? true}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        ragConfig: { ...(formData.ragConfig || { enabled: true, autoRetrieveInLive: true, topK: 3, minSimilarityThreshold: 0.25 }), autoRetrieveInLive: checked }
                      })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <Label htmlFor="rag-top-k" className="text-xs">Context Chunks (Top-K)</Label>
                      <Input
                        id="rag-top-k"
                        type="number"
                        min={1}
                        max={10}
                        value={formData.ragConfig?.topK ?? 3}
                        onChange={(e) => setFormData({
                          ...formData,
                          ragConfig: {
                            ...(formData.ragConfig || { enabled: true, autoRetrieveInLive: true, topK: 3, minSimilarityThreshold: 0.25 }),
                            topK: Math.max(1, Math.min(10, parseInt(e.target.value) || 3))
                          }
                        })}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="rag-threshold" className="text-xs">Similarity Threshold</Label>
                      <Input
                        id="rag-threshold"
                        type="number"
                        step={0.05}
                        min={0.1}
                        max={0.9}
                        value={formData.ragConfig?.minSimilarityThreshold ?? 0.25}
                        onChange={(e) => setFormData({
                          ...formData,
                          ragConfig: {
                            ...(formData.ragConfig || { enabled: true, autoRetrieveInLive: true, topK: 3, minSimilarityThreshold: 0.25 }),
                            minSimilarityThreshold: parseFloat(e.target.value) || 0.25
                          }
                        })}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Memory Fragments (RAG Context)</Label>
                <Button variant="outline" size="sm" onClick={addMemoryFragment} className="h-7 px-2 text-xs">
                  <Plus className="w-3 h-3 mr-1" /> Add Fragment
                </Button>
              </div>
              <div className="space-y-2">
                {formData.memory.map((fragment, i) => (
                  <div key={i} className="flex gap-2">
                    <Textarea 
                      value={fragment} 
                      onChange={(e) => handleMemoryChange(i, e.target.value)}
                      className="text-xs min-h-[60px] font-mono"
                      placeholder="A specific fact or memory this persona possesses..."
                    />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive shrink-0"
                      onClick={() => removeMemoryFragment(i)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 border-t bg-muted/20">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(formData)} disabled={!formData.name || !formData.role}>
            {mode === 'edit' ? 'Save Changes' : 'Create Persona'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
