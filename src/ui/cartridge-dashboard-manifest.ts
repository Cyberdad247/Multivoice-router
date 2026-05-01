import { CARTRIDGES } from '../cartridges/cartridge-registry';
import { EdgeWorkerKind } from '../edge/edge-action-schema';

export type DashboardPanelKind =
  | 'command_input'
  | 'telemetry'
  | 'approval_queue'
  | 'edge_actions'
  | 'memory_refs'
  | 'ledger_events'
  | 'source_table'
  | 'patch_preview'
  | 'dag_view'
  | 'logs'
  | 'tool_manifest';

export interface CartridgeDashboardPanel {
  id: string;
  title: string;
  kind: DashboardPanelKind;
  description: string;
}

export interface CartridgeDashboardManifest {
  cartridgeId: string;
  mode: string;
  title: string;
  glyph: string;
  leadKnight: string;
  summary: string;
  workers: EdgeWorkerKind[];
  panels: CartridgeDashboardPanel[];
  safeActions: string[];
  hitlActions: string[];
}

const BASE_PANELS: CartridgeDashboardPanel[] = [
  { id: 'command', title: 'Command', kind: 'command_input', description: 'Issue a governed Anya command for this cartridge.' },
  { id: 'approvals', title: 'Approvals', kind: 'approval_queue', description: 'Review HITL-required actions before execution.' },
  { id: 'memory', title: 'Memory', kind: 'memory_refs', description: 'View UKG and hydration refs produced by the cartridge.' },
  { id: 'ledger', title: 'Ledger', kind: 'ledger_events', description: 'View provenance and command receipts.' }
];

export const CARTRIDGE_DASHBOARDS: CartridgeDashboardManifest[] = [
  {
    cartridgeId: 'ant_vortex',
    mode: 'ANT',
    title: 'ANT Vortex Research Dashboard',
    glyph: '🐝',
    leadKnight: 'Lady Apis',
    summary: 'Research, source gathering, fit/gap analysis, citation confidence, and UKG findings.',
    workers: ['chrome_superpowers_worker', 'modal_cloud_worker'],
    panels: [
      ...BASE_PANELS,
      { id: 'sources', title: 'Sources', kind: 'source_table', description: 'Source list, confidence, citation state, and fit/gap notes.' },
      { id: 'tools', title: 'Research Tools', kind: 'tool_manifest', description: 'Search, scrape, arXiv, NotebookLM, and browser tool availability.' }
    ],
    safeActions: ['search_web', 'extract_dom', 'screenshot', 'summarize_source'],
    hitlActions: ['scrape_sensitive_site', 'paid_api_use']
  },
  {
    cartridgeId: 'beaver_tectonic',
    mode: 'BEAVER',
    title: 'BEAVER Build Dashboard',
    glyph: '🦫',
    leadKnight: 'Sir Forge',
    summary: 'Blueprints, task DAGs, patch previews, build/test status, and Antigravity envelopes.',
    workers: ['termux_cli_worker', 'rustdesk_desktop_worker'],
    panels: [
      ...BASE_PANELS,
      { id: 'dag', title: 'Task DAG', kind: 'dag_view', description: 'HTN execution map and dependencies.' },
      { id: 'patch', title: 'Patch Preview', kind: 'patch_preview', description: 'Diff preview, rollback plan, and Iron Gate status.' },
      { id: 'logs', title: 'Build Logs', kind: 'logs', description: 'Typecheck, test, and build output.' }
    ],
    safeActions: ['read_file', 'run_typecheck', 'run_tests', 'prepare_patch'],
    hitlActions: ['write_file', 'shell_command', 'delete_path', 'push_git']
  },
  {
    cartridgeId: 'spider_silk',
    mode: 'SPIDER',
    title: 'SPIDER Integration Dashboard',
    glyph: '🕸️',
    leadKnight: 'Sir Link',
    summary: 'WebMCP discovery, API handshakes, route maps, retries, and dead-letter queue.',
    workers: ['chrome_superpowers_worker', 'modal_cloud_worker'],
    panels: [
      ...BASE_PANELS,
      { id: 'tools', title: 'Tool Manifests', kind: 'tool_manifest', description: 'WebMCP, MCP, CDP, and external provider capabilities.' },
      { id: 'telemetry', title: 'Route Telemetry', kind: 'telemetry', description: 'Route selected, latency, retry, and dead-letter data.' }
    ],
    safeActions: ['discover_webmcp', 'navigate', 'extract_dom', 'simulate_route'],
    hitlActions: ['submit_form', 'account_change', 'purchase']
  },
  {
    cartridgeId: 'octopus_lazarus',
    mode: 'OCTOPUS',
    title: 'OCTOPUS Recovery Dashboard',
    glyph: '🐙',
    leadKnight: 'Sir Debug',
    summary: 'Incident timeline, logs, repro steps, root cause notes, and recovery patches.',
    workers: ['termux_cli_worker', 'rustdesk_desktop_worker'],
    panels: [
      ...BASE_PANELS,
      { id: 'logs', title: 'Logs', kind: 'logs', description: 'Runtime, worker, browser, and system logs.' },
      { id: 'patch', title: 'Recovery Patch', kind: 'patch_preview', description: 'Fix plan, diff preview, and rollback path.' }
    ],
    safeActions: ['read_logs', 'capture_screenshot', 'run_diagnostics', 'reproduce_issue'],
    hitlActions: ['apply_recovery_patch', 'restart_service', 'delete_path', 'shell_command']
  }
];

export function getDashboardForCartridge(cartridgeIdOrMode: string): CartridgeDashboardManifest | undefined {
  const key = cartridgeIdOrMode.toLowerCase();
  return CARTRIDGE_DASHBOARDS.find(d => d.cartridgeId === key || d.mode.toLowerCase() === key);
}

export function listDashboardSummaries() {
  return CARTRIDGE_DASHBOARDS.map(d => ({
    cartridgeId: d.cartridgeId,
    mode: d.mode,
    title: d.title,
    leadKnight: d.leadKnight,
    panels: d.panels.length,
    workers: d.workers
  }));
}

export function assertDashboardsMatchCartridges() {
  const cartridgeIds = new Set(CARTRIDGES.map(c => c.id));
  return CARTRIDGE_DASHBOARDS.filter(d => !cartridgeIds.has(d.cartridgeId)).map(d => d.cartridgeId);
}
