import React, { useState, useEffect } from 'react';
import { 
  autonomousRouter, 
  RouterDecision, 
  SMART_INTENT_PRESETS,
  IntentPreset 
} from '../services/autonomousRouter';
import { Persona } from '../types/persona';
import {
  Sparkles,
  Search,
  ArrowRight,
  PhoneCall,
  Award,
  Cpu,
  Workflow,
  Mic,
  CheckCircle2,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  X,
  Bot,
  Zap,
  ShieldAlert,
  Info
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { toast } from 'sonner';

interface AutonomousRouterBarProps {
  selectedPersona: Persona;
  personas: Persona[];
  onSelectPersona: (persona: Persona) => void;
  onOpenTelephony: () => void;
  onOpenLicense: () => void;
  onOpenArtemis: () => void;
  onOpenBlastDag: () => void;
  onOpenVoiceStudio: () => void;
  onCloseAllModals?: () => void;
  userFriendlyMode: boolean;
  onToggleUserFriendlyMode: (friendly: boolean) => void;
  latestVoiceTranscript?: string;
}

export function AutonomousRouterBar({
  selectedPersona,
  personas,
  onSelectPersona,
  onOpenTelephony,
  onOpenLicense,
  onOpenArtemis,
  onOpenBlastDag,
  onOpenVoiceStudio,
  onCloseAllModals,
  userFriendlyMode,
  onToggleUserFriendlyMode,
  latestVoiceTranscript
}: AutonomousRouterBarProps) {
  const [inputText, setInputText] = useState('');
  const [currentDecision, setCurrentDecision] = useState<RouterDecision | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastAutoDispatchedId, setLastAutoDispatchedId] = useState<string | null>(null);
  const [previewTarget, setPreviewTarget] = useState<string | null>(null);

  // Subscribe to router decisions
  useEffect(() => {
    const unsubscribe = autonomousRouter.subscribe((decision) => {
      setCurrentDecision(decision);
      
      // Autonomous Dispatch Heuristic:
      // If user friendly mode is active and subsystem is needed, auto-open the right tool!
      if (userFriendlyMode && decision.isSubsystemNeeded && decision.id !== lastAutoDispatchedId) {
        setLastAutoDispatchedId(decision.id);
        executeDecisionAction(decision, true);
      } else if (decision.target === 'none' && onCloseAllModals) {
        // Router determined casual conversation or dismissal -> clean up modal popups
        // Note: we don't forcefully close unless user gave a dismissal keyword
        if (decision.reason.includes('dismissed')) {
          onCloseAllModals();
        }
      }
    });

    return () => unsubscribe();
  }, [userFriendlyMode, lastAutoDispatchedId]);

  // Evaluate incoming voice transcripts in real-time
  useEffect(() => {
    if (latestVoiceTranscript && latestVoiceTranscript.trim().length > 3) {
      autonomousRouter.evaluate(
        latestVoiceTranscript, 
        'voice_transcript', 
        selectedPersona.id
      );
    }
  }, [latestVoiceTranscript, selectedPersona.id]);

  // Preview prediction as user types
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);
    if (!val.trim()) {
      setPreviewTarget(null);
      return;
    }
    const preliminary = autonomousRouter.evaluate(val, 'user_input', selectedPersona.id);
    if (preliminary.isSubsystemNeeded) {
      setPreviewTarget(preliminary.actionLabel);
    } else {
      setPreviewTarget('Natural Conversation');
    }
  };

  const handleExecute = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const decision = autonomousRouter.evaluate(
      inputText, 
      'user_input', 
      selectedPersona.id
    );
    executeDecisionAction(decision, false);
    setInputText('');
    setPreviewTarget(null);
  };

  const handleSelectPreset = (preset: IntentPreset) => {
    const decision = autonomousRouter.evaluate(
      preset.prompt, 
      'preset_intent', 
      selectedPersona.id
    );
    executeDecisionAction(decision, false);
  };

  const executeDecisionAction = (decision: RouterDecision, isAutonomous: boolean) => {
    switch (decision.target) {
      case 'telephony':
        if (decision.recommendedPersonaId && decision.recommendedPersonaId !== selectedPersona.id) {
          const targetP = personas.find(p => p.id === decision.recommendedPersonaId);
          if (targetP) onSelectPersona(targetP);
        }
        onOpenTelephony();
        toast.info(
          isAutonomous 
            ? `Autonomous Router: Opened Telephony dialer for "${decision.directive?.slice(0, 35)}..."`
            : `Mounted Sovereign Telephony Gateway`
        );
        break;

      case 'vocal_license':
        if (decision.recommendedPersonaId && decision.recommendedPersonaId !== selectedPersona.id) {
          const targetP = personas.find(p => p.id === decision.recommendedPersonaId);
          if (targetP) onSelectPersona(targetP);
        }
        onOpenLicense();
        toast.info(
          isAutonomous 
            ? `Autonomous Router: Opened Vocal Rights Deed generator`
            : `Opened Sovereign Vocal License Engine`
        );
        break;

      case 'artemis_test':
        if (decision.recommendedPersonaId && decision.recommendedPersonaId !== selectedPersona.id) {
          const targetP = personas.find(p => p.id === decision.recommendedPersonaId);
          if (targetP) onSelectPersona(targetP);
        }
        onOpenArtemis();
        toast.info(
          isAutonomous 
            ? `Autonomous Router: Dispatched Google Artemis Autonomous Runner`
            : `Launched Google Artemis Autonomous Test Runner`
        );
        break;

      case 'blast_dag':
        onOpenBlastDag();
        toast.info(
          isAutonomous 
            ? `Autonomous Router: Activated B.L.A.S.T. DAG Invariant Monitor`
            : `Mounted B.L.A.S.T. Kinetic Protocol DAG`
        );
        break;

      case 'voice_studio':
        onOpenVoiceStudio();
        toast.info(`Mounted Knight Voice Reference Studio`);
        break;

      case 'persona_switch':
        if (decision.recommendedPersonaId) {
          const targetP = personas.find(p => p.id === decision.recommendedPersonaId);
          if (targetP) {
            onSelectPersona(targetP);
            toast.success(`Autonomous Router: Aligned conversation with ${targetP.name} (${targetP.role})`);
          }
        }
        break;

      case 'none':
      default:
        toast.success(`Dialogue mode active: Handled by ${selectedPersona.name}`);
        break;
    }
  };

  const getTargetIcon = (target?: string) => {
    switch (target) {
      case 'telephony': return <PhoneCall className="w-3.5 h-3.5 text-cyan-400" />;
      case 'vocal_license': return <Award className="w-3.5 h-3.5 text-amber-300" />;
      case 'artemis_test': return <Cpu className="w-3.5 h-3.5 text-blue-400" />;
      case 'blast_dag': return <Workflow className="w-3.5 h-3.5 text-amber-400" />;
      case 'voice_studio': return <Mic className="w-3.5 h-3.5 text-emerald-400" />;
      default: return <Sparkles className="w-3.5 h-3.5 text-[#dfc486]" />;
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-3 pb-2 transition-all">
      {/* Main Glass Deck */}
      <div className="rounded-xl bg-[#0d121c]/90 border border-[#dfc486]/30 shadow-[0_4px_25px_rgba(0,0,0,0.4)] backdrop-blur-md overflow-hidden">
        {/* Top Control Bar: Mode switch & Live Status */}
        <div className="flex flex-wrap items-center justify-between px-3.5 py-2 border-b border-zinc-800/80 gap-2 bg-gradient-to-r from-black/40 via-zinc-950/30 to-black/40">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
            <span className="text-[11px] font-mono tracking-wider uppercase text-zinc-300 flex items-center gap-1.5 font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-[#dfc486]" />
              AUTONOMOUS INTENT ROUTER
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#dfc486]/10 text-[#dfc486] border border-[#dfc486]/20">
              {userFriendlyMode ? 'Smart Auto Mode' : 'Pro Telemetry'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            {/* Friendly Mode Toggle */}
            <button
              type="button"
              onClick={() => {
                const next = !userFriendlyMode;
                onToggleUserFriendlyMode(next);
                toast.info(next ? 'Smart Friendly Mode: Clutter suppressed' : 'Pro Mode: All developer tools exposed');
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] transition-colors ${
                userFriendlyMode 
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25'
                  : 'bg-zinc-800/60 text-zinc-400 border border-zinc-700 hover:text-zinc-200'
              }`}
              title="Toggle between simplified user-friendly autonomous interface and manual pro controls"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>{userFriendlyMode ? 'Auto-Pilot: ON' : 'Manual Mode'}</span>
            </button>

            {/* Decision History Toggle */}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-zinc-400 hover:text-zinc-200 p-1 flex items-center gap-1 text-[11px]"
              title="View router logic trace"
            >
              <span>{isExpanded ? 'Hide Trace' : 'Router Log'}</span>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Input & Instant Natural Language Bar */}
        <div className="p-3">
          <form onSubmit={handleExecute} className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                value={inputText}
                onChange={handleInputChange}
                placeholder={`Ask or command anything... (e.g. "Call support line", "Protect my voice rights", "Run automated test on Pixel", "Explain ancient Rome")`}
                className="w-full bg-black/60 border border-zinc-700/80 rounded-lg pl-10 pr-32 py-2.5 text-xs text-[#efece4] placeholder:text-zinc-500 focus:outline-none focus:border-[#dfc486] transition-colors"
              />

              {/* Dynamic Target Preview Tag */}
              {previewTarget && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-amber-200 border border-zinc-700 pointer-events-none">
                  <Zap className="w-3 h-3 text-[#dfc486]" />
                  <span>Will Route: {previewTarget}</span>
                </div>
              )}
            </div>

            <Button
              type="submit"
              size="sm"
              className="h-10 px-4 bg-gradient-to-r from-[#dfc486] to-[#bba06b] hover:from-[#f0db9e] hover:to-[#ceb37c] text-zinc-950 font-semibold text-xs rounded-lg flex items-center gap-1.5 shrink-0 shadow-[0_2px_10px_rgba(223,196,134,0.3)]"
            >
              <span>Auto-Dispatch</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </form>

          {/* Quick-Action Preset Chips (User-Friendly One-Tap) */}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] font-mono text-zinc-500 mr-1 uppercase">Quick Actions:</span>
            {SMART_INTENT_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-[#dfc486] border border-zinc-800 hover:border-[#dfc486]/40 transition-all cursor-pointer"
              >
                <span>{preset.icon}</span>
                <span>{preset.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Real-Time Decision Status Pill & Chain of Thought */}
        {currentDecision && (
          <div className="px-3.5 py-2 bg-black/40 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            <div className="flex items-center gap-2 text-zinc-400">
              {getTargetIcon(currentDecision.target)}
              <span className="text-zinc-300 font-medium">
                {currentDecision.isSubsystemNeeded ? (
                  <>Subsystem Active: <strong className="text-[#dfc486]">{currentDecision.actionLabel}</strong></>
                ) : (
                  <>Direct Voice Mode: <strong className="text-emerald-400">Subsystems Dormant (Zero Clutter)</strong></>
                )}
              </span>
              <span className="text-zinc-500 hidden sm:inline">&bull;</span>
              <span className="text-zinc-400 text-[11px] hidden sm:inline line-clamp-1">
                {currentDecision.reason}
              </span>
            </div>

            {currentDecision.isSubsystemNeeded && (
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => executeDecisionAction(currentDecision, false)}
                  className="h-6 px-2 text-[11px] text-[#dfc486] hover:bg-[#dfc486]/10 font-mono"
                >
                  Open {currentDecision.actionLabel} &rarr;
                </Button>
                {onCloseAllModals && (
                  <button
                    type="button"
                    onClick={onCloseAllModals}
                    className="text-[10px] text-zinc-500 hover:text-zinc-300 underline"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Expandable Decision Log / Trace */}
        {isExpanded && (
          <div className="p-3 bg-black/70 border-t border-zinc-800 text-xs font-mono space-y-2 max-h-40 overflow-y-auto">
            <div className="flex items-center justify-between text-[11px] text-zinc-400 font-bold uppercase">
              <span>Autonomous Decision Log</span>
              <span>Source & Confidence</span>
            </div>
            {autonomousRouter.getRecentDecisions().length === 0 ? (
              <div className="text-zinc-500 text-[11px]">No routing actions recorded yet.</div>
            ) : (
              autonomousRouter.getRecentDecisions().map((d) => (
                <div key={d.id} className="p-2 rounded bg-zinc-900/50 border border-zinc-800/80 flex items-start justify-between gap-2 text-[11px]">
                  <div>
                    <span className="text-[#dfc486] font-bold mr-2">[{d.actionLabel}]</span>
                    <span className="text-zinc-300">{d.reason}</span>
                    {d.directive && (
                      <div className="text-zinc-500 text-[10px] mt-0.5 truncate max-w-md">
                        Trigger: "{d.directive}"
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-emerald-400 font-semibold">{Math.round(d.confidence * 100)}%</span>
                    <div className="text-zinc-500 text-[9px]">{d.source}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
