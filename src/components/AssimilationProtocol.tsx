import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Zap,
  Cpu,
  Server,
  Layers,
  FileCode,
  Download,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Split,
  Terminal,
  ShieldCheck,
  Compass,
  Database,
  Sliders,
  Copy,
  Check,
  RefreshCw,
  HardDrive,
  Activity,
  Bug,
  ListOrdered,
  Workflow
} from 'lucide-react';
import { toast } from 'sonner';
import { Persona } from '../types/persona';
import {
  SuperpowerSkill,
  SkillExecutionResult,
  SubagentTask,
  LLMHardwareProfile,
  BifrostRouteTelemetry,
  BifrostSemanticCache,
  OmniRouteCompressionResult,
  OmniRouteProviderStatus,
  ColibriTierState,
} from '../types/assimilation';
import {
  assimilationService,
  SUPERPOWER_SKILLS,
} from '../services/assimilation-service';

interface AssimilationProtocolProps {
  currentPersona: Persona;
  transcription: { role: string; text: string }[];
}

export const AssimilationProtocol: React.FC<AssimilationProtocolProps> = ({
  currentPersona,
  transcription,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    'superpowers' | 'bifrost_llmfit' | 'omniroute' | 'colibri' | 'pidesktop'
  >('superpowers');

  // Superpowers state
  const [selectedSkill, setSelectedSkill] = useState<SuperpowerSkill>(SUPERPOWER_SKILLS[0]);
  const [problemPrompt, setProblemPrompt] = useState(
    'Diagnose intermittent WebSocket disconnects in high-latency audio streaming environments.'
  );
  const [isExecutingSkill, setIsExecutingSkill] = useState(false);
  const [skillResult, setSkillResult] = useState<SkillExecutionResult | null>(null);

  // Subagent state
  const [subagentGoal, setSubagentGoal] = useState(
    'Verify that the audio resampler properly bounds PCM buffer lengths without heap allocations.'
  );
  const [subagentType, setSubagentType] = useState<SubagentTask['subagentType']>('code-verifier');
  const [isDispatchingSubagent, setIsDispatchingSubagent] = useState(false);
  const [subagentTasks, setSubagentTasks] = useState<SubagentTask[]>([]);

  // LLMFit & Bifröst state
  const [hwProfile, setHwProfile] = useState<LLMHardwareProfile | null>(null);
  const [bifrostRoutes, setBifrostRoutes] = useState<BifrostRouteTelemetry[]>([]);
  const [bifrostCache, setBifrostCache] = useState<BifrostSemanticCache | null>(null);
  const [isLoadingHw, setIsLoadingHw] = useState(false);

  // OmniRoute state
  const [inputTextToCompress, setInputTextToCompress] = useState(
    `It is important to note that, in order to achieve maximum throughput across the multi-agent context, the persona system must essentially maintain an active index of historical interactions. Furthermore, due to the fact that token limits apply to every turn, we should practically eliminate redundant syntactic boilerplate.`
  );
  const [compressionResult, setCompressionResult] = useState<OmniRouteCompressionResult | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [omniProviders, setOmniProviders] = useState<OmniRouteProviderStatus[]>([]);
  const [copiedCompressed, setCopiedCompressed] = useState(false);

  // Colibri state
  const [colibriState, setColibriState] = useState<ColibriTierState | null>(null);
  const [colibriPrompt, setColibriPrompt] = useState(
    'Explain how Colibri streams mixture-of-experts weights from NVMe SSD to GPU VRAM with zero PCIe bus stalls.'
  );
  const [isColibriInferring, setIsColibriInferring] = useState(false);
  const [colibriResult, setColibriResult] = useState<{
    answer: string;
    expertsActivated: number[];
    tokensPerSec: number;
    vramStreamLatencyMs: number;
  } | null>(null);

  // Initial data loading
  useEffect(() => {
    loadHardwareAndBifrost();
    loadOmniProviders();
    loadColibriStatus();
  }, []);

  const loadHardwareAndBifrost = async () => {
    setIsLoadingHw(true);
    try {
      const [profile, bifrost] = await Promise.all([
        assimilationService.getHardwareProfile(),
        assimilationService.getBifrostStatus(),
      ]);
      setHwProfile(profile);
      setBifrostRoutes(bifrost.routes);
      setBifrostCache(bifrost.cache);
    } catch (err) {
      console.error('Failed to load HW profile or Bifrost', err);
    } finally {
      setIsLoadingHw(false);
    }
  };

  const loadOmniProviders = async () => {
    try {
      const providers = await assimilationService.getOmniRouteProviders();
      setOmniProviders(providers);
    } catch (err) {
      console.error('Failed to load OmniRoute providers', err);
    }
  };

  const loadColibriStatus = async () => {
    try {
      const status = await assimilationService.getColibriStatus();
      setColibriState(status);
    } catch (err) {
      console.error('Failed to load Colibri status', err);
    }
  };

  // Action Handlers
  const handleExecuteSkill = async () => {
    if (!problemPrompt.trim()) {
      toast.error('Please enter a task or problem statement');
      return;
    }
    setIsExecutingSkill(true);
    try {
      const result = await assimilationService.executeSuperpower(
        selectedSkill.id,
        problemPrompt,
        currentPersona
      );
      setSkillResult(result);
      toast.success(`Skill "${selectedSkill.name}" executed successfully`);
    } catch (err: any) {
      toast.error(`Skill execution failed: ${err.message}`);
    } finally {
      setIsExecutingSkill(false);
    }
  };

  const handleDispatchSubagent = async () => {
    if (!subagentGoal.trim()) {
      toast.error('Please enter a subagent task goal');
      return;
    }
    setIsDispatchingSubagent(true);
    try {
      const task = await assimilationService.dispatchSubagent(subagentGoal, subagentType);
      setSubagentTasks((prev) => [task, ...prev]);
      toast.success(`Subagent [${task.name}] completed verification`);
    } catch (err: any) {
      toast.error(`Subagent dispatch failed: ${err.message}`);
    } finally {
      setIsDispatchingSubagent(false);
    }
  };

  const handleCompressContext = async (method: 'rtk_caveman' | 'syntactic_pruning' | 'hybrid' = 'rtk_caveman') => {
    if (!inputTextToCompress.trim()) return;
    setIsCompressing(true);
    try {
      const result = await assimilationService.compressContext(inputTextToCompress, method);
      setCompressionResult(result);
      toast.info(`OmniRoute: Compressed by ${result.reductionPercentage}% (${result.originalTokens} → ${result.compressedTokens} tokens)`);
    } catch (err: any) {
      toast.error(`Compression error: ${err.message}`);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleRunColibriInference = async () => {
    if (!colibriPrompt.trim()) return;
    setIsColibriInferring(true);
    try {
      const result = await assimilationService.runColibriInference(colibriPrompt);
      setColibriResult(result);
      
      // Update heatmap to highlight the activated experts
      if (colibriState) {
        const newHeatmap = [...colibriState.expertHeatmap];
        result.expertsActivated.forEach((expIdx) => {
          if (expIdx < newHeatmap.length) {
            newHeatmap[expIdx] = 1.0;
          }
        });
        setColibriState({
          ...colibriState,
          expertHeatmap: newHeatmap,
          currentInferenceTokensPerSec: result.tokensPerSec,
        });
      }
      toast.success(`Colibri MoE generated response (${result.tokensPerSec} tps)`);
    } catch (err: any) {
      toast.error(`Colibri inference failed: ${err.message}`);
    } finally {
      setIsColibriInferring(false);
    }
  };

  const handlePurgeBifrostCache = async () => {
    try {
      const res = await fetch('/api/bifrost/cache/purge', { method: 'POST' });
      const data = await res.json();
      setBifrostCache(data.cache);
      toast.success('Bifröst semantic cache purged');
    } catch {
      toast.error('Failed to purge cache');
    }
  };

  const handleDownloadPIPlug = () => {
    const { fileName, blob } = assimilationService.generatePIPlugBundle(currentPersona);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${fileName} for PI-Desktop`);
  };

  const handleDownloadVaultData = () => {
    const { fileName, jsonlBlob } = assimilationService.exportVaultData(currentPersona, transcription);
    const url = URL.createObjectURL(jsonlBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported local vault: ${fileName}`);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Ecosystem Top Header */}
      <div className="border-b border-slate-800/80 bg-slate-900/60 p-4 shrink-0 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Workflow className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-semibold text-slate-100">Assimilation Protocol Engine</h2>
                <span className="px-2 py-0.5 text-xs font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full">
                  5 Repositories Active
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Superpowers • Bifröst Bridge • llmfit • OmniRoute • Colibri MoE • PI-Desktop
              </p>
            </div>
          </div>

          {/* Sub-nav tabs */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-1 space-x-1 text-xs">
            <button
              onClick={() => setActiveSubTab('superpowers')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center space-x-1.5 ${
                activeSubTab === 'superpowers'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Superpowers</span>
            </button>
            <button
              onClick={() => setActiveSubTab('bifrost_llmfit')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center space-x-1.5 ${
                activeSubTab === 'bifrost_llmfit'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Bifröst & llmfit</span>
            </button>
            <button
              onClick={() => setActiveSubTab('omniroute')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center space-x-1.5 ${
                activeSubTab === 'omniroute'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>OmniRoute</span>
            </button>
            <button
              onClick={() => setActiveSubTab('colibri')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center space-x-1.5 ${
                activeSubTab === 'colibri'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>Colibri MoE</span>
            </button>
            <button
              onClick={() => setActiveSubTab('pidesktop')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center space-x-1.5 ${
                activeSubTab === 'pidesktop'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>PI-Desktop</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {/* ========================================== */}
        {/* SUBTAB 1: obra/superpowers                */}
        {/* ========================================== */}
        {activeSubTab === 'superpowers' && (
          <div className="space-y-6">
            {/* Header Description */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-emerald-400 font-semibold text-sm">obra/superpowers</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-300 text-sm">Disciplined Agentic Skills & Subagents</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Enforces hypothesis-driven systematic debugging, test-driven verification, and ephemeral subagent forking. Available both interactively and as live voice tools for {currentPersona.name}.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Live Voice Tool Registered
                </span>
              </div>
            </div>

            {/* Skill Grid Selection */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Select Superpower Skill
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {SUPERPOWER_SKILLS.map((skill) => {
                  const isSelected = selectedSkill.id === skill.id;
                  return (
                    <button
                      key={skill.id}
                      onClick={() => setSelectedSkill(skill)}
                      className={`text-left p-3.5 rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-emerald-500/10 border-emerald-500/50 shadow-lg shadow-emerald-500/5'
                          : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                            isSelected ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {skill.id === 'systematic-debugging' && <Bug className="w-4 h-4" />}
                          {skill.id === 'test-driven-development' && <CheckCircle2 className="w-4 h-4" />}
                          {skill.id === 'multi-turn-planning' && <ListOrdered className="w-4 h-4" />}
                          {skill.id === 'subagent-dispatch' && <Split className="w-4 h-4" />}
                          {skill.id === 'browser-devtools-inspector' && <Terminal className="w-4 h-4" />}
                        </div>
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                          {skill.category}
                        </span>
                      </div>
                      <div className="font-medium text-xs text-slate-200">{skill.name}</div>
                      <div className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                        {skill.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Skill Execution Playground */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                    <Zap className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Trigger: {selectedSkill.name}</span>
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Phases: {selectedSkill.phases.length}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400">Problem Statement or Target Task</label>
                  <textarea
                    rows={4}
                    value={problemPrompt}
                    onChange={(e) => setProblemPrompt(e.target.value)}
                    placeholder="Describe the bug, architectural challenge, or feature test harness..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 resize-none"
                  />
                </div>

                {/* Preset Quick Actions */}
                <div className="space-y-1.5">
                  <span className="text-[11px] text-slate-400">Quick Test Scenarios:</span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() =>
                        setProblemPrompt(
                          'Intermittent WebSocket disconnection when audio queue overflows during network jitter'
                        )
                      }
                      className="px-2 py-1 text-[11px] rounded bg-slate-800/80 hover:bg-slate-800 text-slate-300"
                    >
                      Audio Queue Race Condition
                    </button>
                    <button
                      onClick={() =>
                        setProblemPrompt(
                          'Write failing test cases for cosine similarity normalization with zero-length vectors'
                        )
                      }
                      className="px-2 py-1 text-[11px] rounded bg-slate-800/80 hover:bg-slate-800 text-slate-300"
                    >
                      Zero-Vector Cosine TDD
                    </button>
                    <button
                      onClick={() =>
                        setProblemPrompt(
                          'Plan multi-stage migration of Google Docs Cloud Brain to hybrid local SQLite cache'
                        )
                      }
                      className="px-2 py-1 text-[11px] rounded bg-slate-800/80 hover:bg-slate-800 text-slate-300"
                    >
                      Cloud Brain Migration Plan
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleExecuteSkill}
                  disabled={isExecutingSkill}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-md shadow-emerald-900/20"
                >
                  {isExecutingSkill ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                      <span>Executing Multi-Phase Proof...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Execute {selectedSkill.name}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Execution Phased Output */}
              <div className="lg:col-span-6 bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-semibold text-slate-300">
                    Execution Trace & Verifiable Proof
                  </span>
                  {skillResult && (
                    <span className="text-[11px] font-mono text-emerald-400">
                      {skillResult.executionTimeMs}ms
                    </span>
                  )}
                </div>

                {!skillResult && !isExecutingSkill && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
                    <Workflow className="w-8 h-8 mb-2 opacity-40" />
                    <p className="text-xs">No active execution trace</p>
                    <p className="text-[11px] text-slate-600 max-w-xs mt-1">
                      Select a Superpower skill and click execute to observe the phased reasoning breakdown.
                    </p>
                  </div>
                )}

                {isExecutingSkill && (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-3 text-slate-400">
                    <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                    <span className="text-xs">Running disciplined investigation phases...</span>
                  </div>
                )}

                {skillResult && (
                  <div className="space-y-3 overflow-y-auto max-h-[360px] pr-1">
                    {skillResult.phases.map((phase, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-emerald-400 flex items-center space-x-1.5">
                            <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px]">
                              {idx + 1}
                            </span>
                            <span>{phase.name}</span>
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {phase.durationMs || 400}ms
                          </span>
                        </div>
                        <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">
                          {phase.output}
                        </p>
                      </div>
                    ))}

                    {skillResult.finalSynthesis && (
                      <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-lg p-3 text-xs">
                        <div className="font-semibold text-emerald-300 mb-1 flex items-center space-x-1.5">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Final Actionable Synthesis</span>
                        </div>
                        <p className="text-slate-300 leading-relaxed">
                          {skillResult.finalSynthesis}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Subagent Task Forking Section */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center space-x-2">
                  <Split className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-slate-200">
                    Ephemeral Subagent Task Isolation
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">
                  Forks separate clean context windows
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-7 space-y-1">
                  <label className="text-xs text-slate-400">Subagent Goal</label>
                  <input
                    type="text"
                    value={subagentGoal}
                    onChange={(e) => setSubagentGoal(e.target.value)}
                    placeholder="Enter isolated goal..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div className="md:col-span-3 space-y-1">
                  <label className="text-xs text-slate-400">Subagent Type</label>
                  <select
                    value={subagentType}
                    onChange={(e) => setSubagentType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="code-verifier">Code Verifier</option>
                    <option value="researcher">Focused Researcher</option>
                    <option value="debugger">Root Cause Debugger</option>
                    <option value="security-auditor">Security Auditor</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <button
                    onClick={handleDispatchSubagent}
                    disabled={isDispatchingSubagent}
                    className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-medium text-xs rounded-lg transition-colors flex items-center justify-center space-x-1.5 border border-emerald-500/30"
                  >
                    {isDispatchingSubagent ? (
                      <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Split className="w-3.5 h-3.5" />
                    )}
                    <span>Fork Agent</span>
                  </button>
                </div>
              </div>

              {subagentTasks.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Completed Subagent Reports
                  </span>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {subagentTasks.map((t) => (
                      <div
                        key={t.id}
                        className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-3 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-emerald-400">{t.name}</span>
                          <span className="text-[10px] text-slate-500">{t.startedAt}</span>
                        </div>
                        <div className="text-slate-400 italic">Goal: "{t.goal}"</div>
                        <div className="text-slate-200 whitespace-pre-wrap mt-1">
                          {t.result}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* SUBTAB 2: AlexsJones/llmfit & Bifröst      */}
        {/* ========================================== */}
        {activeSubTab === 'bifrost_llmfit' && (
          <div className="space-y-6">
            {/* Header Description */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-blue-400 font-semibold text-sm">AlexsJones/llmfit + maximhq/bifrost</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-300 text-sm">Edge Hardware Profiler & AI Gateway</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Profiles host memory bandwidth, scores candidate local models (Gemma, Qwen, DeepSeek, Phi-4), and manages Bifröst routing with semantic caching.
                </p>
              </div>
              <button
                onClick={loadHardwareAndBifrost}
                disabled={isLoadingHw}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center space-x-1.5 self-start md:self-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHw ? 'animate-spin' : ''}`} />
                <span>Re-Profile Host</span>
              </button>
            </div>

            {/* Hardware Profile Cards */}
            {hwProfile && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3.5">
                  <div className="text-[11px] text-slate-400 mb-1">Host CPU Architecture</div>
                  <div className="text-sm font-semibold text-slate-200 truncate">{hwProfile.cpu}</div>
                  <div className="text-[11px] text-slate-500 mt-1 font-mono">{hwProfile.cores} Physical / V-Cores</div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3.5">
                  <div className="text-[11px] text-slate-400 mb-1">Total System RAM</div>
                  <div className="text-sm font-semibold text-slate-200 font-mono">{hwProfile.systemRamGb} GB</div>
                  <div className="text-[11px] text-emerald-400 mt-1 font-mono">{hwProfile.availableRamGb} GB Available</div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3.5">
                  <div className="text-[11px] text-slate-400 mb-1">GPU / Accelerator VRAM</div>
                  <div className="text-sm font-semibold text-slate-200 font-mono">{hwProfile.vramGb} GB VRAM</div>
                  <div className="text-[11px] text-slate-500 mt-1">{hwProfile.gpuName}</div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3.5">
                  <div className="text-[11px] text-slate-400 mb-1">Est. Memory Bandwidth</div>
                  <div className="text-sm font-semibold text-blue-400 font-mono">{hwProfile.memoryBandwidthGbps} GB/s</div>
                  <div className="text-[11px] text-slate-500 mt-1">llmfit formula verified</div>
                </div>
              </div>
            )}

            {/* Model Fit Scoring Matrix */}
            {hwProfile && (
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-slate-200 flex items-center space-x-1.5">
                    <Sliders className="w-3.5 h-3.5 text-blue-400" />
                    <span>llmfit Model Fit Recommendations for Local Edge</span>
                  </h3>
                  <span className="text-[11px] text-slate-500">Ranked by bandwidth & memory headroom</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                        <th className="pb-2 font-medium">Model</th>
                        <th className="pb-2 font-medium">Params</th>
                        <th className="pb-2 font-medium">Quant</th>
                        <th className="pb-2 font-medium">RAM Req.</th>
                        <th className="pb-2 font-medium">Fit Score</th>
                        <th className="pb-2 font-medium">Est. Speed</th>
                        <th className="pb-2 font-medium">Viability</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {hwProfile.recommendedModels.map((m, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-2.5 font-medium text-slate-200">{m.modelName}</td>
                          <td className="py-2.5 font-mono text-slate-400">{m.parameters}</td>
                          <td className="py-2.5 font-mono text-slate-400">{m.quantization}</td>
                          <td className="py-2.5 font-mono text-slate-300">{m.memoryRequiredGb} GB</td>
                          <td className="py-2.5">
                            <div className="flex items-center space-x-2">
                              <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full ${
                                    m.fitScore >= 85 ? 'bg-emerald-500' : m.fitScore >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                                  }`}
                                  style={{ width: `${m.fitScore}%` }}
                                />
                              </div>
                              <span className="font-mono text-[11px] text-slate-300">{m.fitScore}%</span>
                            </div>
                          </td>
                          <td className="py-2.5 font-mono text-blue-400">~{m.estimatedTokensPerSec} tps</td>
                          <td className="py-2.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                m.status === 'perfect'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : m.status === 'viable'
                                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}
                            >
                              {m.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Bifröst Gateway Routes & Semantic Cache */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Routing Waterfall */}
              <div className="lg:col-span-7 bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200 flex items-center space-x-1.5">
                    <Server className="w-3.5 h-3.5 text-blue-400" />
                    <span>Bifröst Dynamic Gateway Routes</span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    Failover Active
                  </span>
                </div>

                <div className="space-y-2">
                  {bifrostRoutes.map((r) => (
                    <div
                      key={r.routeId}
                      className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-3 text-xs flex flex-col md:flex-row md:items-center justify-between gap-2"
                    >
                      <div>
                        <div className="font-semibold text-slate-200">{r.provider}</div>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">{r.model}</div>
                        <div className="text-[10px] text-slate-500 truncate max-w-xs">{r.endpoint}</div>
                      </div>
                      <div className="flex items-center space-x-4 text-right">
                        <div>
                          <div className="font-mono text-blue-400">{r.avgLatencyMs}ms</div>
                          <div className="text-[10px] text-slate-500">avg latency</div>
                        </div>
                        <div>
                          <div className="font-mono text-slate-300">{r.trafficSharePct}%</div>
                          <div className="text-[10px] text-slate-500">traffic share</div>
                        </div>
                        <div>
                          <div className="font-mono text-emerald-400">{r.cacheHitRatePct}%</div>
                          <div className="text-[10px] text-slate-500">cache hit</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Semantic Cache Telemetry */}
              <div className="lg:col-span-5 bg-slate-900/40 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                    <span className="text-xs font-semibold text-slate-200 flex items-center space-x-1.5">
                      <Database className="w-3.5 h-3.5 text-blue-400" />
                      <span>Bifröst Semantic Cache</span>
                    </span>
                    <button
                      onClick={handlePurgeBifrostCache}
                      className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center space-x-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Purge</span>
                    </button>
                  </div>

                  {bifrostCache && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-3">
                        <div className="text-[10px] text-slate-500">Cache Hit Rate</div>
                        <div className="text-lg font-mono font-bold text-emerald-400">
                          {bifrostCache.hitRatePct}%
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          {bifrostCache.hits} hits / {bifrostCache.misses} misses
                        </div>
                      </div>
                      <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-3">
                        <div className="text-[10px] text-slate-500">Tokens Preserved</div>
                        <div className="text-lg font-mono font-bold text-blue-400">
                          {bifrostCache.savedTokens.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">zero cost routing</div>
                      </div>
                      <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-3 col-span-2">
                        <div className="text-[10px] text-slate-500">Avg Round-Trip Savings</div>
                        <div className="text-base font-mono font-bold text-slate-200">
                          -{bifrostCache.avgLatencySavingsMs}ms per cached query
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-2.5 rounded-lg bg-blue-950/20 border border-blue-500/20 text-[11px] text-blue-300">
                  ⚡ All queries pass through Bifröst semantic vector hashing before dispatching to Gemini Live or local Colibri MoE mesh.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* SUBTAB 3: diegosouzapw/OmniRoute          */}
        {/* ========================================== */}
        {activeSubTab === 'omniroute' && (
          <div className="space-y-6">
            {/* Header Description */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-amber-400 font-semibold text-sm">diegosouzapw/OmniRoute</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-300 text-sm">RTK + Caveman Context Compressor & Multi-Gateway</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Compresses bulky documents, conversation histories, and RAG context chunks by up to 80% while retaining critical semantic entities. Monitored with multi-provider quota tracking.
                </p>
              </div>
            </div>

            {/* Interactive Compression Playground */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-3 flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">
                    Raw Input Text / RAG Context
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    ~{Math.ceil(inputTextToCompress.trim().split(/\s+/).length * 1.3)} est. tokens
                  </span>
                </div>
                <textarea
                  rows={6}
                  value={inputTextToCompress}
                  onChange={(e) => setInputTextToCompress(e.target.value)}
                  placeholder="Paste context, meeting notes, or logs to compress..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500/50 resize-none font-mono"
                />

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCompressContext('rtk_caveman')}
                    disabled={isCompressing}
                    className="flex-1 py-2 px-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-slate-950 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center space-x-1.5"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Compress (RTK + Caveman)</span>
                  </button>
                  <button
                    onClick={() => handleCompressContext('syntactic_pruning')}
                    disabled={isCompressing}
                    className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-lg transition-colors"
                  >
                    Prune Only
                  </button>
                </div>
              </div>

              {/* Compressed Output View */}
              <div className="lg:col-span-6 bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-3 flex flex-col">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-slate-300">Compressed Context</span>
                    {compressionResult && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                        -{compressionResult.reductionPercentage}% TOKENS
                      </span>
                    )}
                  </div>
                  {compressionResult && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(compressionResult.compressedText);
                        setCopiedCompressed(true);
                        setTimeout(() => setCopiedCompressed(false), 2000);
                        toast.success('Compressed text copied to clipboard');
                      }}
                      className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center space-x-1"
                    >
                      {copiedCompressed ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{copiedCompressed ? 'Copied' : 'Copy'}</span>
                    </button>
                  )}
                </div>

                <div className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-300 font-mono overflow-y-auto max-h-[160px] whitespace-pre-wrap">
                  {compressionResult
                    ? compressionResult.compressedText
                    : 'Click "Compress" to generate token-optimized context.'}
                </div>

                {compressionResult && (
                  <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono">
                    <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-2">
                      <div className="text-[10px] text-slate-500">Original</div>
                      <div className="text-xs font-semibold text-slate-300">
                        {compressionResult.originalTokens} tokens
                      </div>
                    </div>
                    <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-2">
                      <div className="text-[10px] text-slate-500">Compressed</div>
                      <div className="text-xs font-semibold text-amber-400">
                        {compressionResult.compressedTokens} tokens
                      </div>
                    </div>
                    <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-2">
                      <div className="text-[10px] text-slate-500">Latency</div>
                      <div className="text-xs font-semibold text-slate-300">
                        {compressionResult.compressionTimeMs}ms
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* OmniRoute Multi-Provider Waterfall & Quota Matrix */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200 flex items-center space-x-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span>OmniRoute Multi-Provider Failover Matrix & Quotas</span>
                </span>
                <span className="text-[11px] text-slate-500">Configured Priority Cascade</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                      <th className="pb-2 font-medium">Priority</th>
                      <th className="pb-2 font-medium">Provider & Model</th>
                      <th className="pb-2 font-medium">Family</th>
                      <th className="pb-2 font-medium">Input Cost / 1M</th>
                      <th className="pb-2 font-medium">Quota Remaining</th>
                      <th className="pb-2 font-medium">Latency</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {omniProviders.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 font-mono text-slate-400">#{p.priorityOrder}</td>
                        <td className="py-2.5 font-medium text-slate-200">{p.name}</td>
                        <td className="py-2.5 text-slate-400">{p.family}</td>
                        <td className="py-2.5 font-mono text-slate-300">${p.costPerMillionInput.toFixed(2)}</td>
                        <td className="py-2.5">
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full bg-amber-500"
                                style={{ width: `${p.quotaRemainingPct}%` }}
                              />
                            </div>
                            <span className="font-mono text-[11px] text-slate-300">
                              {p.quotaRemainingPct}%
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 font-mono text-amber-400">{p.latencyMs}ms</td>
                        <td className="py-2.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* SUBTAB 4: JustVugg/colibri                 */}
        {/* ========================================== */}
        {activeSubTab === 'colibri' && (
          <div className="space-y-6">
            {/* Header Description */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-purple-400 font-semibold text-sm">JustVugg/colibri</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-300 text-sm">Heterogeneous Tiered MoE Inference Engine</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Enables consumer workstations to stream massive Mixture-of-Experts weights across NVMe SSD, Host RAM, and GPU VRAM with zero PCIe bus stalls. Runs GLM-5.2-MoE-744B with Top-4 expert routing.
                </p>
              </div>
              {colibriState && (
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-1 text-xs font-mono rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30">
                    {colibriState.engineVersion}
                  </span>
                </div>
              )}
            </div>

            {/* Memory Tier Visualizer */}
            {colibriState && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-slate-900/50 border border-purple-500/30 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-purple-300 flex items-center space-x-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      <span>Tier 1: GPU VRAM (Top Experts)</span>
                    </span>
                    <span className="text-[10px] font-mono text-purple-400">
                      {colibriState.memoryTiers.vram.bandwidthGbps} GB/s
                    </span>
                  </div>
                  <div className="text-lg font-mono font-bold text-slate-100">
                    {colibriState.memoryTiers.vram.usedGb} / {colibriState.memoryTiers.vram.totalGb} GB
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-purple-500"
                      style={{
                        width: `${(colibriState.memoryTiers.vram.usedGb / colibriState.memoryTiers.vram.totalGb) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">Holds active Top-4 experts per token</p>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                      <Cpu className="w-3.5 h-3.5 text-blue-400" />
                      <span>Tier 2: Host RAM (Pinned Hot Experts)</span>
                    </span>
                    <span className="text-[10px] font-mono text-blue-400">
                      {colibriState.memoryTiers.hostRam.bandwidthGbps} GB/s
                    </span>
                  </div>
                  <div className="text-lg font-mono font-bold text-slate-100">
                    {colibriState.memoryTiers.hostRam.usedGb} / {colibriState.memoryTiers.hostRam.totalGb} GB
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{
                        width: `${(colibriState.memoryTiers.hostRam.usedGb / colibriState.memoryTiers.hostRam.totalGb) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">Hot cache for frequent routing patterns</p>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Tier 3: NVMe SSD (Stream Cold Experts)</span>
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">
                      {colibriState.memoryTiers.nvme.streamRateGbps} GB/s
                    </span>
                  </div>
                  <div className="text-lg font-mono font-bold text-slate-100">
                    Async DirectIO
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    Queue Depth: {colibriState.memoryTiers.nvme.ioQueueDepth} • Hit: {colibriState.memoryTiers.nvme.readHitRatePct}%
                  </div>
                  <p className="text-[11px] text-slate-400">Piped via Linux io_uring / DirectIO</p>
                </div>
              </div>
            )}

            {/* 64-Expert Routing Heatmap */}
            {colibriState && (
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-200">
                      Active Expert Routing Matrix ({colibriState.totalExperts} Experts Top-{colibriState.activeExpertsPerToken})
                    </span>
                    <p className="text-[11px] text-slate-500">
                      GLM-5.2-MoE-744B (42B active parameter subset)
                    </p>
                  </div>
                  <span className="text-xs font-mono text-purple-400">
                    Speed: {colibriState.currentInferenceTokensPerSec} tps
                  </span>
                </div>

                {/* Heatmap Grid */}
                <div className="grid grid-cols-8 md:grid-cols-16 gap-1.5 p-2 bg-slate-950 border border-slate-800 rounded-lg">
                  {colibriState.expertHeatmap.map((heat, idx) => {
                    const isHot = heat >= 0.8;
                    const isWarm = heat >= 0.4 && heat < 0.8;
                    return (
                      <div
                        key={idx}
                        title={`Expert #${idx}: ${(heat * 100).toFixed(0)}% activity`}
                        className={`h-7 rounded flex items-center justify-center text-[10px] font-mono transition-all ${
                          isHot
                            ? 'bg-purple-500 text-slate-950 font-bold shadow-sm shadow-purple-500/50'
                            : isWarm
                            ? 'bg-purple-900/60 text-purple-200'
                            : 'bg-slate-900 text-slate-500'
                        }`}
                      >
                        #{idx}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Colibri MoE Inference Runner */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-3">
              <span className="text-xs font-semibold text-slate-200 flex items-center space-x-1.5">
                <Play className="w-3.5 h-3.5 text-purple-400" />
                <span>Trigger Local MoE Query (Colibri Tiered Stream)</span>
              </span>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={colibriPrompt}
                  onChange={(e) => setColibriPrompt(e.target.value)}
                  placeholder="Ask a deep technical query to the local MoE..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500/50 font-mono"
                />
                <button
                  onClick={handleRunColibriInference}
                  disabled={isColibriInferring}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-slate-950 font-semibold text-xs rounded-lg transition-colors flex items-center space-x-1.5"
                >
                  {isColibriInferring ? (
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current" />
                  )}
                  <span>Run MoE</span>
                </button>
              </div>

              {colibriResult && (
                <div className="bg-slate-950 border border-purple-500/20 rounded-lg p-3 space-y-2 mt-2">
                  <div className="flex items-center justify-between text-xs text-purple-300 border-b border-slate-800 pb-1.5">
                    <span>
                      Activated Experts: [{colibriResult.expertsActivated.map((e) => `#${e}`).join(', ')}]
                    </span>
                    <span className="font-mono">
                      {colibriResult.tokensPerSec} tps • {colibriResult.vramStreamLatencyMs}ms stream latency
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {colibriResult.answer}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* SUBTAB 5: vastsa/PI-Desktop                */}
        {/* ========================================== */}
        {activeSubTab === 'pidesktop' && (
          <div className="space-y-6">
            {/* Header Description */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-indigo-400 font-semibold text-sm">vastsa/PI-Desktop</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-300 text-sm">Local-First Desktop Packaging & Vault Companion</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Packages {currentPersona.name} as a standalone native <code className="text-indigo-300">.piplug</code> plugin bundle and exports local SQLite / JSONL session vaults for PI-Desktop.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadPIPlug}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-slate-950 font-semibold text-xs rounded-lg transition-colors flex items-center space-x-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .piplug Package</span>
                </button>
                <button
                  onClick={handleDownloadVaultData}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-lg transition-colors flex items-center space-x-1.5 border border-slate-700"
                >
                  <Database className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Export Vault JSONL</span>
                </button>
              </div>
            </div>

            {/* Plugin Manifest Inspection */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-semibold text-slate-200 flex items-center space-x-1.5">
                    <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Generated .piplug Manifest ({currentPersona.name})</span>
                  </span>
                  <span className="text-[11px] font-mono text-indigo-300">v1.2.0 Spec Compliant</span>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-indigo-200/90 overflow-y-auto max-h-[280px]">
                  <pre>
                    {JSON.stringify(
                      assimilationService.generatePIPlugBundle(currentPersona).manifest,
                      null,
                      2
                    )}
                  </pre>
                </div>
              </div>

              {/* PI-Desktop Permission Boundary & Sandbox */}
              <div className="lg:col-span-5 bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                    <span className="text-xs font-semibold text-slate-200 flex items-center space-x-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                      <span>PI-Desktop Sandboxed Execution Gate</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                      Strict Gate
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                    PI-Desktop intercepts all file mutations, bridge dispatches, and subagent scripts behind interactive diff reviews:
                  </p>

                  <div className="space-y-2">
                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs flex items-center justify-between">
                      <span className="text-slate-300">fs:write_with_approval</span>
                      <span className="text-[10px] text-emerald-400 font-mono">Permitted (Prompted)</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs flex items-center justify-between">
                      <span className="text-slate-300">net:tailscale (Mesh VPN)</span>
                      <span className="text-[10px] text-emerald-400 font-mono">Bound to MagicDNS</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs flex items-center justify-between">
                      <span className="text-slate-300">audio:pcm_stream</span>
                      <span className="text-[10px] text-emerald-400 font-mono">16kHz Int16 Loopback</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs flex items-center justify-between">
                      <span className="text-slate-300">superpowers:subagent_fork</span>
                      <span className="text-[10px] text-emerald-400 font-mono">Isolated Context</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-indigo-950/20 border border-indigo-500/20 rounded-lg text-[11px] text-indigo-300">
                  Importing the downloaded <code className="text-slate-100">.piplug</code> file directly into PI-Desktop immediately registers {currentPersona.name} with offline persistence, vector memory, and voice loopback.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
