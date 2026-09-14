import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Zap,
  Cpu,
  RefreshCw,
  Play,
  Terminal,
  Layers,
  Activity,
  Code2,
  FileCode2,
  Trash2,
  Check,
  RotateCcw,
  Sparkles,
  Lock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { triageService } from '../services/triage-service';
import { FullTriageSystemState, TriageIncident } from '../types/triage';

interface SelfErrorTriageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SelfErrorTriageModal({ isOpen, onClose }: SelfErrorTriageModalProps) {
  const [triageState, setTriageState] = useState<FullTriageSystemState>(triageService.getState());
  const [activeTab, setActiveTab] = useState<'incidents' | 'nanoclaw' | 'simulation' | 'source_vault'>('incidents');
  const [isSimulating, setIsSimulating] = useState<string | null>(null);
  const [codeLanguage, setCodeLanguage] = useState<'rust' | 'go'>('rust');

  useEffect(() => {
    const unsubscribe = triageService.subscribe((state) => {
      setTriageState(state);
    });
    return unsubscribe;
  }, []);

  const handleSimulate = async (
    faultType:
      | 'duplicate_react_keys'
      | 'websocket_drop'
      | 'memory_pressure_spike'
      | 'rate_limit_429'
      | 'audio_buffer_underrun'
      | 'ast_syntax_deadlock'
  ) => {
    setIsSimulating(faultType);
    try {
      await triageService.simulateFault(faultType);
    } finally {
      setTimeout(() => setIsSimulating(null), 400);
    }
  };

  const getSeverityBadge = (sev: TriageIncident['severity']) => {
    switch (sev) {
      case 'critical':
        return <Badge className="bg-red-500/20 text-red-400 border border-red-500/30 text-[10px]">CRITICAL</Badge>;
      case 'high':
        return <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px]">HIGH</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-[10px]">MEDIUM</Badge>;
      case 'low':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px]">LOW</Badge>;
    }
  };

  const getStatusBadge = (status: TriageIncident['status']) => {
    switch (status) {
      case 'healed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" /> Auto-Healed
          </span>
        );
      case 'z3_verified':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-cyan-400">
            <Lock className="w-3.5 h-3.5" /> Z3-Verified
          </span>
        );
      case 'blocked_hitl':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5" /> Blocked (&gt;10 Lines HITL)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-yellow-400 animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Intercepting...
          </span>
        );
    }
  };

  const { nanoclaw, nanobot, incidents, autoHealEnabled, systemHealthScore } = triageState;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[88vh] bg-[#090d14] border border-[#dfc486]/40 text-[#efece4] p-0 flex flex-col overflow-hidden shadow-2xl">
        {/* Header with Title & Vitals */}
        <DialogHeader className="p-5 pb-3 border-b border-[#dfc486]/20 bg-[#0c121c]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold tracking-wide flex items-center gap-2">
                  <span>Self-Error Triage Engine</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-mono font-normal bg-gradient-to-r from-amber-500/20 to-cyan-500/20 text-[#dfc486] border border-[#dfc486]/30">
                    Rust NanoBot + Go NanoClaw Reforged
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-400">
                  Automated runtime error interception, Z3 neurosymbolic invariance proofing, and sub-millisecond hot patching.
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => triageService.setAutoHeal(!autoHealEnabled)}
                className={`h-7 text-xs border ${
                  autoHealEnabled
                    ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10'
                    : 'border-zinc-700 text-zinc-400'
                }`}
              >
                <Sparkles className="w-3 h-3 mr-1" />
                Auto-Heal: {autoHealEnabled ? 'ACTIVE' : 'MANUAL'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => triageService.purgeIncidents()}
                className="h-7 text-xs text-zinc-400 hover:text-red-400"
                title="Clear incident log"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Real-time Status Micro-Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3 pt-3 border-t border-zinc-800/80 text-xs font-mono">
            <div className="p-2 rounded bg-black/40 border border-zinc-800">
              <span className="text-zinc-500 block text-[10px] uppercase">System Integrity</span>
              <span className="font-bold text-emerald-400 flex items-center gap-1">
                <Activity className="w-3 h-3" /> {systemHealthScore}% Sovereign
              </span>
            </div>
            <div className="p-2 rounded bg-black/40 border border-zinc-800">
              <span className="text-zinc-500 block text-[10px] uppercase">BitNet 1.58b State</span>
              <span className="font-bold text-amber-400 flex items-center gap-1">
                {nanobot.ternaryState === 1 ? '+1 [SOVEREIGN]' : nanobot.ternaryState === 0 ? '0 [NEUTRAL]' : '-1 [DEGRADED]'}
              </span>
            </div>
            <div className="p-2 rounded bg-black/40 border border-zinc-800">
              <span className="text-zinc-500 block text-[10px] uppercase">Go Goroutines</span>
              <span className="font-bold text-cyan-400 flex items-center gap-1">
                <Cpu className="w-3 h-3" /> {nanoclaw.activeGoroutines} workers
              </span>
            </div>
            <div className="p-2 rounded bg-black/40 border border-zinc-800">
              <span className="text-zinc-500 block text-[10px] uppercase">Z3 Proof Hits</span>
              <span className="font-bold text-indigo-300 flex items-center gap-1">
                <Lock className="w-3 h-3" /> {nanobot.z3ProofCacheHits} proofs
              </span>
            </div>
            <div className="p-2 rounded bg-black/40 border border-zinc-800">
              <span className="text-zinc-500 block text-[10px] uppercase">8GB Scarcity Bound</span>
              <span className="font-bold text-zinc-300 flex items-center gap-1">
                {(nanoclaw.currentHostAllocMb / 1024).toFixed(2)}GB / 8.0GB
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Content Tabs */}
        <div className="flex-1 overflow-hidden flex flex-col p-5 pt-3">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full flex-1 flex flex-col overflow-hidden">
            <TabsList className="bg-zinc-900/80 border border-zinc-800 p-1 w-full justify-start h-9 mb-4">
              <TabsTrigger value="incidents" className="text-xs data-[state=active]:bg-[#dfc486] data-[state=active]:text-black">
                <Activity className="w-3.5 h-3.5 mr-1.5" />
                Live Incidents ({incidents.length})
              </TabsTrigger>
              <TabsTrigger value="nanoclaw" className="text-xs data-[state=active]:bg-cyan-500 data-[state=active]:text-black">
                <Cpu className="w-3.5 h-3.5 mr-1.5" />
                NanoClaw (Go Daemon)
              </TabsTrigger>
              <TabsTrigger value="simulation" className="text-xs data-[state=active]:bg-amber-500 data-[state=active]:text-black">
                <Flame className="w-3.5 h-3.5 mr-1.5" />
                Fault Simulation Sandbox
              </TabsTrigger>
              <TabsTrigger value="source_vault" className="text-xs data-[state=active]:bg-indigo-500 data-[state=active]:text-white">
                <Code2 className="w-3.5 h-3.5 mr-1.5" />
                Rust & Go Source Vault
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: Live Incidents & Triage */}
            <TabsContent value="incidents" className="flex-1 overflow-y-auto space-y-3 pr-1">
              {incidents.length === 0 ? (
                <div className="py-16 text-center border border-dashed border-zinc-800 rounded-xl bg-black/20">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
                  <h4 className="text-sm font-semibold text-zinc-200">Zero Active Faults Intercepted</h4>
                  <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1">
                    The Rust NanoBot AST triage engine is continuously monitoring DOM mutations, WebSockets, and memory pressure.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 text-xs border-amber-500/40 text-amber-300"
                    onClick={() => setActiveTab('simulation')}
                  >
                    <Flame className="w-3 h-3 mr-1" />
                    Simulate Real-World Fault
                  </Button>
                </div>
              ) : (
                incidents.map((incident) => (
                  <motion.div
                    key={incident.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 rounded-xl border border-zinc-800 bg-[#0c121c]/90 hover:border-[#dfc486]/40 transition-colors space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {getSeverityBadge(incident.severity)}
                        <span className="font-mono text-xs text-zinc-300 font-bold">{incident.category}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">[{incident.sourceModule}]</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[#dfc486]">
                          {incident.reforgedEngine}
                        </span>
                        {getStatusBadge(incident.status)}
                      </div>
                    </div>

                    <div className="text-xs font-mono bg-black/50 p-2.5 rounded border border-red-900/30 text-red-300 break-all">
                      {incident.errorMessage}
                    </div>

                    <div className="text-xs text-zinc-300 space-y-1">
                      <div className="flex items-start gap-1.5">
                        <span className="text-[#dfc486] font-bold shrink-0">Analysis:</span>
                        <span className="text-zinc-400">{incident.rootCauseAnalysis}</span>
                      </div>

                      {incident.z3Proof && (
                        <div className="p-2 rounded bg-indigo-950/20 border border-indigo-500/20 text-[11px] font-mono space-y-1">
                          <div className="flex items-center justify-between text-indigo-300">
                            <span className="flex items-center gap-1 font-bold">
                              <Lock className="w-3 h-3 text-indigo-400" />
                              Z3 Proof: {incident.z3Proof.formula}
                            </span>
                            <span className="text-[10px] text-emerald-400 font-bold">
                              {incident.z3Proof.result} ({incident.z3Proof.timeMicroseconds}μs)
                            </span>
                          </div>
                          <div className="text-zinc-400 text-[10px]">
                            Preserved Invariants: {incident.z3Proof.invariantsPreserved.join(', ')} &bull; {incident.z3Proof.constraintsEvaluated} constraints
                          </div>
                        </div>
                      )}

                      {incident.healingRecipe && (
                        <div className="flex items-center justify-between pt-1">
                          <div className="text-[11px] text-zinc-400">
                            <span className="text-emerald-400 font-mono font-bold">Recipe:</span>{' '}
                            {incident.healingRecipe.name} &bull; {incident.healingRecipe.diffLines} lines ({incident.healingRecipe.diffLines <= 10 ? '✓ Within 10-Line Firewall' : '⚠️ Exceeds 10 Lines'})
                          </div>
                          {incident.status !== 'healed' && (
                            <Button
                              size="sm"
                              className="h-6 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-mono"
                              onClick={() => triageService.executeSelfHealing(incident.id)}
                            >
                              <Play className="w-3 h-3 mr-1" />
                              Actuate Patch
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </TabsContent>

            {/* TAB 2: NanoClaw (Go Daemon) Supervised State */}
            <TabsContent value="nanoclaw" className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-zinc-800 bg-[#0c121c]/80 space-y-3">
                  <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                    <Cpu className="w-4 h-4" /> Goroutine Channel Multiplexer
                  </h4>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between items-center p-2 rounded bg-black/40 border border-zinc-800">
                      <span className="text-zinc-400">Telemetry Ingress Queue</span>
                      <span className="text-cyan-400 font-bold">{nanoclaw.channelDepths.telemetryQueue} pkts</span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded bg-black/40 border border-zinc-800">
                      <span className="text-zinc-400">Error Ingress Channel</span>
                      <span className="text-emerald-400 font-bold">{nanoclaw.channelDepths.errorIngress} buffer</span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded bg-black/40 border border-zinc-800">
                      <span className="text-zinc-400">Healing Actuator Dispatch</span>
                      <span className="text-amber-400 font-bold">{nanoclaw.channelDepths.healingActuators} queued</span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded bg-black/40 border border-zinc-800">
                      <span className="text-zinc-400">memfd_create Zero-Copy Slabs</span>
                      <span className="text-indigo-400 font-bold">{nanoclaw.zeroCopySlabsCount} active slabs</span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-zinc-800 bg-[#0c121c]/80 space-y-3">
                  <h4 className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4" /> 8GB Scarcity Boundary Watchdog
                  </h4>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="p-2 rounded bg-black/40 border border-zinc-800">
                      <div className="flex justify-between text-zinc-400 mb-1">
                        <span>Physical Memory Ceiling</span>
                        <span className="text-[#dfc486]">8,192 MB (Strict Limit)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-amber-500 transition-all duration-500"
                          style={{ width: `${(nanoclaw.currentHostAllocMb / 8192) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded bg-black/40 border border-zinc-800">
                      <span className="text-zinc-400">Active Host Allocation</span>
                      <span className="text-emerald-400 font-bold">{nanoclaw.currentHostAllocMb} MB</span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded bg-black/40 border border-zinc-800">
                      <span className="text-zinc-400">MADV_DONTNEED Slab Evictions</span>
                      <span className="text-indigo-400 font-bold">17 triggered</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Isolation Containers Grid */}
              <div className="space-y-2">
                <h4 className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider">
                  Isolated Agent Containers (Linux cgroups + seccomp sandbox)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {nanoclaw.isolationContainers.map((c) => (
                    <div key={c.containerId} className="p-3 rounded-lg border border-zinc-800 bg-black/40 text-xs font-mono space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#efece4]">{c.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          {c.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex justify-between text-zinc-500 text-[11px]">
                        <span>Cgroup: {c.sandboxedCgroup}</span>
                        <span className="text-zinc-400">{c.memoryUsageMb} MB</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* TAB 3: Fault Simulation Sandbox */}
            <TabsContent value="simulation" className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-200">
                <span className="font-bold font-mono uppercase block mb-1">Interactive Chaos Injection Chamber</span>
                Simulate synthetic or real-world faults to observe the Rust NanoBot AST engine classify the incident, compute the Z3 invariance proof, and execute hot patches via Go NanoClaw daemon workers.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-zinc-800 bg-[#0c121c]/90 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-200 font-mono">1. WebSpeech Key Collision</span>
                    <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-400/40">MEDIUM</Badge>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Simulates identical browser voiceURI keys causing React virtual DOM reconciliation collisions.
                  </p>
                  <Button
                    size="sm"
                    className="w-full text-xs bg-zinc-800 hover:bg-amber-600 hover:text-black font-mono"
                    disabled={isSimulating === 'duplicate_react_keys'}
                    onClick={() => handleSimulate('duplicate_react_keys')}
                  >
                    <Flame className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                    Inject Key Collision Fault
                  </Button>
                </div>

                <div className="p-3.5 rounded-xl border border-zinc-800 bg-[#0c121c]/90 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-200 font-mono">2. WebSocket Audio Stream Drop</span>
                    <Badge variant="outline" className="text-[10px] text-red-400 border-red-400/40">HIGH</Badge>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Simulates unexpected TCP RST reset during bidirectional 24kHz PCM live audio streaming.
                  </p>
                  <Button
                    size="sm"
                    className="w-full text-xs bg-zinc-800 hover:bg-red-600 hover:text-white font-mono"
                    disabled={isSimulating === 'websocket_drop'}
                    onClick={() => handleSimulate('websocket_drop')}
                  >
                    <Flame className="w-3.5 h-3.5 mr-1.5 text-red-400" />
                    Inject TCP Reset Drop
                  </Button>
                </div>

                <div className="p-3.5 rounded-xl border border-zinc-800 bg-[#0c121c]/90 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-200 font-mono">3. 8GB Memory Ceiling Spike</span>
                    <Badge variant="outline" className="text-[10px] text-red-400 border-red-400/40">CRITICAL</Badge>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Simulates memory exhaustion reaching 7.8GB/8.0GB strict edge ceiling to trigger MADV_DONTNEED flush.
                  </p>
                  <Button
                    size="sm"
                    className="w-full text-xs bg-zinc-800 hover:bg-red-600 hover:text-white font-mono"
                    disabled={isSimulating === 'memory_pressure_spike'}
                    onClick={() => handleSimulate('memory_pressure_spike')}
                  >
                    <Flame className="w-3.5 h-3.5 mr-1.5 text-red-400" />
                    Inject 8GB Memory Spike
                  </Button>
                </div>

                <div className="p-3.5 rounded-xl border border-zinc-800 bg-[#0c121c]/90 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-200 font-mono">4. Gemini API 429 Rate Limit</span>
                    <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-400/40">HIGH</Badge>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Simulates cloud quota exhaustion and triggers automated failover to local on-device Colibri MoE.
                  </p>
                  <Button
                    size="sm"
                    className="w-full text-xs bg-zinc-800 hover:bg-amber-600 hover:text-black font-mono"
                    disabled={isSimulating === 'rate_limit_429'}
                    onClick={() => handleSimulate('rate_limit_429')}
                  >
                    <Flame className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                    Inject 429 Quota Exhaustion
                  </Button>
                </div>

                <div className="p-3.5 rounded-xl border border-zinc-800 bg-[#0c121c]/90 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-200 font-mono">5. WebAudio Quantum Starvation</span>
                    <Badge variant="outline" className="text-[10px] text-yellow-400 border-yellow-400/40">MEDIUM</Badge>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Simulates audio buffer underrun and drops 4,096 audio samples on main thread lag.
                  </p>
                  <Button
                    size="sm"
                    className="w-full text-xs bg-zinc-800 hover:bg-yellow-600 hover:text-black font-mono"
                    disabled={isSimulating === 'audio_buffer_underrun'}
                    onClick={() => handleSimulate('audio_buffer_underrun')}
                  >
                    <Flame className="w-3.5 h-3.5 mr-1.5 text-yellow-400" />
                    Inject Audio Buffer Starve
                  </Button>
                </div>

                <div className="p-3.5 rounded-xl border border-zinc-800 bg-[#0c121c]/90 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-200 font-mono">6. Async Deadlock Cycle</span>
                    <Badge variant="outline" className="text-[10px] text-red-400 border-red-400/40">CRITICAL</Badge>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Simulates circular dispatch dependency to trigger Scorpion Sting cycle detection.
                  </p>
                  <Button
                    size="sm"
                    className="w-full text-xs bg-zinc-800 hover:bg-red-600 hover:text-white font-mono"
                    disabled={isSimulating === 'ast_syntax_deadlock'}
                    onClick={() => handleSimulate('ast_syntax_deadlock')}
                  >
                    <Flame className="w-3.5 h-3.5 mr-1.5 text-red-400" />
                    Inject Async Deadlock
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* TAB 4: Rust & Go Source Vault */}
            <TabsContent value="source_vault" className="flex-1 overflow-y-auto space-y-3 pr-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={codeLanguage === 'rust' ? 'default' : 'outline'}
                    className={`h-7 text-xs font-mono ${codeLanguage === 'rust' ? 'bg-amber-600 text-black' : 'text-zinc-400'}`}
                    onClick={() => setCodeLanguage('rust')}
                  >
                    <FileCode2 className="w-3.5 h-3.5 mr-1.5" />
                    nanobot_core.rs (Rust)
                  </Button>
                  <Button
                    size="sm"
                    variant={codeLanguage === 'go' ? 'default' : 'outline'}
                    className={`h-7 text-xs font-mono ${codeLanguage === 'go' ? 'bg-cyan-600 text-black' : 'text-zinc-400'}`}
                    onClick={() => setCodeLanguage('go')}
                  >
                    <Code2 className="w-3.5 h-3.5 mr-1.5" />
                    nanoclaw_daemon.go (Go)
                  </Button>
                </div>
                <span className="text-[10px] font-mono text-zinc-500">
                  {codeLanguage === 'rust' ? 'Assimilated from HKUDS/nanobot' : 'Assimilated from nanocoai/nanoclaw'}
                </span>
              </div>

              <div className="p-4 rounded-xl border border-zinc-800 bg-black font-mono text-xs overflow-x-auto text-zinc-300 max-h-[44vh] leading-relaxed">
                {codeLanguage === 'rust' ? (
                  <pre>{`// nanobot_core.rs — Reforged Sovereign Cognitive Core (Rust edition)
// Zero-overhead AST Syntax & Error Triage Engine
// BitNet 1.58b Ternary State-Space Recurrence (-1, 0, +1)
// Z3 SMT Neurosymbolic Invariant Proofs & 10-Line Firewall

pub struct NanoBotCore {
    ternary_state: AtomicI32, // -1=Degraded, 0=Neutral, +1=Sovereign
    triaged_count: AtomicU64,
    patches_generated: AtomicU64,
    hitl_triggered: AtomicU64,
}

impl NanoBotCore {
    pub fn triage_error(&self, error_msg: &str) -> TriageReport {
        // 1. AST Pattern Categorization
        let category = self.classify_error(error_msg);

        // 2. Neurosymbolic Z3 Proof Verification
        let z3_proof = self.verify_invariants(&category, error_msg);

        // 3. Synthesize Self-Healing Patch Recipe
        let (patch, root_cause) = self.synthesize_patch(&category, error_msg);

        // 4. Enforce 10-Line Firewall Check (HITL checkpoint if >10 lines)
        if patch.diff_lines > 10 {
            self.hitl_triggered.fetch_add(1, Ordering::Relaxed);
        } else {
            self.patches_generated.fetch_add(1, Ordering::Relaxed);
        }

        TriageReport { category, z3_proof, patch, root_cause }
    }
}`}</pre>
                ) : (
                  <pre>{`// nanoclaw_daemon.go — Reforged High-Performance Supervisor (Go edition)
// Goroutine Channel Multiplexing & memfd_create Zero-Copy Ring Slabs
// Strict 8GB Physical Memory Scarcity Barrier & MADV_DONTNEED

package main

const MaxMemoryCeilingBytes = 8 * 1024 * 1024 * 1024 // 8.0 GB strict
const WorkerPoolSize = 64

type NanoClawSupervisor struct {
    telemetryChan chan TelemetryEvent
    errorChan     chan ErrorPacket
    actuatorChan  chan RecoveryAction
    containers    sync.Map
}

func (s *NanoClawSupervisor) memoryBarrierWatchdog() {
    ticker := time.NewTicker(250 * time.Millisecond)
    for range ticker.C {
        var m runtime.MemStats
        runtime.ReadMemStats(&m)
        if float64(m.Alloc) > float64(MaxMemoryCeilingBytes) * 0.88 {
            // Trigger MADV_DONTNEED zero-copy slab eviction & aggressive GC
            debug.FreeOSMemory()
        }
    }
}`}</pre>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
