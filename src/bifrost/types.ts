/**
 * Bifrost Bridge — shared type vocabulary.
 *
 * The Bifrost is the governed remote-access surface of Camelot-OS: the set of
 * transports that let a Camelot operator reach a physical machine. Sir Heimdall
 * is the Arch-Guardian that decides who crosses, at what fidelity, carrying
 * which scopes, for how long.
 *
 * Nothing in this file performs I/O. Every module in src/bifrost/ is a pure
 * function over these types so the guardian can be exercised in tests without a
 * tailnet, a desktop, or a running transport.
 */

/** A transport is one concrete way to cross the bridge. */
export type BifrostTransportId =
  | 'tailscale_mesh'
  | 'rustdesk_control'
  | 'sunshine_moonlight'
  | 'tauri_agent'
  | 'sonar_sensor';

/**
 * Fidelity is the *ladder* of how much of a machine a session exposes.
 * Strictly ordered: each rung includes everything below it.
 */
export type BifrostFidelity = 'observe' | 'view' | 'interact' | 'control';

export const FIDELITY_ORDER: BifrostFidelity[] = ['observe', 'view', 'interact', 'control'];

export function fidelityRank(fidelity: BifrostFidelity): number {
  return FIDELITY_ORDER.indexOf(fidelity);
}

/** A scope is a single concrete capability carried over a session. */
export type BifrostScope =
  | 'screen_view'
  | 'audio_out'
  | 'input_inject'
  | 'clipboard_read'
  | 'clipboard_write'
  | 'file_pull'
  | 'file_push'
  | 'shell_exec'
  | 'process_list'
  | 'network_observe';

/** Mirrors CamelotCommandRecord['riskClass'] so bridge risk speaks the runtime's language. */
export type BifrostRiskClass =
  | 'L0_OBSERVE'
  | 'L1_DRAFT'
  | 'L2_SAFE_EXECUTE'
  | 'L3_GUARDED_WRITE'
  | 'L4_HIGH_RISK'
  | 'L5_FORBIDDEN';

export type BridgeVerdict = 'ALLOW' | 'APPROVAL_REQUIRED' | 'DENY';

export type BifrostSessionState =
  | 'requested'
  | 'gated'
  | 'provisioning'
  | 'active'
  | 'degraded'
  | 'revoked'
  | 'expired'
  | 'closed';

export type BifrostDeviceKind = 'desktop' | 'android' | 'browser' | 'termux' | 'cloud_worker' | 'gpu_worker';

/** A machine enrolled on the far side of the bridge. */
export interface BifrostDevice {
  deviceId: string;
  name: string;
  kind: BifrostDeviceKind;
  /**
   * Owning tenant. A device with no tenantId is a house device and is never
   * targetable by a client pipeline — tenant isolation fails closed.
   */
  tenantId?: string;
  /** MagicDNS name on the tailnet. Absence means the device is not mesh-reachable. */
  tailscaleName?: string;
  /** Tailnet-assigned addresses. Used to prove a peer is inside the mesh. */
  tailnetAddresses: string[];
  enrolled: boolean;
  /** Highest fidelity this device may ever grant, regardless of what is requested. */
  maxFidelity: BifrostFidelity;
  /** Scopes the device owner has permanently withheld. Heimdall never grants these. */
  deniedScopes: BifrostScope[];
  supportedTransports: BifrostTransportId[];
  lastHeartbeatAt?: string;
  /** Public key fingerprint of the node's gatekeeper daemon, if attested. */
  gatekeeperFingerprint?: string;
}

/** What an operator (or an autonomous knight) is asking the bridge to do. */
export interface BifrostCrossingRequest {
  requestId: string;
  deviceId: string;
  transport: BifrostTransportId;
  fidelity: BifrostFidelity;
  scopes: BifrostScope[];
  /** Free-text reason recorded in the ledger. Required — crossings are never anonymous. */
  purpose: string;
  requestedBy: string;
  requestedTtlSeconds?: number;
  source?: 'voice' | 'chat' | 'dashboard' | 'automation' | 'cli';
}

export interface BifrostWatchpoint {
  id: string;
  description: string;
  /** Which Gjallarhorn rule enforces this while the session is live. */
  rule: string;
}

/** Heimdall's ruling on a crossing request. */
export interface BifrostVerdict {
  verdict: BridgeVerdict;
  riskClass: BifrostRiskClass;
  grantedScopes: BifrostScope[];
  /** Scopes that were asked for and refused, with the reason attached. */
  refusedScopes: { scope: BifrostScope; reason: string }[];
  grantedFidelity: BifrostFidelity;
  ttlSeconds: number;
  maxIdleSeconds: number;
  watchpoints: BifrostWatchpoint[];
  reasons: string[];
}

/** The signed capability a node's gatekeeper daemon accepts as proof of authorization. */
export interface BifrostSessionEnvelope {
  sessionId: string;
  requestId: string;
  deviceId: string;
  transport: BifrostTransportId;
  fidelity: BifrostFidelity;
  scopes: BifrostScope[];
  riskClass: BifrostRiskClass;
  issuedBy: string;
  notBefore: string;
  notAfter: string;
  maxIdleSeconds: number;
  /** Canonical string that was signed. Reproduced byte-for-byte by the Rust/Go verifiers. */
  canonical: string;
  signature: string;
  algorithm: 'HMAC-SHA256';
}

export interface BifrostSession {
  envelope: BifrostSessionEnvelope;
  state: BifrostSessionState;
  openedAt: string;
  lastActivityAt: string;
  /** Set when the session leaves the happy path. */
  terminationReason?: string;
  degradedReason?: string;
}

export type AlarmSeverity = 'info' | 'warning' | 'critical';

export interface GjallarhornAlarm {
  id: string;
  rule: string;
  severity: AlarmSeverity;
  message: string;
  deviceId?: string;
  sessionId?: string;
  /** Critical alarms halt the bridge; warnings force approval on new crossings. */
  halts: boolean;
}

/** One row of a Sonar flow matrix, normalized for the guardian. */
export interface SonarFlowObservation {
  peerAddress: string;
  protocol: string;
  port?: number;
  direction: 'inbound' | 'outbound';
  bytes: number;
  observedAt: string;
}
