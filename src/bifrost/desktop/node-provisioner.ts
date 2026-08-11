/**
 * Node provisioning.
 *
 * Produces a *declarative plan* — never a command string. Each step is one of a
 * closed set of verbs, and the node gatekeeper re-validates every step against
 * the session envelope before applying it.
 *
 * This is the boundary that keeps a crossing request from becoming remote code
 * execution: nothing in a request reaches a shell, and the only paths a plan can
 * write to are relative names under a root the node itself configures.
 */

import { BifrostSessionEnvelope, BifrostTransportId } from '../types';
import {
  LinkTelemetry,
  NodeStreamCapability,
  StreamProfile,
  CONSERVATIVE_CAPABILITY,
  negotiateStreamProfile,
} from './stream-profile';
import {
  buildMoonlightConfig,
  buildRustDeskConfig,
  buildSunshineConfig,
  renderConfig,
  MoonlightClientConfig,
} from './transport-configs';

/** The complete set of verbs a plan may contain. */
export type ProvisioningVerb = 'write_config' | 'start_transport' | 'stop_transport' | 'apply_stream_profile';

export interface ProvisioningStep {
  verb: ProvisioningVerb;
  /** Relative file name for write_config. Never absolute, never contains '..'. */
  target: string;
  /** Config body for write_config; a short descriptor otherwise. */
  content?: string;
  transport?: BifrostTransportId;
  /** Human-readable justification recorded in the session journal. */
  rationale: string;
}

export interface ProvisioningPlan {
  sessionId: string;
  deviceId: string;
  transport: BifrostTransportId;
  profile?: StreamProfile;
  steps: ProvisioningStep[];
  /** Client-side launch config, when the transport has a client half. */
  client?: MoonlightClientConfig;
  warnings: string[];
}

const UNSAFE_TARGET = /(^\/)|(\.\.)|(^~)|([\0])/;

/** A target must be a plain relative file name under the node's config root. */
export function isSafeTarget(target: string): boolean {
  return target.length > 0 && target.length <= 128 && !UNSAFE_TARGET.test(target);
}

export interface ProvisionInput {
  envelope: BifrostSessionEnvelope;
  capability?: NodeStreamCapability;
  link?: LinkTelemetry;
  /** MagicDNS name or tailnet address the client dials. */
  hostAddress?: string;
  relayServer?: string;
  preferred?: {
    resolutionLabel?: string;
    fps?: number;
    codec?: 'h264' | 'hevc' | 'av1';
    hdr?: boolean;
  };
}

export function buildProvisioningPlan(input: ProvisionInput): ProvisioningPlan {
  const { envelope } = input;
  const capability = input.capability || CONSERVATIVE_CAPABILITY;
  const warnings: string[] = [];
  const steps: ProvisioningStep[] = [];

  if (!input.capability) {
    warnings.push('Node has not reported encoder capability; provisioning conservatively at 1080p60 h264.');
  }

  let profile: StreamProfile | undefined;
  let client: MoonlightClientConfig | undefined;

  switch (envelope.transport) {
    case 'sunshine_moonlight': {
      profile = negotiateStreamProfile(
        {
          fidelity: envelope.fidelity,
          scopes: envelope.scopes,
          preferredFps: input.preferred?.fps,
          preferredCodec: input.preferred?.codec,
          hdr: input.preferred?.hdr,
        },
        capability,
        input.link
      );

      const sunshine = buildSunshineConfig(envelope, profile, { tailnetAddress: input.hostAddress });

      steps.push({
        verb: 'write_config',
        target: 'sunshine.conf',
        content: renderConfig(sunshine.settings),
        transport: 'sunshine_moonlight',
        rationale: `Encoder set to ${profile.resolution.label}@${profile.fps} ${profile.codec}, ${profile.bitrateKbps} kbps.`,
      });

      steps.push({
        verb: 'apply_stream_profile',
        target: 'stream-profile.json',
        content: JSON.stringify(profile),
        transport: 'sunshine_moonlight',
        rationale: profile.inputEnabled
          ? 'Input injection granted; host input devices enabled.'
          : 'Input not granted; host input devices disabled.',
      });

      steps.push({
        verb: 'start_transport',
        target: 'sunshine',
        transport: 'sunshine_moonlight',
        rationale: `Session ${envelope.sessionId} valid until ${envelope.notAfter}.`,
      });

      if (input.hostAddress) {
        client = buildMoonlightConfig(envelope, profile, { host: input.hostAddress });
      } else {
        warnings.push('No host address supplied; Moonlight client config not generated.');
      }
      break;
    }

    case 'rustdesk_control': {
      const rustdesk = buildRustDeskConfig(envelope, { relayServer: input.relayServer });

      steps.push({
        verb: 'write_config',
        target: 'rustdesk.toml',
        content: renderConfig({ ...rustdesk.settings, ...rustdesk.permissions }),
        transport: 'rustdesk_control',
        rationale:
          'Permission flags derived from granted scopes: ' +
          Object.entries(rustdesk.permissions)
            .filter(([, on]) => on)
            .map(([key]) => key)
            .join(', ') || 'no capability flags enabled',
      });

      steps.push({
        verb: 'start_transport',
        target: 'rustdesk',
        transport: 'rustdesk_control',
        rationale: `Idle disconnect after ${envelope.maxIdleSeconds}s, envelope expires ${envelope.notAfter}.`,
      });
      break;
    }

    case 'tauri_agent': {
      steps.push({
        verb: 'write_config',
        target: 'camelot-agent.json',
        content: JSON.stringify({
          sessionId: envelope.sessionId,
          allowedScopes: envelope.scopes,
          expiresAt: envelope.notAfter,
        }),
        transport: 'tauri_agent',
        rationale: 'Agent tool surface restricted to the granted scopes.',
      });
      steps.push({
        verb: 'start_transport',
        target: 'camelot-agent',
        transport: 'tauri_agent',
        rationale: `Structured agent surface for session ${envelope.sessionId}.`,
      });
      break;
    }

    case 'sonar_sensor': {
      steps.push({
        verb: 'start_transport',
        target: 'sonar',
        transport: 'sonar_sensor',
        rationale: 'Read-only flow capture; feeds Gjallarhorn.',
      });
      break;
    }

    case 'tailscale_mesh':
    default: {
      warnings.push(`Transport '${envelope.transport}' has no provisioning steps; it is a substrate, not a session.`);
      break;
    }
  }

  const unsafe = steps.filter(step => !isSafeTarget(step.target));
  if (unsafe.length > 0) {
    throw new Error(`Refusing to emit a plan with unsafe targets: ${unsafe.map(s => s.target).join(', ')}`);
  }

  return { sessionId: envelope.sessionId, deviceId: envelope.deviceId, transport: envelope.transport, profile, steps, client, warnings };
}

/** The teardown counterpart. Always safe to run, even on an already-stopped node. */
export function buildTeardownPlan(envelope: BifrostSessionEnvelope): ProvisioningPlan {
  const transportBinary: Partial<Record<BifrostTransportId, string>> = {
    sunshine_moonlight: 'sunshine',
    rustdesk_control: 'rustdesk',
    tauri_agent: 'camelot-agent',
    sonar_sensor: 'sonar',
  };

  const target = transportBinary[envelope.transport];

  return {
    sessionId: envelope.sessionId,
    deviceId: envelope.deviceId,
    transport: envelope.transport,
    steps: target
      ? [
          {
            verb: 'stop_transport',
            target,
            transport: envelope.transport,
            rationale: `Session ${envelope.sessionId} ended.`,
          },
        ]
      : [],
    warnings: [],
  };
}
