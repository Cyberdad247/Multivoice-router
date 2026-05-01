export type AionCapabilityArea =
  | 'desktop_packaging'
  | 'agent_chat'
  | 'code_editor'
  | 'diff_review'
  | 'mcp_tooling'
  | 'local_persistence'
  | 'document_parsing'
  | 'markdown_rendering'
  | 'webui_remote';

export interface AionCapabilityMapEntry {
  area: AionCapabilityArea;
  sourceTechnology: string[];
  assimilatedUse: string;
  destinationPanel: string[];
  camelotBoundary: string;
}

export const AIONUI_CAPABILITY_MAP: AionCapabilityMapEntry[] = [
  {
    area: 'desktop_packaging',
    sourceTechnology: ['Electron Forge', 'Electron Builder'],
    assimilatedUse: 'Build an installable Anya/Camelot desktop workbench for macOS, Windows, and Linux.',
    destinationPanel: ['System', 'Hive IDE'],
    camelotBoundary: 'Desktop app must still route risky execution through HITL and Antigravity.'
  },
  {
    area: 'agent_chat',
    sourceTechnology: ['AI chat interface for command-line agents', 'stream rendering'],
    assimilatedUse: 'Provide a rich agent chat surface for Anya, Merlin, Lukas, and CLI workers.',
    destinationPanel: ['Sovereign Console', 'Hive IDE', 'Bridge'],
    camelotBoundary: 'Chat may request actions but cannot bypass runtime route and approval gates.'
  },
  {
    area: 'code_editor',
    sourceTechnology: ['Monaco Editor', 'CodeMirror'],
    assimilatedUse: 'Use editor components for patch review, code editing, prompt editing, and workflow DAG JSON inspection.',
    destinationPanel: ['Hive IDE', 'BEAVER Dashboard'],
    camelotBoundary: 'Writes must go through Antigravity safe I/O.'
  },
  {
    area: 'diff_review',
    sourceTechnology: ['diff2html', 'syntax highlighter'],
    assimilatedUse: 'Show patch previews, rollback plans, and Gideon review findings.',
    destinationPanel: ['Governance', 'BEAVER Dashboard', 'OCTOPUS Dashboard'],
    camelotBoundary: 'Diff approval must create a review decision before execution.'
  },
  {
    area: 'mcp_tooling',
    sourceTechnology: ['@modelcontextprotocol/sdk', 'WebSocket', 'Express'],
    assimilatedUse: 'Expose MCP tool browser, local tool bridge, and Aether/Sir Link route inspection.',
    destinationPanel: ['Omni', 'SPIDER Dashboard'],
    camelotBoundary: 'Tool invocation must pass through Aether/Sir Link policy.'
  },
  {
    area: 'local_persistence',
    sourceTechnology: ['better-sqlite3'],
    assimilatedUse: 'Offline session cache, local voice cache, command history, and UKG snapshot buffer.',
    destinationPanel: ['Archives', 'System'],
    camelotBoundary: 'Tenant/org IDs must be enforced in local cache keys.'
  },
  {
    area: 'document_parsing',
    sourceTechnology: ['docx', 'mammoth', 'officeparser', 'pptx2json', 'xlsx-republish', 'turndown'],
    assimilatedUse: 'Ingest client docs, spreadsheets, slides, webpages, and convert them into research/memory artifacts.',
    destinationPanel: ['Archives', 'ANT Dashboard'],
    camelotBoundary: 'Parsed documents become memory candidates, not trusted facts until Veritas review.'
  },
  {
    area: 'markdown_rendering',
    sourceTechnology: ['react-markdown', 'remark-gfm', 'remark-math', 'rehype-katex', 'rehype-raw'],
    assimilatedUse: 'Render reports, UKG docs, audit notes, PRDs, and podcast transcripts.',
    destinationPanel: ['Archives', 'Reports', 'Governance'],
    camelotBoundary: 'Raw HTML rendering must be sanitized or restricted.'
  },
  {
    area: 'webui_remote',
    sourceTechnology: ['webui', 'webui:remote scripts'],
    assimilatedUse: 'Support remote web workbench access for operator devices.',
    destinationPanel: ['System', 'Bridge'],
    camelotBoundary: 'Remote access must require authentication, rate limits, and Tailscale/allowlist checks.'
  }
];

export function listAionCapabilitiesForPanel(panel: string) {
  const key = panel.toLowerCase();
  return AIONUI_CAPABILITY_MAP.filter(entry => entry.destinationPanel.some(p => p.toLowerCase().includes(key)));
}
