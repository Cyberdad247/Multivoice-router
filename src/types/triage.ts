export type TriageSeverity = 'low' | 'medium' | 'high' | 'critical';

export type TriageCategory = 
  | 'SYNTAX_AST_FAULT'
  | 'ASYNC_DEADLOCK'
  | 'MEMORY_SCARCITY'
  | 'RATE_LIMIT_QUOTA'
  | 'COLLISION_DUPLICATE_KEY'
  | 'AUDIO_BUFFER_UNDERFLOW'
  | 'WEBSOCKET_DISCONNECT'
  | 'Z3_INVARIANT_VIOLATION';

export interface Z3VerificationProof {
  proofId: string;
  formula: string;
  solver: 'Z3-SMT-v4.12' | 'SymPy-Poly';
  result: 'SAT' | 'UNSAT' | 'VERIFIED_SAFE';
  constraintsEvaluated: number;
  timeMicroseconds: number;
  invariantsPreserved: string[];
}

export interface SelfHealingRecipe {
  id: string;
  name: string;
  description: string;
  targetSubsystem: 'memory' | 'network' | 'audio' | 'dom' | 'llm-router' | 'worker-pool';
  automated: boolean;
  z3Verified: boolean;
  diffLines: number;
  requiresHitlApproval: boolean;
  actionPayload: {
    strategy: string;
    parameters: Record<string, any>;
  };
}

export interface TriageIncident {
  id: string;
  timestamp: string;
  severity: TriageSeverity;
  category: TriageCategory;
  sourceModule: string;
  errorMessage: string;
  stackTrace?: string;
  contextData?: Record<string, any>;
  status: 'intercepted' | 'analyzing' | 'z3_verified' | 'healed' | 'blocked_hitl';
  rootCauseAnalysis: string;
  healingRecipe?: SelfHealingRecipe;
  z3Proof?: Z3VerificationProof;
  resolutionTimeMs?: number;
  reforgedEngine: 'Rust-NanoBot-Core' | 'Go-NanoClaw-Daemon';
}

export interface NanoClawGoTelemetry {
  daemonVersion: string;
  activeGoroutines: number;
  channelDepths: {
    telemetryQueue: number;
    errorIngress: number;
    healingActuators: number;
    ipcSharedMemory: number;
  };
  isolationContainers: {
    containerId: string;
    name: string;
    status: 'running' | 'idle' | 'quarantined';
    memoryUsageMb: number;
    sandboxedCgroup: string;
    madviseEvictionCount: number;
  }[];
  edgeMemoryCeilingMb: number;
  currentHostAllocMb: number;
  gcTriggerActive: boolean;
  zeroCopySlabsCount: number;
  uptimeSeconds: number;
}

export interface NanoBotRustTelemetry {
  coreVersion: string;
  astParserEngine: string;
  ternaryState: -1 | 0 | 1; // BitNet 1.58b: -1=degraded, 0=neutral, +1=sovereign
  scannedModulesCount: number;
  totalTriagedIncidents: number;
  z3ProofCacheHits: number;
  scorpionStingCycleChecks: number;
  hotPatchesGenerated: number;
  hitlFirewallTriggerCount: number;
  meanTriageLatencyUs: number;
  activeSupervisionRules: number;
}

export interface FullTriageSystemState {
  nanoclaw: NanoClawGoTelemetry;
  nanobot: NanoBotRustTelemetry;
  incidents: TriageIncident[];
  autoHealEnabled: boolean;
  systemHealthScore: number; // 0 - 100
  activeFaultInjections: string[];
}
