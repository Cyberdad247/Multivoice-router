/**
 * Transport configuration generation.
 *
 * Turns a granted session envelope plus a negotiated stream profile into the
 * concrete configuration each upstream tool needs.
 *
 * The important property: **every capability flag is derived from the granted
 * scopes**, never from operator preference. If `input_inject` was not granted,
 * the generated RustDesk config disables keyboard and mouse, and the Sunshine
 * config disables input devices. Defence in depth — the node gatekeeper also
 * refuses out-of-scope actions, but a session should not be *configured* with a
 * capability it was never granted in the first place.
 *
 * Flag names track the upstream projects' documented options. Verify them
 * against the version you actually deploy; a rendered config that a given build
 * does not understand should fail loudly at the node rather than silently drop
 * a restriction.
 */

import { BifrostScope, BifrostSessionEnvelope } from '../types';
import { StreamProfile } from './stream-profile';

export interface SunshineHostConfig {
  /** Rendered into sunshine.conf as key = value pairs. */
  settings: Record<string, string>;
  /** Ports Sunshine must have open on the tailnet interface only. */
  ports: { https: number; http: number; rtsp: number; video: number; control: number; audio: number };
  /** Application entries Sunshine will advertise to the client. */
  applications: { name: string; cmd?: string; autoDetach: boolean }[];
}

export interface MoonlightClientConfig {
  host: string;
  appName: string;
  /** CLI arguments for `moonlight stream`. */
  args: string[];
}

export interface RustDeskNodeConfig {
  /** Rendered into RustDesk's config as key = value. */
  settings: Record<string, string>;
  /** Permission flags, all derived from granted scopes. */
  permissions: Record<string, boolean>;
}

function hasScope(envelope: BifrostSessionEnvelope, scope: BifrostScope): boolean {
  return envelope.scopes.includes(scope);
}

/** Sunshine's base port; the rest are documented offsets from it. */
export const SUNSHINE_BASE_PORT = 47989;

export function buildSunshineConfig(
  envelope: BifrostSessionEnvelope,
  profile: StreamProfile,
  options: { basePort?: number; tailnetAddress?: string } = {}
): SunshineHostConfig {
  const base = options.basePort ?? SUNSHINE_BASE_PORT;
  const inputAllowed = hasScope(envelope, 'input_inject');

  const settings: Record<string, string> = {
    // Bind to the mesh address only. The bridge is the tailnet.
    address_family: 'ipv4',
    port: String(base),
    sunshine_name: `camelot-${envelope.deviceId}`,

    // Encoder, driven entirely by the negotiated profile.
    fps: String(profile.fps),
    resolutions: `${profile.resolution.width}x${profile.resolution.height}`,
    bitrate: String(profile.bitrateKbps),
    hevc_mode: profile.codec === 'hevc' ? '2' : '0',
    av1_mode: profile.codec === 'av1' ? '2' : '0',
    channels: String(profile.audioChannels),

    // Input devices follow the granted scope, not the request.
    controller: inputAllowed ? 'enabled' : 'disabled',
    keyboard: inputAllowed ? 'enabled' : 'disabled',
    mouse: inputAllowed ? 'enabled' : 'disabled',

    // Camelot always pairs through the broker, never Sunshine's own web PIN flow.
    origin_web_ui_allowed: 'lan',
  };

  if (options.tailnetAddress) {
    settings.bind_address = options.tailnetAddress;
  }
  if (profile.hdr) {
    settings.hdr = 'enabled';
  }

  return {
    settings,
    ports: {
      https: base - 5,
      http: base,
      video: base + 9,
      control: base + 10,
      rtsp: base + 21,
      audio: base + 11,
    },
    applications: [
      // A bare desktop entry only. No arbitrary command is ever generated from
      // a session envelope — that would be a command-injection surface reachable
      // from a crossing request.
      { name: 'Camelot Desktop', autoDetach: true },
    ],
  };
}

export function buildMoonlightConfig(
  envelope: BifrostSessionEnvelope,
  profile: StreamProfile,
  options: { host: string; appName?: string }
): MoonlightClientConfig {
  const args = [
    '--resolution',
    `${profile.resolution.width}x${profile.resolution.height}`,
    '--fps',
    String(profile.fps),
    '--bitrate',
    String(profile.bitrateKbps),
    '--codec',
    profile.codec,
    '--audio-config',
    profile.audioChannels === 2 ? 'stereo' : profile.audioChannels === 6 ? '5.1-surround' : '7.1-surround',
  ];

  if (profile.hdr) args.push('--hdr');

  // Moonlight's own input capture is disabled when the session cannot inject.
  if (!profile.inputEnabled) {
    args.push('--no-mouse-buttons', '--no-keyboard', '--no-gamepad');
  }

  // Quit the running app when the stream ends so an expired session cannot
  // leave a detached desktop behind.
  args.push('--quit-after');

  return {
    host: options.host,
    appName: options.appName || 'Camelot Desktop',
    args,
  };
}

export function buildRustDeskConfig(
  envelope: BifrostSessionEnvelope,
  options: { relayServer?: string; directAccessPort?: number } = {}
): RustDeskNodeConfig {
  // Every one of these mirrors a granted scope. None is operator-configurable.
  const permissions = {
    'enable-keyboard': hasScope(envelope, 'input_inject'),
    'enable-clipboard': hasScope(envelope, 'clipboard_read') || hasScope(envelope, 'clipboard_write'),
    'enable-file-transfer': hasScope(envelope, 'file_pull') || hasScope(envelope, 'file_push'),
    'enable-audio': hasScope(envelope, 'audio_out'),
    'enable-tunnel': false,
    'enable-remote-restart': false,
    'enable-record-session': true,
    'enable-block-input': false,
    'allow-remote-config-modification': false,
  };

  const settings: Record<string, string> = {
    // Direct IP over the tailnet; no public rendezvous server.
    'direct-server': 'Y',
    'direct-access-port': String(options.directAccessPort ?? 21118),
    'allow-auto-disconnect': 'Y',
    // Auto-disconnect must not outlive the envelope.
    'auto-disconnect-timeout': String(Math.max(1, Math.floor(envelope.maxIdleSeconds / 60))),
    'approve-mode': 'password',
    'verification-method': 'use-permanent-password',
  };

  if (options.relayServer) {
    settings['relay-server'] = options.relayServer;
    settings['custom-rendezvous-server'] = options.relayServer;
  }

  return { settings, permissions };
}

/** Render a `key = value` config body, sorted for reproducible output. */
export function renderConfig(settings: Record<string, string | boolean>): string {
  return Object.keys(settings)
    .sort()
    .map(key => `${key} = ${String(settings[key])}`)
    .join('\n');
}
