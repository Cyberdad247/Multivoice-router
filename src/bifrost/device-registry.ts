/**
 * Bifrost device registry.
 *
 * Devices are enrolled explicitly. An unknown deviceId is never resolved into a
 * default — Heimdall denies crossings to devices it cannot name.
 */

import { BifrostDevice, BifrostScope, BifrostTransportId } from './types';

/**
 * Seed devices mirror the worker manifests in src/workers/edge-worker-stubs.ts
 * so the bridge and the command queue talk about the same machines.
 */
export const BIFROST_DEVICES: BifrostDevice[] = [
  {
    deviceId: 'desktop_primary',
    name: 'Primary Workstation',
    kind: 'desktop',
    tailscaleName: 'desktop-primary.tailnet.ts.net',
    tailnetAddresses: ['100.64.0.10'],
    enrolled: true,
    maxFidelity: 'control',
    deniedScopes: [],
    supportedTransports: ['tailscale_mesh', 'sunshine_moonlight', 'rustdesk_control', 'tauri_agent', 'sonar_sensor'],
  },
  {
    deviceId: 'gpu_workstation',
    name: 'GPU Workstation',
    kind: 'gpu_worker',
    tailscaleName: 'gpu-workstation.tailnet.ts.net',
    tailnetAddresses: ['100.64.0.11'],
    enrolled: true,
    maxFidelity: 'interact',
    // The GPU box streams and accepts input, but never hands over files or a shell.
    deniedScopes: ['file_push', 'file_pull', 'shell_exec'],
    supportedTransports: ['tailscale_mesh', 'sunshine_moonlight', 'sonar_sensor'],
  },
  {
    deviceId: 'android_primary',
    name: 'Primary Android',
    kind: 'android',
    tailscaleName: 'android-primary.tailnet.ts.net',
    tailnetAddresses: ['100.64.0.12'],
    enrolled: true,
    maxFidelity: 'view',
    deniedScopes: ['shell_exec', 'file_push'],
    supportedTransports: ['tailscale_mesh', 'rustdesk_control'],
  },
];

/** Tailnet CGNAT range. Peers outside it are, by definition, off-bridge. */
export const TAILNET_CIDR_PREFIX = '100.';

export function getDevice(
  deviceId: string,
  devices: BifrostDevice[] = BIFROST_DEVICES
): BifrostDevice | undefined {
  return devices.find(d => d.deviceId === deviceId);
}

export function listDevicesSupporting(
  transport: BifrostTransportId,
  devices: BifrostDevice[] = BIFROST_DEVICES
): BifrostDevice[] {
  return devices.filter(d => d.supportedTransports.includes(transport));
}

export function isOnTailnet(device: BifrostDevice): boolean {
  return device.tailnetAddresses.some(addr => addr.startsWith(TAILNET_CIDR_PREFIX));
}

export function isTailnetPeer(address: string): boolean {
  return address.startsWith(TAILNET_CIDR_PREFIX);
}

/**
 * A device whose gatekeeper has gone quiet cannot be trusted to enforce a
 * session envelope, so staleness is a gating input rather than a display detail.
 */
export function heartbeatAgeSeconds(device: BifrostDevice, now: Date = new Date()): number | undefined {
  if (!device.lastHeartbeatAt) return undefined;
  const last = new Date(device.lastHeartbeatAt).getTime();
  if (Number.isNaN(last)) return undefined;
  return Math.max(0, Math.floor((now.getTime() - last) / 1000));
}

export const HEARTBEAT_STALE_SECONDS = 90;

export function isHeartbeatFresh(device: BifrostDevice, now: Date = new Date()): boolean {
  const age = heartbeatAgeSeconds(device, now);
  return age !== undefined && age <= HEARTBEAT_STALE_SECONDS;
}

export function applyHeartbeat(
  device: BifrostDevice,
  at: Date = new Date(),
  gatekeeperFingerprint?: string
): BifrostDevice {
  return {
    ...device,
    lastHeartbeatAt: at.toISOString(),
    gatekeeperFingerprint: gatekeeperFingerprint ?? device.gatekeeperFingerprint,
  };
}

/** Scopes a device refuses regardless of transport or approval. */
export function deviceRefuses(device: BifrostDevice, scope: BifrostScope): boolean {
  return device.deniedScopes.includes(scope);
}
