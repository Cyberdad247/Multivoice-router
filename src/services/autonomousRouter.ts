export type RouterTarget = 
  | 'telephony' 
  | 'vocal_license' 
  | 'artemis_test' 
  | 'blast_dag' 
  | 'voice_studio' 
  | 'persona_switch' 
  | 'none';

export interface RouterDecision {
  id: string;
  target: RouterTarget;
  confidence: number;
  isSubsystemNeeded: boolean;
  recommendedPersonaId?: string;
  recommendedPersonaName?: string;
  reason: string;
  actionLabel: string;
  directive?: string;
  timestamp: number;
  source: 'user_input' | 'voice_transcript' | 'preset_intent';
}

export interface IntentPreset {
  id: string;
  label: string;
  icon: string;
  prompt: string;
  category: string;
}

export const SMART_INTENT_PRESETS: IntentPreset[] = [
  {
    id: 'casual-chat',
    label: 'Casual Dialogue',
    icon: '💬',
    prompt: 'Let us discuss sovereign computing and ancient wisdom.',
    category: 'General'
  },
  {
    id: 'call-outbound',
    label: 'Voice Phone Call',
    icon: '📞',
    prompt: 'Initiate a secure VoIP call to the bridge dialer.',
    category: 'Telephony'
  },
  {
    id: 'mint-license',
    label: 'C2PA Voice Deed',
    icon: '📜',
    prompt: 'Generate an immutable C2PA vocal deed and timbre watermark for my voice.',
    category: 'Licensing'
  },
  {
    id: 'artemis-test',
    label: 'Automated UI Test',
    icon: '⚡',
    prompt: 'Run Google Artemis automated AndroidWorld benchmark and verify audio latency.',
    category: 'Automation'
  },
  {
    id: 'clone-voice',
    label: 'Voice Reference Studio',
    icon: '🎙️',
    prompt: 'Record a new audio reference sample to calibrate the acoustic model.',
    category: 'Studio'
  },
  {
    id: 'verify-blast',
    label: 'B.L.A.S.T. Protocol',
    icon: '🛡️',
    prompt: 'Execute B.L.A.S.T. DAG pipeline and verify Z3 SMT invariants.',
    category: 'Security'
  }
];

// Heuristics and keyword triggers
const TELEPHONY_KEYWORDS = [
  'call', 'phone', 'dial', 'sip', 'voip', 'ring', 'reach out', 'webrtc', 
  'pstn', 'hang up', 'telephony', 'dialer', 'telephone', 'outbound call', 'inbound'
];

const VOCAL_LICENSE_KEYWORDS = [
  'license', 'deed', 'c2pa', 'watermark', 'provenance', 'timbre', 'copyright',
  'royalties', 'royalty', 'rights', 'ownership', 'intellectual property', 'f0 hash',
  'spectral hash', 'sanctuary deed', 'certificate', 'ai act'
];

const ARTEMIS_KEYWORDS = [
  'test', 'benchmark', 'artemis', 'android', 'androidworld', 'bug', 'automation',
  'inspect tree', 'accessibility', 'latency test', 'adb', 'pixel', 'verify ui',
  'action trace', 'framebuffer', 'e2e'
];

const BLAST_DAG_KEYWORDS = [
  'blast', 'dag', 'z3', 'formal verification', 'smt', 'invariant', 'microvm',
  'zero-copy', 'memfd', 'ring buffer', 'kinetic workflow', 'pipeline step'
];

const VOICE_STUDIO_KEYWORDS = [
  'record voice', 'clone voice', 'upload voice', 'voice studio', 'audio sample',
  'mic sample', 'record sample', 'new voice', 'voice sample'
];

const DISMISS_KEYWORDS = [
  'nevermind', 'cancel', 'close this', 'close', 'dismiss', 'back to voice',
  'regular chat', 'just chat', 'talk normally', 'return to menu', 'done with this'
];

export class AutonomousRouterService {
  private static instance: AutonomousRouterService;
  private history: RouterDecision[] = [];
  private listeners: ((decision: RouterDecision) => void)[] = [];
  private isAutoRoutingEnabled: boolean = true;

  public static getInstance(): AutonomousRouterService {
    if (!AutonomousRouterService.instance) {
      AutonomousRouterService.instance = new AutonomousRouterService();
    }
    return AutonomousRouterService.instance;
  }

  public setAutoRoutingEnabled(enabled: boolean) {
    this.isAutoRoutingEnabled = enabled;
  }

  public getAutoRoutingEnabled(): boolean {
    return this.isAutoRoutingEnabled;
  }

  public subscribe(listener: (decision: RouterDecision) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify(decision: RouterDecision) {
    this.history.unshift(decision);
    if (this.history.length > 25) this.history.pop();
    this.listeners.forEach(cb => cb(decision));
  }

  public getRecentDecisions(): RouterDecision[] {
    return [...this.history];
  }

  /**
   * Evaluates text input or spoken transcript to determine if a sub-system is needed
   */
  public evaluate(
    text: string, 
    source: 'user_input' | 'voice_transcript' | 'preset_intent' = 'user_input',
    currentPersonaId?: string
  ): RouterDecision {
    const raw = text.toLowerCase().trim();

    if (!raw) {
      return {
        id: `dec_${Date.now()}`,
        target: 'none',
        confidence: 1.0,
        isSubsystemNeeded: false,
        reason: 'No directive provided. Idle in natural conversation mode.',
        actionLabel: 'Idle',
        timestamp: Date.now(),
        source
      };
    }

    // Check for explicit dismiss/close command
    if (DISMISS_KEYWORDS.some(k => raw.includes(k))) {
      const dec: RouterDecision = {
        id: `dec_${Date.now()}`,
        target: 'none',
        confidence: 0.95,
        isSubsystemNeeded: false,
        reason: 'User requested return to regular conversation. Subsystems dismissed.',
        actionLabel: 'Return to Conversation',
        timestamp: Date.now(),
        source
      };
      this.notify(dec);
      return dec;
    }

    // 1. Telephony check
    const telephonyScore = this.matchKeywords(raw, TELEPHONY_KEYWORDS);
    if (telephonyScore >= 1) {
      const dec: RouterDecision = {
        id: `dec_${Date.now()}`,
        target: 'telephony',
        confidence: Math.min(0.98, 0.7 + telephonyScore * 0.15),
        isSubsystemNeeded: true,
        recommendedPersonaId: 'sir-codex',
        recommendedPersonaName: 'Sir Codex',
        reason: 'Telephony & dialing intent detected. Outbound SIP trunking subsystem required.',
        actionLabel: 'Launch Sovereign Telephony',
        directive: text,
        timestamp: Date.now(),
        source
      };
      this.notify(dec);
      return dec;
    }

    // 2. Vocal License check
    const licenseScore = this.matchKeywords(raw, VOCAL_LICENSE_KEYWORDS);
    if (licenseScore >= 1) {
      const dec: RouterDecision = {
        id: `dec_${Date.now()}`,
        target: 'vocal_license',
        confidence: Math.min(0.99, 0.75 + licenseScore * 0.12),
        isSubsystemNeeded: true,
        recommendedPersonaId: 'sir-gideon',
        recommendedPersonaName: 'Sir Gideon',
        reason: 'Voice rights / C2PA watermark query detected. Vocal License Engine subsystem required.',
        actionLabel: 'Issue Vocal Deed',
        directive: text,
        timestamp: Date.now(),
        source
      };
      this.notify(dec);
      return dec;
    }

    // 3. Artemis Test Runner check
    const artemisScore = this.matchKeywords(raw, ARTEMIS_KEYWORDS);
    if (artemisScore >= 1) {
      const dec: RouterDecision = {
        id: `dec_${Date.now()}`,
        target: 'artemis_test',
        confidence: Math.min(0.99, 0.75 + artemisScore * 0.12),
        isSubsystemNeeded: true,
        recommendedPersonaId: 'sir-codex',
        recommendedPersonaName: 'Sir Codex',
        reason: 'Device automation or benchmark query detected. Google Artemis runner required.',
        actionLabel: 'Run Artemis Benchmark',
        directive: text,
        timestamp: Date.now(),
        source
      };
      this.notify(dec);
      return dec;
    }

    // 4. BLAST DAG check
    const blastScore = this.matchKeywords(raw, BLAST_DAG_KEYWORDS);
    if (blastScore >= 1) {
      const dec: RouterDecision = {
        id: `dec_${Date.now()}`,
        target: 'blast_dag',
        confidence: Math.min(0.95, 0.7 + blastScore * 0.15),
        isSubsystemNeeded: true,
        recommendedPersonaId: 'merlin-omega',
        recommendedPersonaName: 'MERLIN_Ω',
        reason: 'Formal verification or DAG pipeline query detected. B.L.A.S.T. monitor required.',
        actionLabel: 'Inspect B.L.A.S.T. DAG',
        directive: text,
        timestamp: Date.now(),
        source
      };
      this.notify(dec);
      return dec;
    }

    // 5. Voice Studio check
    const studioScore = this.matchKeywords(raw, VOICE_STUDIO_KEYWORDS);
    if (studioScore >= 1) {
      const dec: RouterDecision = {
        id: `dec_${Date.now()}`,
        target: 'voice_studio',
        confidence: Math.min(0.95, 0.7 + studioScore * 0.15),
        isSubsystemNeeded: true,
        reason: 'Voice sample recording or acoustic reference calibration detected.',
        actionLabel: 'Open Voice Studio',
        directive: text,
        timestamp: Date.now(),
        source
      };
      this.notify(dec);
      return dec;
    }

    // 6. Check for persona switch intent
    const personaSwitch = this.detectPersonaAffinity(raw);
    if (personaSwitch && personaSwitch.id !== currentPersonaId) {
      const dec: RouterDecision = {
        id: `dec_${Date.now()}`,
        target: 'persona_switch',
        confidence: 0.88,
        isSubsystemNeeded: true,
        recommendedPersonaId: personaSwitch.id,
        recommendedPersonaName: personaSwitch.name,
        reason: `Subject matter aligns closely with ${personaSwitch.name}'s domain (${personaSwitch.specialty}).`,
        actionLabel: `Switch to ${personaSwitch.name}`,
        directive: text,
        timestamp: Date.now(),
        source
      };
      this.notify(dec);
      return dec;
    }

    // 7. General conversation: NO sub-system needed!
    const dec: RouterDecision = {
      id: `dec_${Date.now()}`,
      target: 'none',
      confidence: 0.9,
      isSubsystemNeeded: false,
      reason: 'Natural conversational speech. Heavy subsystems remain dormant to keep interface serene.',
      actionLabel: 'Voice Dialogue',
      directive: text,
      timestamp: Date.now(),
      source
    };
    this.notify(dec);
    return dec;
  }

  private matchKeywords(text: string, keywords: string[]): number {
    let matches = 0;
    for (const kw of keywords) {
      if (text.includes(kw)) {
        matches++;
      }
    }
    return matches;
  }

  private detectPersonaAffinity(text: string): { id: string; name: string; specialty: string } | null {
    if (text.includes('code') || text.includes('wasm') || text.includes('compiler') || text.includes('backend') || text.includes('rust')) {
      return { id: 'sir-codex', name: 'Sir Codex', specialty: 'Systems & Compilation' };
    }
    if (text.includes('design') || text.includes('3d') || text.includes('animation') || text.includes('physics') || text.includes('sculpt') || text.includes('creative')) {
      return { id: 'sir-boris', name: 'Sir Boris', specialty: '3D Kinetic Artistry' };
    }
    if (text.includes('security') || text.includes('audit') || text.includes('cryptography') || text.includes('proof') || text.includes('iron gate')) {
      return { id: 'sir-gideon', name: 'Sir Gideon', specialty: 'Security & Verification' };
    }
    if (text.includes('history') || text.includes('rome') || text.includes('ancient') || text.includes('philosophy') || text.includes('past') || text.includes('story')) {
      return { id: 'elara', name: 'Elara', specialty: 'Histories & Philosophy' };
    }
    if (text.includes('hack') || text.includes('firewall') || text.includes('exploit') || text.includes('dark web') || text.includes('cyber')) {
      return { id: 'jax', name: 'Jax', specialty: 'Tactical Cybersecurity' };
    }
    if (text.includes('ocean') || text.includes('abyss') || text.includes('sea') || text.includes('pressure') || text.includes('dive')) {
      return { id: 'atlas', name: 'Atlas', specialty: 'Deep Ocean Exploration' };
    }
    if (text.includes('orchestrate') || text.includes('command') || text.includes('governance') || text.includes('council') || text.includes('merlin')) {
      return { id: 'merlin-omega', name: 'MERLIN_Ω', specialty: 'Council MetaCompiler' };
    }
    return null;
  }
}

export const autonomousRouter = AutonomousRouterService.getInstance();
