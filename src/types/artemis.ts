export interface ArtemisAction {
  stepNumber: number;
  action: 'tap' | 'type_text' | 'voice_verify' | 'inspect_tree' | 'swipe' | 'assert_latency' | 'screenshot';
  target: string;
  parameters?: Record<string, any>;
  result: 'success' | 'failed' | 'in_progress';
  latencyMs: number;
  timestamp: string;
}

export interface ArtemisTestRun {
  id: string;
  personaId: string;
  taskPrompt: string;
  status: 'passed' | 'failed' | 'running';
  successRate: number; // e.g., 99.2%
  actionsExecuted: ArtemisAction[];
  deviceTarget: string; // e.g., 'Pixel 9 Pro · Android 15 · ADB:5555'
  logs: string[];
  screenshotUrl?: string;
  ownerId: string;
  createdAt?: any;
}

export interface ArtemisBenchmarkSuite {
  id: string;
  title: string;
  category: 'AndroidWorld' | 'VoIP Telephony' | 'Audio Latency' | 'Accessibility';
  description: string;
  defaultPrompt: string;
}

export const ARTEMIS_PRESET_SUITES: ArtemisBenchmarkSuite[] = [
  {
    id: 'voice-call-dispatch',
    title: 'Sovereign Telephony End-to-End Egress',
    category: 'VoIP Telephony',
    description: 'Verify outbound SIP dialer opens, DTMF tones synthesize, and 24kHz Opus link connects within 35ms.',
    defaultPrompt: 'Open Sovereign Telephony dialer, dial destination number, verify 24kHz full-duplex audio stream connects without buffer underrun.'
  },
  {
    id: 'knight-awakening-blast',
    title: 'B.L.A.S.T. DAG & Z3 Invariant Audit',
    category: 'Audio Latency',
    description: 'Test all 5 stages of B.L.A.S.T. DAG execution, verify zero-copy ring buffer allocations, and assert Z3 proof receipt.',
    defaultPrompt: 'Trigger Knight awakening sequence, execute B.L.A.S.T. formal verification pipeline, assert sub-50ms latency and 0.0% Z3 error margin.'
  },
  {
    id: 'accessibility-screen-tree',
    title: 'AndroidWorld UI Accessibility Inspection',
    category: 'Accessibility',
    description: 'Traverse accessibility node hierarchy, check ARIA roledescription tags, and test keyboard navigation matrix 1-6.',
    defaultPrompt: 'Inspect accessibility node tree of Camelot Carousel, verify all 6 Knight cards have accessible roles, test keyboard hotkey navigation.'
  },
  {
    id: 'vocal-license-c2pa',
    title: 'C2PA Audio Provenance & Watermark Verification',
    category: 'AndroidWorld',
    description: 'Validate spectral F0 hash calculation, inspect inaudible watermark key, and verify C2PA certificate signature ledger.',
    defaultPrompt: 'Mint Sovereign Vocal License for selected Knight, compute spectral F0 hash, verify C2PA signature manifest complies with AI Act.'
  }
];
