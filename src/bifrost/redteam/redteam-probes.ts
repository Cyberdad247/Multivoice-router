/**
 * Camelot Defense Redteam — probe registry.
 *
 * These probes perform *adversarial analysis of your own bridge configuration*:
 * they reason about what an attacker would reach given the policy as written,
 * and emit findings with remediations. They read configuration and derive
 * consequences. They do not exploit anything, touch a remote host, or test
 * credentials — the whole point is that this can run continuously against
 * production without being dangerous itself.
 *
 * The most valuable output is the attack-path analysis: for each device, the
 * maximal scope set someone would hold if a single envelope were minted for it.
 * That is the blast radius of a leaked signing secret, stated per node.
 */

import { getTransport, BIFROST_TRANSPORTS } from '../transport-registry';
import { isOnTailnet, isHeartbeatFresh, HEARTBEAT_STALE_SECONDS } from '../device-registry';
import { scopeRisk, riskRank } from '../heimdall-guardian';
import { isTerminal } from '../bifrost-session';
import { verifyJournalChain, JournalEntry } from '../observability/session-journal';
import {
  BifrostDevice,
  BifrostScope,
  BifrostSession,
  fidelityRank,
} from '../types';

export type FindingSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export type ProbeCategory =
  | 'blast_radius'
  | 'exposure'
  | 'policy_drift'
  | 'observability'
  | 'session_hygiene'
  | 'integrity';

export interface RedteamFinding {
  id: string;
  probeId: string;
  category: ProbeCategory;
  severity: FindingSeverity;
  title: string;
  detail: string;
  /** What an adversary gains if this is not fixed. */
  consequence: string;
  remediation: string;
  deviceId?: string;
  sessionId?: string;
}

export interface RedteamContext {
  devices: BifrostDevice[];
  sessions: BifrostSession[];
  journal?: JournalEntry[];
  /** True when one symmetric secret is shared by every node (the current design). */
  sharedSigningSecret?: boolean;
  now?: Date;
}

export interface RedteamProbe {
  id: string;
  name: string;
  category: ProbeCategory;
  /** What this probe is looking for, in one line. */
  question: string;
  run(context: RedteamContext): RedteamFinding[];
}

function finding(
  probe: Pick<RedteamProbe, 'id' | 'category'>,
  severity: FindingSeverity,
  parts: Omit<RedteamFinding, 'id' | 'probeId' | 'category' | 'severity'>
): RedteamFinding {
  return {
    id: `rt_${probe.id}_${parts.deviceId || parts.sessionId || 'global'}`,
    probeId: probe.id,
    category: probe.category,
    severity,
    ...parts,
  };
}

/**
 * The maximal scope set reachable on a device: the union of what every
 * transport it supports can carry, minus what the device denies, capped by its
 * fidelity ceiling.
 */
export function reachableScopes(device: BifrostDevice): BifrostScope[] {
  const union = new Set<BifrostScope>();

  for (const transportId of device.supportedTransports) {
    const transport = getTransport(transportId);
    if (!transport) continue;

    // A transport cannot exceed its own ceiling or the device's.
    const ceiling = fidelityRank(transport.maxFidelity) < fidelityRank(device.maxFidelity)
      ? transport.maxFidelity
      : device.maxFidelity;

    for (const scope of transport.carriableScopes) {
      if (device.deniedScopes.includes(scope)) continue;
      if (fidelityRank(SCOPE_FIDELITY[scope]) > fidelityRank(ceiling)) continue;
      union.add(scope);
    }
  }

  return Array.from(union).sort();
}

/** Local copy of the scope→fidelity floor; kept private to avoid a cycle. */
const SCOPE_FIDELITY: Record<BifrostScope, 'observe' | 'view' | 'interact' | 'control'> = {
  network_observe: 'observe',
  process_list: 'observe',
  screen_view: 'view',
  audio_out: 'view',
  input_inject: 'interact',
  clipboard_read: 'interact',
  clipboard_write: 'control',
  file_pull: 'control',
  file_push: 'control',
  shell_exec: 'control',
};

export function worstRiskOf(scopes: BifrostScope[]): string {
  return scopes.reduce((worst, scope) => {
    const risk = scopeRisk(scope);
    return riskRank(risk) > riskRank(worst as any) ? risk : worst;
  }, 'L0_OBSERVE' as string);
}

// --- Probes ---------------------------------------------------------------

const blastRadiusProbe: RedteamProbe = {
  id: 'blast_radius',
  name: 'Per-device blast radius',
  category: 'blast_radius',
  question: 'If one envelope were minted for this device, what would the holder be able to do?',
  run(context) {
    return context.devices.flatMap(device => {
      const scopes = reachableScopes(device);
      const worst = worstRiskOf(scopes);
      const dangerous = scopes.filter(s => riskRank(scopeRisk(s)) >= riskRank('L4_HIGH_RISK'));

      if (dangerous.length === 0) return [];

      const severity: FindingSeverity = dangerous.includes('shell_exec')
        ? 'high'
        : dangerous.length >= 3
          ? 'high'
          : 'medium';

      return [
        finding({ id: 'blast_radius', category: 'blast_radius' }, severity, {
          title: `${device.deviceId} reaches ${dangerous.length} high-risk scope(s)`,
          detail: `Reachable scopes: ${scopes.join(', ')}. Worst risk class: ${worst}.`,
          consequence:
            `Anyone able to mint an envelope for '${device.deviceId}' obtains ${dangerous.join(', ')} ` +
            'without any further gate, because Heimdall has already been satisfied at that point.',
          remediation:
            `Add the scopes this device does not actually need to its deniedScopes, or drop ` +
            `transports from supportedTransports. Denied scopes cannot be re-granted by any transport.`,
          deviceId: device.deviceId,
        }),
      ];
    });
  },
};

const offMeshProbe: RedteamProbe = {
  id: 'off_mesh_device',
  name: 'Enrolled device off the mesh',
  category: 'exposure',
  question: 'Is an enrolled device reachable outside the tailnet?',
  run(context) {
    return context.devices
      .filter(device => device.enrolled && !isOnTailnet(device))
      .map(device =>
        finding({ id: 'off_mesh_device', category: 'exposure' }, 'high', {
          title: `${device.deviceId} is enrolled but has no tailnet address`,
          detail: `tailnetAddresses is ${JSON.stringify(device.tailnetAddresses)}.`,
          consequence:
            'Every tailnet-requiring transport is denied for this device, so it is enrolled but unusable — ' +
            'and an operator who notices will be tempted to "fix" it by relaxing requiresTailnet.',
          remediation:
            'Join the device to the tailnet and record its 100.x address, or un-enroll it. Do not relax ' +
            'requiresTailnet on the transport.',
          deviceId: device.deviceId,
        })
      );
  },
};

const sensorCoverageProbe: RedteamProbe = {
  id: 'sensor_coverage',
  name: 'Sensor blind spots',
  category: 'observability',
  question: 'Can Gjallarhorn actually see the devices that matter most?',
  run(context) {
    return context.devices
      .filter(
        device =>
          device.enrolled &&
          fidelityRank(device.maxFidelity) >= fidelityRank('interact') &&
          !device.supportedTransports.includes('sonar_sensor')
      )
      .map(device =>
        finding({ id: 'sensor_coverage', category: 'observability' }, 'medium', {
          title: `${device.deviceId} permits '${device.maxFidelity}' with no Sonar sensor`,
          detail: 'The device supports interactive or higher fidelity but carries no network sensor.',
          consequence:
            'Traffic to and from this node is invisible to Gjallarhorn, so an off-tailnet peer or a ' +
            'forbidden protocol on this device raises no alarm at all.',
          remediation: `Add 'sonar_sensor' to supportedTransports and deploy the Sonar agent on this node.`,
          deviceId: device.deviceId,
        })
      );
  },
};

const staleNodeProbe: RedteamProbe = {
  id: 'stale_gatekeeper',
  name: 'Silent gatekeepers',
  category: 'observability',
  question: 'Which enrolled nodes are not reporting?',
  run(context) {
    const now = context.now || new Date();
    return context.devices
      .filter(device => device.enrolled && !isHeartbeatFresh(device, now))
      .map(device =>
        finding({ id: 'stale_gatekeeper', category: 'observability' }, device.lastHeartbeatAt ? 'medium' : 'low', {
          title: `${device.deviceId} has no fresh gatekeeper heartbeat`,
          detail: device.lastHeartbeatAt
            ? `Last heartbeat ${device.lastHeartbeatAt}; staleness window is ${HEARTBEAT_STALE_SECONDS}s.`
            : 'This device has never reported a heartbeat.',
          consequence:
            'Crossings to this node are denied, which is safe — but a node that is silent because its ' +
            'gatekeeper was stopped looks identical to one that is merely offline.',
          remediation: 'Start or repair heimdall-gatekeeper on the node, and alert on the transition rather than the state.',
          deviceId: device.deviceId,
        })
      );
  },
};

const sharedSecretProbe: RedteamProbe = {
  id: 'shared_secret',
  name: 'Signing secret blast radius',
  category: 'blast_radius',
  question: 'How many nodes does a single leaked secret unlock?',
  run(context) {
    if (!context.sharedSigningSecret) return [];

    const enrolled = context.devices.filter(d => d.enrolled);
    if (enrolled.length === 0) return [];

    return [
      finding({ id: 'shared_secret', category: 'blast_radius' }, 'high', {
        title: `One symmetric secret authorizes all ${enrolled.length} enrolled node(s)`,
        detail: 'Every gatekeeper verifies envelopes with the same BIFROST_SIGNING_SECRET.',
        consequence:
          'Any node that holds the secret can mint a valid envelope for any other node, at any scope that ' +
          "node's policy permits. Compromise of the least-trusted node is compromise of the bridge.",
        remediation:
          'Move to per-node keys, or asymmetric signing where the control plane holds the private key and ' +
          'each gatekeeper verifies with a public key it cannot sign with.',
      }),
    ];
  },
};

const deadPolicyProbe: RedteamProbe = {
  id: 'policy_drift',
  name: 'Fidelity that grants nothing',
  category: 'policy_drift',
  question: 'Does a device permit a fidelity whose scopes it entirely denies?',
  run(context) {
    return context.devices
      .filter(device => {
        if (fidelityRank(device.maxFidelity) < fidelityRank('control')) return false;
        const controlScopes: BifrostScope[] = ['clipboard_write', 'file_pull', 'file_push', 'shell_exec'];
        return controlScopes.every(scope => device.deniedScopes.includes(scope));
      })
      .map(device =>
        finding({ id: 'policy_drift', category: 'policy_drift' }, 'low', {
          title: `${device.deviceId} permits 'control' fidelity but denies every control scope`,
          detail: `deniedScopes: ${device.deniedScopes.join(', ')}.`,
          consequence:
            'Harmless today, but the ceiling says "control" while the intent is clearly lower. A future ' +
            'edit that removes one denied scope silently opens a control-fidelity path.',
          remediation: `Lower maxFidelity to 'interact' so the ceiling matches the intent.`,
          deviceId: device.deviceId,
        })
      );
  },
};

const sessionHygieneProbe: RedteamProbe = {
  id: 'session_hygiene',
  name: 'Sessions past their envelope',
  category: 'session_hygiene',
  question: 'Is anything still live that should have been closed?',
  run(context) {
    const now = context.now || new Date();
    return context.sessions
      .filter(session => !isTerminal(session.state) && now >= new Date(session.envelope.notAfter))
      .map(session =>
        finding({ id: 'session_hygiene', category: 'session_hygiene' }, 'critical', {
          title: `Session ${session.envelope.sessionId} is '${session.state}' past its expiry`,
          detail: `notAfter was ${session.envelope.notAfter}; state is still ${session.state}.`,
          consequence:
            'The supervisor is not running, or is not being ticked. Expired sessions are only closed when ' +
            'something reaps them — the envelope expiring does not by itself stop a running transport.',
          remediation: 'Run tickBifrostSupervisor on a schedule, and verify the broker sweep is reaching nodes.',
          deviceId: session.envelope.deviceId,
          sessionId: session.envelope.sessionId,
        })
      );
  },
};

const journalIntegrityProbe: RedteamProbe = {
  id: 'journal_integrity',
  name: 'Journal chain integrity',
  category: 'integrity',
  question: 'Has the session journal been edited?',
  run(context) {
    if (!context.journal || context.journal.length === 0) return [];

    const verification = verifyJournalChain(context.journal);
    if (verification.ok) return [];

    return [
      finding({ id: 'journal_integrity', category: 'integrity' }, 'critical', {
        title: 'Session journal chain is broken',
        detail: `${verification.reason} (entry ${verification.brokenAt})`,
        consequence:
          'The audit record of what happened on this bridge can no longer be trusted from that entry onward. ' +
          'If a session was tampered out of the log, no other subsystem will notice.',
        remediation:
          'Treat the affected window as unaudited. Restore from the last ledger-anchored head hash and ' +
          'investigate write access to the journal store.',
      }),
    ];
  },
};

const fanoutProbe: RedteamProbe = {
  id: 'transport_fanout',
  name: 'Transport over-provisioning',
  category: 'policy_drift',
  question: 'Does a device support more transports than its fidelity can use?',
  run(context) {
    return context.devices.flatMap(device => {
      const unusable = device.supportedTransports.filter(id => {
        const transport = getTransport(id);
        if (!transport) return false;
        // A transport whose every carriable scope is denied or above the ceiling.
        return transport.carriableScopes.every(
          scope =>
            device.deniedScopes.includes(scope) ||
            fidelityRank(SCOPE_FIDELITY[scope]) > fidelityRank(device.maxFidelity)
        );
      });

      if (unusable.length === 0) return [];

      return [
        finding({ id: 'transport_fanout', category: 'policy_drift' }, 'low', {
          title: `${device.deviceId} lists ${unusable.length} transport(s) it cannot use`,
          detail: `Unusable: ${unusable.join(', ')}.`,
          consequence:
            'Dead configuration invites someone to "enable" it later by widening the device, which is ' +
            'exactly the change that should require the most scrutiny.',
          remediation: 'Remove the unusable transports from supportedTransports.',
          deviceId: device.deviceId,
        }),
      ];
    });
  },
};

export const REDTEAM_PROBES: RedteamProbe[] = [
  blastRadiusProbe,
  offMeshProbe,
  sensorCoverageProbe,
  staleNodeProbe,
  sharedSecretProbe,
  deadPolicyProbe,
  sessionHygieneProbe,
  journalIntegrityProbe,
  fanoutProbe,
];

export function getProbe(id: string): RedteamProbe | undefined {
  return REDTEAM_PROBES.find(p => p.id === id);
}

export function listProbesByCategory(category: ProbeCategory): RedteamProbe[] {
  return REDTEAM_PROBES.filter(p => p.category === category);
}

/** Transports carrying at least one L4 scope, for the coverage summary. */
export function highRiskTransportIds(): string[] {
  return BIFROST_TRANSPORTS.filter(t =>
    t.carriableScopes.some(s => riskRank(scopeRisk(s)) >= riskRank('L4_HIGH_RISK'))
  ).map(t => t.id);
}
