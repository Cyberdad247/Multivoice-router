/**
 * Bifrost transport registry.
 *
 * Each entry describes what one upstream project can physically carry, and the
 * ceiling Heimdall applies to it. The ceilings are deliberately lower than what
 * the upstream tools are capable of: a transport earns scopes here, it does not
 * inherit them from its own feature list.
 */

import { BifrostFidelity, BifrostScope, BifrostTransportId, fidelityRank } from './types';

export type LatencyClass = 'realtime' | 'interactive' | 'batch';

export interface BifrostTransport {
  id: BifrostTransportId;
  name: string;
  upstream: string;
  language: string;
  /** What this transport is actually good at, in one line. */
  role: string;
  latencyClass: LatencyClass;
  /** Highest fidelity the transport may ever be granted. */
  maxFidelity: BifrostFidelity;
  /** The complete set of scopes this transport is permitted to carry. */
  carriableScopes: BifrostScope[];
  /**
   * When true the transport must ride inside the tailnet. Heimdall denies the
   * crossing if the device has no tailnet address.
   */
  requiresTailnet: boolean;
  /** Transport encrypts its own payload independently of the mesh. */
  selfEncrypting: boolean;
  /** Preference when Heimdall picks a replacement during failover. Lower wins. */
  failoverRank: number;
  notes: string;
}

export const BIFROST_TRANSPORTS: BifrostTransport[] = [
  {
    id: 'tailscale_mesh',
    name: 'Tailscale Mesh',
    upstream: 'https://tailscale.com',
    language: 'Go',
    role: 'The bridge itself — WireGuard mesh every other transport rides inside.',
    latencyClass: 'interactive',
    maxFidelity: 'observe',
    carriableScopes: ['network_observe'],
    requiresTailnet: false,
    selfEncrypting: true,
    failoverRank: 0,
    notes:
      'Never carries a desktop session on its own. Presence of a tailnet address is the ' +
      'precondition every other transport is checked against.',
  },
  {
    id: 'sunshine_moonlight',
    name: 'Sunshine + Moonlight',
    upstream: 'https://github.com/LizardByte/Sunshine + https://github.com/moonlight-stream/moonlight-qt',
    language: 'C++',
    role: 'Hardware-encoded low-latency desktop streaming. The high-fidelity display path.',
    latencyClass: 'realtime',
    maxFidelity: 'interact',
    carriableScopes: ['screen_view', 'audio_out', 'input_inject'],
    requiresTailnet: true,
    selfEncrypting: true,
    failoverRank: 1,
    notes:
      'Sunshine hosts, Moonlight views. Deliberately capped below "control": this path ' +
      'carries pixels, audio and input, never files or a shell. Pair it with rustdesk_control ' +
      'when a session genuinely needs transfer.',
  },
  {
    id: 'rustdesk_control',
    name: 'RustDesk Control',
    upstream: 'https://github.com/rustdesk/rustdesk',
    language: 'Rust',
    role: 'General remote control including clipboard and file transfer. The broad-capability path.',
    latencyClass: 'interactive',
    maxFidelity: 'control',
    carriableScopes: [
      'screen_view',
      'input_inject',
      'clipboard_read',
      'clipboard_write',
      'file_pull',
      'file_push',
    ],
    requiresTailnet: true,
    selfEncrypting: true,
    failoverRank: 2,
    notes:
      'The only transport permitted to move files. Every file scope is L4 and always ' +
      'requires human approval — see heimdall-guardian.',
  },
  {
    id: 'tauri_agent',
    name: 'Tauri Desktop Agent',
    upstream: 'https://github.com/lorryjovens-hub/claude-rust-desktop',
    language: 'Rust + React',
    role: 'Structured agent surface on the desktop: MCP tools, terminal, file explorer.',
    latencyClass: 'batch',
    maxFidelity: 'control',
    carriableScopes: ['process_list', 'file_pull', 'shell_exec'],
    requiresTailnet: true,
    selfEncrypting: false,
    failoverRank: 3,
    notes:
      'Reaches the machine through a structured API rather than synthesized input, so its ' +
      'actions are auditable per-call. shell_exec here is still L4 and gated.',
  },
  {
    id: 'sonar_sensor',
    name: 'Sonar Network Sensor',
    upstream: 'https://github.com/Sonar-team/Sonar_desktop_app',
    language: 'Rust + Tauri',
    role: "Heimdall's eyes and ears — packet capture and flow matrices over the bridge.",
    latencyClass: 'batch',
    maxFidelity: 'observe',
    carriableScopes: ['network_observe'],
    requiresTailnet: false,
    selfEncrypting: false,
    failoverRank: 9,
    notes:
      'Read-only by construction. Feeds Gjallarhorn; never carries a control scope and ' +
      'is never a failover target for an interactive session.',
  },
];

export function getTransport(id: BifrostTransportId): BifrostTransport | undefined {
  return BIFROST_TRANSPORTS.find(t => t.id === id);
}

export function listTransportsCarrying(scope: BifrostScope): BifrostTransport[] {
  return BIFROST_TRANSPORTS.filter(t => t.carriableScopes.includes(scope));
}

/**
 * Pick the best transport that can carry every requested scope at or above the
 * requested fidelity. Used for failover when the active transport degrades.
 */
export function selectTransport(input: {
  scopes: BifrostScope[];
  fidelity: BifrostFidelity;
  supported: BifrostTransportId[];
  exclude?: BifrostTransportId[];
}): BifrostTransport | undefined {
  const excluded = new Set(input.exclude || []);
  return BIFROST_TRANSPORTS.filter(t => input.supported.includes(t.id))
    .filter(t => !excluded.has(t.id))
    .filter(t => fidelityRank(t.maxFidelity) >= fidelityRank(input.fidelity))
    .filter(t => input.scopes.every(s => t.carriableScopes.includes(s)))
    .sort((a, b) => a.failoverRank - b.failoverRank)[0];
}
