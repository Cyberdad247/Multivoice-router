export type VocalLicenseTier = 'sanctuary' | 'sovereign' | 'commercial' | 'royal';

export interface VocalLicense {
  id: string;
  personaId: string;
  licenseType: VocalLicenseTier;
  licensee: string;
  timbreHash: string;
  c2paSigned: boolean;
  watermarkKey: string;
  rights: string[];
  terms: string;
  royaltyBps: number;
  ownerId: string;
  createdAt?: any;
}

export interface VocalLicensePreset {
  type: VocalLicenseTier;
  label: string;
  badge: string;
  tagline: string;
  rights: string[];
  royaltyBps: number;
  terms: string;
}

export const VOCAL_LICENSE_PRESETS: Record<VocalLicenseTier, VocalLicensePreset> = {
  sanctuary: {
    type: 'sanctuary',
    label: 'Personal Sanctuary',
    badge: 'NON-COMMERCIAL / PRIVATE',
    tagline: 'Private offline sanctuary execution with zero external telemetry',
    rights: [
      'Private offline personal dialogue and local synthesis',
      'Zero external cloud transmission or data training rights',
      'Local encrypted cache on sovereign bare-metal hardware'
    ],
    royaltyBps: 0,
    terms: 'Granted for single-operator personal sanctuary use. Audio synthesis is restricted to authenticated private client and local inference.'
  },
  sovereign: {
    type: 'sovereign',
    label: 'Sovereign Bare-Metal',
    badge: 'MUTUAL ENCLAVE / BIFROST',
    tagline: 'Full bare-metal node dispatch, low-latency SIP routing, and zero-copy IPC',
    rights: [
      'Full low-latency SIP VoIP and Fonoster telephony routing',
      'Zero-copy IPC buffer synthesis across Camelot-OS nodes',
      'Sub-20ms 24kHz multi-voice streaming',
      'Ed25519 cryptographic token authentication'
    ],
    royaltyBps: 250, // 2.5%
    terms: 'Granted for bare-metal multi-node sovereign execution. High-concurrency VoIP and private enclave deployment authorized.'
  },
  commercial: {
    type: 'commercial',
    label: 'Commercial Broadcast',
    badge: 'SYNTHETIC C2PA VERIFIED',
    tagline: 'Public streaming, voice agent distribution, and auditable watermarked playback',
    rights: [
      'Public streaming, customer voice dispatch, and broadcast audio',
      'Mandatory C2PA metadata manifest embedding',
      'Audible/inaudible ultrasonic provenance watermark injection',
      'Global multi-region edge inference licensing'
    ],
    royaltyBps: 500, // 5.0%
    terms: 'Authorizes commercial distribution with required C2PA synthetic media watermark embedding and immutable timbre registry declaration.'
  },
  royal: {
    type: 'royal',
    label: 'Royal Crown Domain',
    badge: 'ARTHUR SOVEREIGN SEAL',
    tagline: 'Unrestricted Arthurian enclave rights across all Round Table Knights',
    rights: [
      'Unrestricted synthesis across all 12 Knights of the Round Table',
      'Permanent cryptographic provenance ledger entry',
      'Full source model fine-tuning and spectral weight ownership',
      'Custom acoustic impulse response (IR) convolution rights'
    ],
    royaltyBps: 1000, // 10.0%
    terms: 'Highest-order royal franchise granted under the Sovereign Arthurian Covenant. Unlimited multi-agent voice cloning and broadcast rights.'
  }
};
