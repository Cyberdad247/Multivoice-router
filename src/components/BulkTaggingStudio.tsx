import React, { useState, useMemo } from 'react';
import { Persona, BulkTraitDefinition, BulkTraitCategory } from '../types/persona';
import { 
  COMMON_SYSTEM_TRAITS, 
  COMMON_MEMORY_TRAITS, 
  ALL_COMMON_TRAITS 
} from '../constants/bulk-traits';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { toast } from 'sonner';
import {
  Tag,
  Cpu,
  Brain,
  CheckSquare,
  Square,
  Sparkles,
  Plus,
  Trash2,
  Layers,
  ArrowRight,
  ShieldCheck,
  Search,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Terminal,
  Database,
  Filter
} from 'lucide-react';
import { RadialQualityScore } from './RadialQualityScore';
import { calculateCloningQuality } from '../lib/cloning-quality';

interface BulkTaggingStudioProps {
  personas: Persona[];
  onUpdatePersonas: (updatedPersonas: Persona[]) => Promise<void> | void;
  onSelectPersona?: (persona: Persona) => void;
  selectedPersonaId?: string;
  embedded?: boolean;
}

export const BulkTaggingStudio: React.FC<BulkTaggingStudioProps> = ({
  personas,
  onUpdatePersonas,
  onSelectPersona,
  selectedPersonaId,
  embedded = false
}) => {
  // 1. Persona Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    // Default to currently selected persona + others or all
    return selectedPersonaId ? [selectedPersonaId] : personas.slice(0, 3).map(p => p.id);
  });
  const [personaSearch, setPersonaSearch] = useState('');

  // 2. Trait Presets Selection State
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'all' | 'system' | 'memory' | 'custom'>('all');
  const [selectedTraitIds, setSelectedTraitIds] = useState<string[]>(['sys-zero-copy-ipc', 'mem-8gb-boundary']);
  
  // 3. Custom Trait Builder State
  const [customTraits, setCustomTraits] = useState<BulkTraitDefinition[]>([]);
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState<BulkTraitCategory>('system');
  const [customDescription, setCustomDescription] = useState('');
  const [customDirective, setCustomDirective] = useState('');

  // 4. Injection Targets & Mode
  const [applyToTraitsList, setApplyToTraitsList] = useState(true);
  const [applyToMemory, setApplyToMemory] = useState(true);
  const [applyToSystemInstruction, setApplyToSystemInstruction] = useState(false);
  const [mergeMode, setMergeMode] = useState<'append' | 'replace'>('append');

  // 5. Bulk Untag / Remove State
  const [showUntagPanel, setShowUntagPanel] = useState(false);
  const [traitToRemove, setTraitToRemove] = useState('');

  // 6. Execution state
  const [isApplying, setIsApplying] = useState(false);
  const [previewExpanded, setPreviewExpanded] = useState(false);

  // Filtered Personas
  const filteredPersonas = useMemo(() => {
    if (!personaSearch.trim()) return personas;
    const q = personaSearch.toLowerCase();
    return personas.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.role.toLowerCase().includes(q) || 
      p.voice.toLowerCase().includes(q)
    );
  }, [personas, personaSearch]);

  // Combined Trait Presets (Built-in + Custom)
  const allAvailableTraits = useMemo(() => {
    return [...ALL_COMMON_TRAITS, ...customTraits];
  }, [customTraits]);

  const displayedTraits = useMemo(() => {
    if (activeCategoryFilter === 'system') {
      return allAvailableTraits.filter(t => t.category === 'system');
    }
    if (activeCategoryFilter === 'memory') {
      return allAvailableTraits.filter(t => t.category === 'memory');
    }
    if (activeCategoryFilter === 'custom') {
      return allAvailableTraits.filter(t => t.isCustom);
    }
    return allAvailableTraits;
  }, [allAvailableTraits, activeCategoryFilter]);

  // Currently queued traits to apply
  const queuedTraits = useMemo(() => {
    return allAvailableTraits.filter(t => selectedTraitIds.includes(t.id));
  }, [allAvailableTraits, selectedTraitIds]);

  // Selection toggle helpers
  const handleTogglePersona = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllPersonas = () => {
    setSelectedIds(personas.map(p => p.id));
  };

  const handleDeselectAllPersonas = () => {
    setSelectedIds([]);
  };

  const handleToggleTrait = (traitId: string) => {
    setSelectedTraitIds(prev => 
      prev.includes(traitId) ? prev.filter(id => id !== traitId) : [...prev, traitId]
    );
  };

  const handleSelectAllTraits = () => {
    setSelectedTraitIds(displayedTraits.map(t => t.id));
  };

  const handleClearSelectedTraits = () => {
    setSelectedTraitIds([]);
  };

  // Add a new Custom Trait
  const handleAddCustomTrait = () => {
    if (!customName.trim()) {
      toast.error('Please enter a trait name.');
      return;
    }

    const newTrait: BulkTraitDefinition = {
      id: `custom-${Date.now()}`,
      name: customName.trim(),
      category: customCategory,
      description: customDescription.trim() || `User-defined ${customCategory} trait.`,
      directiveContent: customDirective.trim() || customName.trim(),
      badgeColor: customCategory === 'system' ? '#38bdf8' : '#dfc486',
      isCustom: true
    };

    setCustomTraits(prev => [newTrait, ...prev]);
    setSelectedTraitIds(prev => [...prev, newTrait.id]);
    setCustomName('');
    setCustomDescription('');
    setCustomDirective('');
    toast.success(`Created custom ${customCategory} trait: "${newTrait.name}"`);
  };

  // Compute live diff preview for selected personas
  const liveDiffPreview = useMemo(() => {
    const selectedPersonas = personas.filter(p => selectedIds.includes(p.id));
    return selectedPersonas.map(p => {
      const existingTraits = p.traits || [];
      const existingMemory = p.memory || [];

      // Calculate new traits
      const newTraitTags = queuedTraits.map(t => `${t.category === 'system' ? '[System]' : '[Memory]'} ${t.name}`);
      const addedTraits = newTraitTags.filter(tag => !existingTraits.includes(tag));
      
      // Calculate new memory statements
      const newMemoryStatements = queuedTraits
        .filter(t => t.category === 'memory' || applyToMemory)
        .map(t => t.directiveContent);
      const addedMemory = newMemoryStatements.filter(stmt => !existingMemory.includes(stmt));

      // Calculate system instruction impact
      const systemDirectives = queuedTraits
        .filter(t => t.category === 'system')
        .map(t => `• ${t.directiveContent}`);

      return {
        persona: p,
        existingTraitsCount: existingTraits.length,
        addedTraitsCount: applyToTraitsList ? (mergeMode === 'append' ? addedTraits.length : queuedTraits.length) : 0,
        existingMemoryCount: existingMemory.length,
        addedMemoryCount: applyToMemory ? (mergeMode === 'append' ? addedMemory.length : newMemoryStatements.length) : 0,
        systemDirectivesCount: applyToSystemInstruction ? systemDirectives.length : 0,
        sampleNewTraits: addedTraits.slice(0, 3),
        sampleNewMemory: addedMemory.slice(0, 2)
      };
    });
  }, [personas, selectedIds, queuedTraits, applyToTraitsList, applyToMemory, applyToSystemInstruction, mergeMode]);

  // Execute Bulk Apply
  const handleApplyBulkTraits = async () => {
    if (selectedIds.length === 0) {
      toast.error('Please select at least one persona.');
      return;
    }
    if (queuedTraits.length === 0) {
      toast.error('Please select or create at least one trait to apply.');
      return;
    }
    if (!applyToTraitsList && !applyToMemory && !applyToSystemInstruction) {
      toast.error('Please check at least one destination (Traits list, Memory, or System Instruction).');
      return;
    }

    setIsApplying(true);
    try {
      const updatedList: Persona[] = personas.map(p => {
        if (!selectedIds.includes(p.id)) return p;

        let updatedTraits = [...(p.traits || [])];
        let updatedMemory = [...(p.memory || [])];
        let updatedSystemInstruction = p.systemInstruction || '';

        // 1. Apply to traits
        if (applyToTraitsList) {
          const traitLabels = queuedTraits.map(t => `${t.category === 'system' ? '[System]' : '[Memory]'} ${t.name}`);
          if (mergeMode === 'replace') {
            updatedTraits = traitLabels;
          } else {
            // Append with deduplication
            for (const label of traitLabels) {
              if (!updatedTraits.includes(label)) {
                updatedTraits.push(label);
              }
            }
          }
          // Cap at 30 to comply with firestore rules and display sanity
          updatedTraits = updatedTraits.slice(0, 30);
        }

        // 2. Apply to memory
        if (applyToMemory) {
          const memoryStatements = queuedTraits
            .filter(t => t.category === 'memory' || t.directiveContent)
            .map(t => t.directiveContent);

          if (mergeMode === 'replace') {
            updatedMemory = memoryStatements;
          } else {
            for (const stmt of memoryStatements) {
              if (!updatedMemory.includes(stmt)) {
                updatedMemory.push(stmt);
              }
            }
          }
          // Cap at 30
          updatedMemory = updatedMemory.slice(0, 30);
        }

        // 3. Apply to system instruction
        if (applyToSystemInstruction) {
          const systemDirectives = queuedTraits
            .filter(t => t.category === 'system')
            .map(t => `- ${t.name}: ${t.directiveContent}`);

          if (systemDirectives.length > 0) {
            const block = `\n\n[Active System Directives]:\n${systemDirectives.join('\n')}`;
            if (!updatedSystemInstruction.includes('[Active System Directives]')) {
              updatedSystemInstruction = `${updatedSystemInstruction.trim()}${block}`;
            } else {
              // Append to existing section
              updatedSystemInstruction = updatedSystemInstruction.replace(
                /\[Active System Directives\]:[\s\S]*$/,
                `[Active System Directives]:\n${systemDirectives.join('\n')}`
              );
            }
          }
        }

        return {
          ...p,
          traits: updatedTraits,
          memory: updatedMemory,
          systemInstruction: updatedSystemInstruction
        };
      });

      // Invoke update handler
      await onUpdatePersonas(updatedList.filter(p => selectedIds.includes(p.id)));

      toast.success(
        `Applied ${queuedTraits.length} trait(s) to ${selectedIds.length} persona(s) successfully!`,
        {
          description: `Updated destinations: ${[
            applyToTraitsList ? 'Traits' : null,
            applyToMemory ? 'Memory' : null,
            applyToSystemInstruction ? 'System Directives' : null
          ].filter(Boolean).join(', ')}`
        }
      );
    } catch (err: any) {
      console.error('Bulk apply failed:', err);
      toast.error(err?.message || 'Failed to apply bulk traits to personas.');
    } finally {
      setIsApplying(false);
    }
  };

  // Bulk Untag / Remove Trait
  const handleBulkRemoveTrait = async () => {
    if (!traitToRemove.trim()) {
      toast.error('Please enter or select a trait tag to remove.');
      return;
    }
    if (selectedIds.length === 0) {
      toast.error('Select at least one persona to remove traits from.');
      return;
    }

    setIsApplying(true);
    try {
      const targetStr = traitToRemove.trim().toLowerCase();

      const updatedList = personas.map(p => {
        if (!selectedIds.includes(p.id)) return p;

        const currentTraits = p.traits || [];
        const filteredTraits = currentTraits.filter(t => 
          !t.toLowerCase().includes(targetStr)
        );

        const currentMemory = p.memory || [];
        const filteredMemory = currentMemory.filter(m => 
          !m.toLowerCase().includes(targetStr)
        );

        return {
          ...p,
          traits: filteredTraits,
          memory: filteredMemory
        };
      });

      await onUpdatePersonas(updatedList.filter(p => selectedIds.includes(p.id)));
      toast.success(`Removed matching traits from ${selectedIds.length} persona(s).`);
      setTraitToRemove('');
    } catch (err: any) {
      toast.error('Failed to remove traits.');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="space-y-6 text-[#efece4]">
      {/* 1. Header Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-[#0c121b] via-[#101b2b] to-[#0c121b] border border-[#dfc486]/30 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#dfc486]/10 text-[#dfc486] border border-[#dfc486]/30">
              <Tag className="w-4 h-4" />
            </span>
            <h3 className="font-serif text-lg text-[#efece4] tracking-tight flex items-center gap-2">
              Bulk Persona Trait &amp; Memory Studio
            </h3>
            <Badge variant="outline" className="text-[10px] font-mono border-amber-500/40 text-amber-300">
              Multi-Agent Sync
            </Badge>
          </div>
          <p className="text-xs text-[#89909b] max-w-2xl">
            Simultaneously assign authoritative <strong className="text-cyan-400">System Directives</strong> (behavioral rules, IPC protocols) and <strong className="text-amber-400">Memory Invariants</strong> (contextual facts, 8GB constraints) across multiple Knights.
          </p>
        </div>

        {/* Selected count badges & quick action */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs font-mono font-bold text-[#dfc486]">
              {selectedIds.length} of {personas.length} Selected
            </div>
            <div className="text-[10px] font-mono text-[#89909b]">
              {queuedTraits.length} Trait(s) Queued
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleApplyBulkTraits}
            disabled={isApplying || selectedIds.length === 0 || queuedTraits.length === 0}
            className="bg-gradient-to-r from-[#bba06b] to-[#e5cd99] text-[#15140f] hover:from-[#cbaf7a] hover:to-[#f0dbad] font-mono font-bold text-xs px-4 gap-1.5 shadow-md"
          >
            {isApplying ? (
              <>
                <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                Applying...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                Apply to {selectedIds.length} Knights
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 2. Persona Selection Matrix */}
      <div className="p-4 rounded-xl bg-[#0c121b] border border-zinc-800 space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-zinc-800/80">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-[#dfc486] font-semibold flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" /> Target Knights Selection
            </span>
            <span className="text-[11px] text-[#89909b]">
              ({selectedIds.length}/{personas.length} chosen)
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3 h-3 text-zinc-500 absolute left-2.5 top-2.5" />
              <Input 
                value={personaSearch}
                onChange={e => setPersonaSearch(e.target.value)}
                placeholder="Search knights..."
                className="h-7 text-xs pl-7 bg-black/40 border-zinc-800 text-[#efece4]"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSelectAllPersonas}
              className="h-7 text-[11px] font-mono border-zinc-800 text-[#89909b] hover:text-[#efece4]"
            >
              Select All
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDeselectAllPersonas}
              className="h-7 text-[11px] font-mono text-zinc-500 hover:text-zinc-300"
            >
              Clear
            </Button>
          </div>
        </div>

        {/* Personas Checkbox Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
          {filteredPersonas.map((persona) => {
            const isSelected = selectedIds.includes(persona.id);
            const traitsCount = persona.traits?.length || 0;
            const memoryCount = persona.memory?.length || 0;

            return (
              <div
                key={persona.id}
                onClick={() => handleTogglePersona(persona.id)}
                className={`p-3 rounded-lg border transition-all cursor-pointer select-none relative ${
                  isSelected
                    ? 'bg-[#dfc486]/10 border-[#dfc486]/60 shadow-[0_0_15px_rgba(223,196,134,0.08)]'
                    : 'bg-black/30 border-zinc-800/80 hover:border-zinc-700 hover:bg-black/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-3 h-3 rounded-full border border-white/20 shrink-0" 
                      style={{ backgroundColor: persona.color || '#dfc486' }}
                    />
                    <div className="truncate">
                      <h4 className={`text-xs font-bold truncate ${isSelected ? 'text-[#dfc486]' : 'text-[#efece4]'}`}>
                        {persona.name}
                      </h4>
                      <p className="text-[10px] text-zinc-400 truncate">
                        {persona.role}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <RadialQualityScore
                      score={calculateCloningQuality(persona).score}
                      size="xs"
                      strokeWidth={2.5}
                      tier={calculateCloningQuality(persona).tier}
                      tooltipText={`${persona.name} Cloning Quality: ${calculateCloningQuality(persona).score}%`}
                    />
                    <div className="text-[#dfc486]">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-[#dfc486]" />
                      ) : (
                        <Square className="w-4 h-4 text-zinc-600" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Traits and Memory existing pill badges */}
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-zinc-800/60 text-[9px] font-mono text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Tag className="w-2.5 h-2.5 text-cyan-400" />
                    {traitsCount} traits
                  </span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1">
                    <Brain className="w-2.5 h-2.5 text-amber-400" />
                    {memoryCount} mem
                  </span>
                  <span className="ml-auto text-zinc-500 font-sans">
                    {persona.voice}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Trait Presets Library & Custom Builder */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left / Center Column: Presets Library (8 cols) */}
        <div className="lg:col-span-8 p-4 rounded-xl bg-[#0c121b] border border-zinc-800 space-y-4">
          
          {/* Tabs Filter Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-zinc-800">
              <button
                type="button"
                onClick={() => setActiveCategoryFilter('all')}
                className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                  activeCategoryFilter === 'all'
                    ? 'bg-[#dfc486] text-[#080b10] font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                All ({allAvailableTraits.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveCategoryFilter('system')}
                className={`px-3 py-1 rounded text-xs font-mono transition-colors flex items-center gap-1 ${
                  activeCategoryFilter === 'system'
                    ? 'bg-cyan-500 text-black font-bold'
                    : 'text-cyan-400/80 hover:text-cyan-300'
                }`}
              >
                <Cpu className="w-3 h-3" />
                System ({allAvailableTraits.filter(t => t.category === 'system').length})
              </button>
              <button
                type="button"
                onClick={() => setActiveCategoryFilter('memory')}
                className={`px-3 py-1 rounded text-xs font-mono transition-colors flex items-center gap-1 ${
                  activeCategoryFilter === 'memory'
                    ? 'bg-amber-500 text-black font-bold'
                    : 'text-amber-400/80 hover:text-amber-300'
                }`}
              >
                <Brain className="w-3 h-3" />
                Memory ({allAvailableTraits.filter(t => t.category === 'memory').length})
              </button>
              {customTraits.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveCategoryFilter('custom')}
                  className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                    activeCategoryFilter === 'custom'
                      ? 'bg-purple-500 text-white font-bold'
                      : 'text-purple-400 hover:text-purple-300'
                  }`}
                >
                  Custom ({customTraits.length})
                </button>
              )}
            </div>

            {/* Quick Action: Select / Deselect traits */}
            <div className="flex items-center gap-2 text-xs font-mono">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleSelectAllTraits}
                className="h-6 text-[11px] text-zinc-400 hover:text-zinc-200"
              >
                Select Shown
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleClearSelectedTraits}
                className="h-6 text-[11px] text-zinc-500 hover:text-zinc-300"
              >
                Clear
              </Button>
            </div>
          </div>

          {/* Traits List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
            {displayedTraits.map((trait) => {
              const isSelected = selectedTraitIds.includes(trait.id);
              const isSystem = trait.category === 'system';

              return (
                <div
                  key={trait.id}
                  onClick={() => handleToggleTrait(trait.id)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer text-left select-none relative ${
                    isSelected
                      ? isSystem
                        ? 'bg-cyan-950/20 border-cyan-500/60 shadow-[0_0_12px_rgba(6,182,212,0.1)]'
                        : 'bg-amber-950/20 border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.1)]'
                      : 'bg-black/30 border-zinc-800/80 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`p-1 rounded text-[10px] ${
                        isSystem 
                          ? 'bg-cyan-500/20 text-cyan-300' 
                          : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {isSystem ? <Cpu className="w-3 h-3" /> : <Brain className="w-3 h-3" />}
                      </span>
                      <span className="text-xs font-bold text-[#efece4]">
                        {trait.name}
                      </span>
                    </div>

                    <div className="shrink-0">
                      {isSelected ? (
                        <CheckSquare className={`w-4 h-4 ${isSystem ? 'text-cyan-400' : 'text-amber-400'}`} />
                      ) : (
                        <Square className="w-4 h-4 text-zinc-600" />
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-[#89909b] line-clamp-2 leading-relaxed mb-2">
                    {trait.description}
                  </p>

                  <div className="p-1.5 rounded bg-black/50 border border-zinc-800/80 text-[10px] font-mono text-zinc-400 italic truncate">
                    &ldquo;{trait.directiveContent}&rdquo;
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Configuration & Custom Creator (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Target Placement Switches */}
          <div className="p-4 rounded-xl bg-[#0c121b] border border-zinc-800 space-y-3">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#dfc486] flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" /> Injection Targets
            </h4>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-black/30 border border-zinc-800/60">
                <div className="space-y-0.5">
                  <span className="font-semibold text-[#efece4] flex items-center gap-1">
                    <Tag className="w-3 h-3 text-cyan-400" /> Persona Traits Badges
                  </span>
                  <p className="text-[10px] text-zinc-400">Adds tag to persona card</p>
                </div>
                <Switch 
                  checked={applyToTraitsList} 
                  onCheckedChange={setApplyToTraitsList} 
                />
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-black/30 border border-zinc-800/60">
                <div className="space-y-0.5">
                  <span className="font-semibold text-[#efece4] flex items-center gap-1">
                    <Brain className="w-3 h-3 text-amber-400" /> Memory Array
                  </span>
                  <p className="text-[10px] text-zinc-400">Injects fact into long-term recall</p>
                </div>
                <Switch 
                  checked={applyToMemory} 
                  onCheckedChange={setApplyToMemory} 
                />
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-black/30 border border-zinc-800/60">
                <div className="space-y-0.5">
                  <span className="font-semibold text-[#efece4] flex items-center gap-1">
                    <Terminal className="w-3 h-3 text-emerald-400" /> System Instructions
                  </span>
                  <p className="text-[10px] text-zinc-400">Appends to Gemini prompt</p>
                </div>
                <Switch 
                  checked={applyToSystemInstruction} 
                  onCheckedChange={setApplyToSystemInstruction} 
                />
              </div>

              {/* Merge Strategy */}
              <div className="pt-2 border-t border-zinc-800/80">
                <label className="text-[11px] font-mono text-zinc-400 block mb-1.5">Merge Strategy</label>
                <div className="grid grid-cols-2 gap-1.5 bg-black/40 p-1 rounded-lg border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setMergeMode('append')}
                    className={`py-1 text-[10px] font-mono rounded ${
                      mergeMode === 'append'
                        ? 'bg-[#dfc486] text-[#080b10] font-bold'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Append &amp; Safe
                  </button>
                  <button
                    type="button"
                    onClick={() => setMergeMode('replace')}
                    className={`py-1 text-[10px] font-mono rounded ${
                      mergeMode === 'replace'
                        ? 'bg-amber-600 text-white font-bold'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Overwrite
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Custom Trait Creator */}
          <div className="p-4 rounded-xl bg-[#0c121b] border border-zinc-800 space-y-3">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#dfc486] flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Define Custom Trait
            </h4>

            <div className="space-y-2 text-xs">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCustomCategory('system')}
                  className={`flex-1 py-1 rounded text-[10px] font-mono border ${
                    customCategory === 'system'
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                      : 'border-zinc-800 text-zinc-400'
                  }`}
                >
                  System Trait
                </button>
                <button
                  type="button"
                  onClick={() => setCustomCategory('memory')}
                  className={`flex-1 py-1 rounded text-[10px] font-mono border ${
                    customCategory === 'memory'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'border-zinc-800 text-zinc-400'
                  }`}
                >
                  Memory Trait
                </button>
              </div>

              <Input
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                placeholder="Trait Name (e.g. Sub-Millisecond Voice IPC)"
                className="h-7 text-xs bg-black/40 border-zinc-800 text-[#efece4]"
              />

              <Textarea
                value={customDirective}
                onChange={e => setCustomDirective(e.target.value)}
                placeholder="Directive or Memory constraint text..."
                rows={2}
                className="text-xs bg-black/40 border-zinc-800 text-[#efece4]"
              />

              <Button
                size="sm"
                variant="outline"
                onClick={handleAddCustomTrait}
                className="w-full h-7 text-xs font-mono border-[#dfc486]/40 text-[#dfc486] hover:bg-[#dfc486]/10 gap-1"
              >
                <Plus className="w-3 h-3" />
                Add to Queued Traits
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Live Diff Preview & Execution Bar */}
      <div className="p-4 rounded-xl bg-[#0c121b] border border-[#dfc486]/40 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#efece4]">
              Simultaneous Bulk Execution &bull; {selectedIds.length} Target(s)
            </h4>
          </div>

          <button
            type="button"
            onClick={() => setPreviewExpanded(!previewExpanded)}
            className="text-xs font-mono text-[#dfc486] hover:underline"
          >
            {previewExpanded ? 'Hide Diff Preview' : 'Show Live Diff Preview'}
          </button>
        </div>

        {/* Live Diff Preview Drawer */}
        {previewExpanded && (
          <div className="p-3 rounded-lg bg-black/50 border border-zinc-800 space-y-2 animate-in fade-in">
            <div className="text-[11px] font-mono text-zinc-400">
              Per-persona impact summary before commit:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {liveDiffPreview.map(diff => (
                <div key={diff.persona.id} className="p-2 rounded bg-zinc-900/60 border border-zinc-800 text-[11px]">
                  <div className="font-bold text-[#dfc486] flex items-center justify-between">
                    <span>{diff.persona.name}</span>
                    <span className="text-[9px] text-zinc-500 font-mono">{diff.persona.voice}</span>
                  </div>
                  <div className="text-[10px] font-mono text-zinc-300 mt-1 space-y-0.5">
                    <div>Traits: {diff.existingTraitsCount} &rarr; <span className="text-emerald-400 font-bold">+{diff.addedTraitsCount} new</span></div>
                    <div>Memory: {diff.existingMemoryCount} &rarr; <span className="text-amber-400 font-bold">+{diff.addedMemoryCount} facts</span></div>
                    {applyToSystemInstruction && (
                      <div className="text-cyan-400">System Instruction: +{diff.systemDirectivesCount} directives</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom CTA Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-zinc-800">
          <div className="text-xs text-[#89909b] flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-[#dfc486]" />
            <span>Persisted directly across local state &amp; Firebase Firestore batch sync.</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Toggle Bulk Untag Drawer */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowUntagPanel(!showUntagPanel)}
              className="h-8 text-xs font-mono border-red-500/30 text-red-300 hover:bg-red-500/10 gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Bulk Untag / Remove
            </Button>

            <Button
              size="sm"
              onClick={handleApplyBulkTraits}
              disabled={isApplying || selectedIds.length === 0 || queuedTraits.length === 0}
              className="h-8 bg-gradient-to-r from-[#bba06b] to-[#e5cd99] text-[#15140f] hover:from-[#cbaf7a] hover:to-[#f0dbad] font-mono font-bold text-xs px-5 gap-1.5 shadow-lg"
            >
              {isApplying ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                  Applying Changes...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Apply {queuedTraits.length} Trait(s) to {selectedIds.length} Persona(s)
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Bulk Untag Drawer */}
        {showUntagPanel && (
          <div className="p-3 rounded-lg bg-red-950/20 border border-red-500/30 space-y-2 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-red-300 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Bulk Untag Across Selected Knights ({selectedIds.length})
              </span>
              <button 
                type="button" 
                onClick={() => setShowUntagPanel(false)}
                className="text-[10px] font-mono text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
            </div>
            <p className="text-[11px] text-zinc-400">
              Enter any trait name or keyword to remove matching entries from the Traits and Memory of the {selectedIds.length} chosen knight(s).
            </p>
            <div className="flex items-center gap-2">
              <Input
                value={traitToRemove}
                onChange={e => setTraitToRemove(e.target.value)}
                placeholder="e.g. Zero-Copy IPC or 8GB Scarcity"
                className="h-7 text-xs bg-black/50 border-red-900/50 text-[#efece4]"
              />
              <Button
                size="sm"
                onClick={handleBulkRemoveTrait}
                disabled={isApplying || !traitToRemove.trim() || selectedIds.length === 0}
                className="h-7 bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold shrink-0"
              >
                Remove from {selectedIds.length} Personas
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
