import React, { useState, useEffect } from 'react';
import { Persona } from '../types/persona';
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
import { X, Plus, Trash2, Network, Monitor, Book, Cloud, Brain, Loader2 } from 'lucide-react';
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
};

export function PersonaDialog({ persona, isOpen, onClose, onSave, mode }: PersonaDialogProps) {
  const [formData, setFormData] = useState<Persona>(DEFAULT_PERSONA);
  const [isCreatingNotebook, setIsCreatingNotebook] = useState(false);

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
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>{mode === 'edit' ? `Edit Persona: ${persona?.name}` : 'Create New Persona'}</DialogTitle>
          <DialogDescription>
            {mode === 'edit' 
              ? 'Modify the identity, instructions, and memory fragments for this AI persona.' 
              : 'Define a new AI persona with unique traits, voice, and memories.'}
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="voice">Voice</Label>
                <Select 
                  value={formData.voice} 
                  onValueChange={(value: any) => setFormData({ ...formData, voice: value })}
                >
                  <SelectTrigger id="voice">
                    <SelectValue placeholder="Select a voice" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Zephyr">Zephyr (Inspirational)</SelectItem>
                    <SelectItem value="Kore">Kore (Nurturing)</SelectItem>
                    <SelectItem value="Fenrir">Fenrir (Edgy)</SelectItem>
                    <SelectItem value="Puck">Puck (Playful)</SelectItem>
                    <SelectItem value="Charon">Charon (Authoritative)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
