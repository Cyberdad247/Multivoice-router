export type AnyaInterphaseTabId =
  | 'bridge'
  | 'faction'
  | 'archives'
  | 'hive'
  | 'governance'
  | 'telephony'
  | 'omni'
  | 'system';

export interface AnyaInterphasePanelBinding {
  tabId: AnyaInterphaseTabId;
  label: string;
  sourceComponent: string;
  assimilatedRole: string;
  runtimeFeeds: string[];
  nextIntegrationStep: string;
}

export const ANYA_INTERPHASE_PANEL_BINDINGS: AnyaInterphasePanelBinding[] = [
  {
    tabId: 'bridge',
    label: 'The Bridge',
    sourceComponent: 'OmniEye + SwarmMatrix + QuestLog',
    assimilatedRole: 'Main Anya command center with visual stream, worker telemetry, and active quest log.',
    runtimeFeeds: ['cartridge_events', 'edge_worker_heartbeats', 'command_queue', 'visual_stream_refs'],
    nextIntegrationStep: 'Mount CartridgeDashboardHost and replace mock swarm data with runtime event bus.'
  },
  {
    tabId: 'faction',
    label: 'Faction',
    sourceComponent: 'FactionHub',
    assimilatedRole: 'Knight roster, voice profiles, persona/council mode, and active speaker identities.',
    runtimeFeeds: ['knight_roster_v400', 'voice_profiles', 'multivoice_sessions'],
    nextIntegrationStep: 'Connect to KNIGHT_ROSTER_V400 and VOICE_PROFILES.'
  },
  {
    tabId: 'archives',
    label: 'Archives',
    sourceComponent: 'ResearchArchives',
    assimilatedRole: 'Ouroboros memory, UKG snapshots, research findings, and hydration refs.',
    runtimeFeeds: ['memory_refs', 'ukg_snapshots', 'research_findings'],
    nextIntegrationStep: 'Connect to memory refs and UKG hydration loader.'
  },
  {
    tabId: 'hive',
    label: 'Hive IDE',
    sourceComponent: 'SovereignConsole + future IDE panel',
    assimilatedRole: 'Guarded terminal, Termux/Hive runtime console, patch preview, and build/test output.',
    runtimeFeeds: ['command_queue', 'termux_worker', 'patch_preview', 'build_logs'],
    nextIntegrationStep: 'Replace static xterm lines with guarded runtime command transport.'
  },
  {
    tabId: 'governance',
    label: 'Governance',
    sourceComponent: 'Governance placeholder',
    assimilatedRole: 'HITL approvals, Veritas findings, Gideon audit, and Antigravity envelope.',
    runtimeFeeds: ['approvals', 'veritas_findings', 'antigravity_envelopes', 'ledger_events'],
    nextIntegrationStep: 'Render PendingApprovalView cards and approval/deny controls.'
  },
  {
    tabId: 'telephony',
    label: 'Voice & Telephony',
    sourceComponent: 'Telephony placeholder + Mic orb',
    assimilatedRole: 'LiveKit voice room, single/council/podcast mode, OmniVoice receipts, and automation rules.',
    runtimeFeeds: ['voice_profiles', 'voice_sessions', 'omnivoice_receipts', 'voice_automation_rules'],
    nextIntegrationStep: 'Add multivoice session timeline and OmniVoice local-first render panel.'
  },
  {
    tabId: 'omni',
    label: 'Omni-Route',
    sourceComponent: 'Omni placeholder',
    assimilatedRole: 'OmniRoute model routing and OmniVoice cost-safe voice routing monitor.',
    runtimeFeeds: ['model_routes', 'voice_routes', 'cost_receipts', 'provider_health'],
    nextIntegrationStep: 'Display route choices, fallback lanes, and bill-safe voice tier.'
  },
  {
    tabId: 'system',
    label: 'System',
    sourceComponent: 'SystemHub',
    assimilatedRole: 'Device mesh, Tailscale status, worker health, runtime metrics, and environment probes.',
    runtimeFeeds: ['device_registry', 'tailscale_status', 'health_status', 'runtime_metrics'],
    nextIntegrationStep: 'Connect platform probe to worker/device registry and health endpoint.'
  }
];

export function getAnyaInterphaseBinding(tabId: AnyaInterphaseTabId) {
  return ANYA_INTERPHASE_PANEL_BINDINGS.find(binding => binding.tabId === tabId);
}
