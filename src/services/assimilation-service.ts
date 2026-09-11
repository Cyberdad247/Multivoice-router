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
  PIDesktopPackageMeta,
} from '../types/assimilation';
import { Persona } from '../types/persona';

export const SUPERPOWER_SKILLS: SuperpowerSkill[] = [
  {
    id: 'systematic-debugging',
    name: 'Systematic Debugging',
    category: 'engineering',
    description: 'Disciplined 4-phase investigation: Hypothesis Generation, Isolating Root Cause, Targeted Fix, and Regression Verification.',
    phases: ['Hypothesis Generation', 'Reproduce & Isolate', 'Targeted Correction', 'Regression Proof'],
    systemPromptGuideline: 'Approach problem with scientific discipline. Never apply speculative patches. Formulate falsifiable hypotheses.',
    iconName: 'Bug',
  },
  {
    id: 'test-driven-development',
    name: 'Test-Driven Verification',
    category: 'verification',
    description: 'Red-Green-Refactor test cycle. Writes failing assertions first, verifies target behavior, then optimizes.',
    phases: ['Failing Test Harness', 'Minimal Implementation', 'Green Verification', 'Refactor & Harden'],
    systemPromptGuideline: 'Write test assertions before implementing logic. Ensure test harness validates edge cases.',
    iconName: 'CheckCircle',
  },
  {
    id: 'multi-turn-planning',
    name: 'Multi-Turn Phased Planner',
    category: 'orchestration',
    description: 'Deconstructs complex goals into bounded, non-overlapping execution units with intermediate verification gates.',
    phases: ['Goal Dissection', 'Dependency Graph', 'Atomic Milestones', 'Risk Pre-Mortem'],
    systemPromptGuideline: 'Break down goals into sequentially verifiable tasks. Define explicit acceptance criteria per step.',
    iconName: 'ListOrdered',
  },
  {
    id: 'subagent-dispatch',
    name: 'Subagent Isolation Engine',
    category: 'orchestration',
    description: 'Forks context into an isolated ephemeral agent to run heavy code verification or deep web audits without polluting primary memory.',
    phases: ['Subtask Context Pruning', 'Subagent Launch', 'Independent Execution', 'Synthesis & Merge'],
    systemPromptGuideline: 'Spawn dedicated subagents for subtasks requiring clean context windows. Synthesize results back into main state.',
    iconName: 'Split',
  },
  {
    id: 'browser-devtools-inspector',
    name: 'DevTools Protocol Inspector',
    category: 'devtools',
    description: 'Interactively inspects DOM structures, network waterwalls, console exceptions, and storage states.',
    phases: ['Network Waterfall Audit', 'Console Exception Trace', 'DOM Hierarchy Check', 'Remediation Path'],
    systemPromptGuideline: 'Inspect runtime anomalies through virtual DevTools traces and network requests.',
    iconName: 'Terminal',
  },
];

class AssimilationService {
  /**
   * Execute a Superpowers structured skill
   */
  async executeSuperpower(
    skillId: string,
    problemStatement: string,
    persona?: Persona
  ): Promise<SkillExecutionResult> {
    const response = await fetch('/api/superpowers/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        skillId,
        problemStatement,
        personaName: persona?.name || 'Nova',
        personaRole: persona?.role || 'Lead AI Architect',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to execute skill: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Dispatch a subagent with isolated context
   */
  async dispatchSubagent(
    taskGoal: string,
    subagentType: SubagentTask['subagentType'] = 'code-verifier'
  ): Promise<SubagentTask> {
    const response = await fetch('/api/superpowers/subagent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskGoal, subagentType }),
    });

    if (!response.ok) {
      throw new Error(`Failed to dispatch subagent: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Run LLMFit hardware profiling
   */
  async getHardwareProfile(): Promise<LLMHardwareProfile> {
    const response = await fetch('/api/llmfit/profile');
    if (!response.ok) {
      throw new Error('Failed to retrieve hardware profile');
    }
    return await response.json();
  }

  /**
   * Get Bifröst Gateway routing and cache metrics
   */
  async getBifrostStatus(): Promise<{
    routes: BifrostRouteTelemetry[];
    cache: BifrostSemanticCache;
    activePrimary: string;
  }> {
    const response = await fetch('/api/bifrost/status');
    if (!response.ok) {
      throw new Error('Failed to fetch Bifröst status');
    }
    return await response.json();
  }

  /**
   * Compress text using OmniRoute RTK + Caveman prompt compression
   */
  async compressContext(
    rawText: string,
    method: 'rtk_caveman' | 'syntactic_pruning' | 'hybrid' = 'rtk_caveman'
  ): Promise<OmniRouteCompressionResult> {
    const response = await fetch('/api/omniroute/compress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: rawText, method }),
    });

    if (!response.ok) {
      throw new Error('Failed to compress context via OmniRoute');
    }

    return await response.json();
  }

  /**
   * Get OmniRoute provider fallback matrix
   */
  async getOmniRouteProviders(): Promise<OmniRouteProviderStatus[]> {
    const response = await fetch('/api/omniroute/providers');
    if (!response.ok) {
      throw new Error('Failed to fetch OmniRoute providers');
    }
    const data = await response.json();
    return data.providers;
  }

  /**
   * Get Colibri tiered MoE inference status
   */
  async getColibriStatus(): Promise<ColibriTierState> {
    const response = await fetch('/api/colibri/status');
    if (!response.ok) {
      throw new Error('Failed to fetch Colibri status');
    }
    return await response.json();
  }

  /**
   * Trigger Colibri MoE tiered inference query
   */
  async runColibriInference(prompt: string): Promise<{
    answer: string;
    expertsActivated: number[];
    vramStreamLatencyMs: number;
    tokensPerSec: number;
  }> {
    const response = await fetch('/api/colibri/infer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      throw new Error('Failed to run Colibri inference');
    }

    return await response.json();
  }

  /**
   * Export Persona as a native PI-Desktop .piplug package
   */
  generatePIPlugBundle(persona: Persona): {
    fileName: string;
    blob: Blob;
    manifest: Record<string, any>;
  } {
    const manifest: PIDesktopPackageMeta & Record<string, any> = {
      pluginId: `piplug-persona-${persona.id}`,
      name: `${persona.name} AI Persona`,
      version: '1.2.0',
      author: 'PersonaLive Ecosystem',
      personaName: persona.name,
      voice: persona.voice,
      description: persona.role,
      capabilities: [
        'multimodal_voice',
        'superpowers_planning',
        'bifrost_routing',
        'omniroute_compression',
        'colibri_moe_local',
      ],
      permissions: [
        'fs:read',
        'fs:write_with_approval',
        'net:tailscale',
        'audio:stream',
      ],
      exportDate: new Date().toISOString(),
      systemInstruction: persona.systemInstruction,
      memoryBank: persona.memory,
      ragConfig: persona.ragConfig,
      bridgeConfig: persona.bridgeConfig,
      mcpTools: [
        'query_persona_rag',
        'execute_superpower_skill',
        'dispatch_subagent',
        'colibri_moe_infer',
      ],
    };

    const jsonString = JSON.stringify(manifest, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const fileName = `${persona.name.toLowerCase().replace(/\s+/g, '-')}-v1.2.piplug.json`;

    return { fileName, blob, manifest };
  }

  /**
   * Export conversation and memories in SQLite/JSONL format for PI-Desktop vault
   */
  exportVaultData(persona: Persona, transcription: { role: string; text: string }[]): {
    jsonlBlob: Blob;
    fileName: string;
  } {
    const lines = [
      JSON.stringify({
        type: 'vault_header',
        schemaVersion: '2.0',
        personaId: persona.id,
        personaName: persona.name,
        exportedAt: new Date().toISOString(),
      }),
      ...persona.memory.map((m, idx) =>
        JSON.stringify({
          type: 'memory_record',
          id: `mem-${idx}`,
          content: m,
          timestamp: new Date().toISOString(),
        })
      ),
      ...transcription.map((t, idx) =>
        JSON.stringify({
          type: 'transcript_turn',
          index: idx,
          role: t.role,
          content: t.text,
          timestamp: new Date().toISOString(),
        })
      ),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'application/x-ndjson' });
    const fileName = `${persona.name.toLowerCase()}-pi-vault.jsonl`;
    return { jsonlBlob: blob, fileName };
  }
}

export const assimilationService = new AssimilationService();
