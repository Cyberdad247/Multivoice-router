/**
 * Dynamic stream profile negotiation and adaptation.
 *
 * This is the part of the bridge that decides *how* a desktop is carried, not
 * whether it may be. Heimdall has already ruled on fidelity and scopes by the
 * time anything here runs; a profile can therefore never add a capability, only
 * describe the encoding of one already granted.
 *
 * The bitrate model is anchored on Moonlight's published defaults — 1080p60 on
 * H.264 at roughly 20 Mbps — expressed as bits-per-pixel-per-second so every
 * other resolution and frame rate falls out of the same curve.
 */

import { BifrostFidelity, BifrostScope } from '../types';

export type VideoCodec = 'h264' | 'hevc' | 'av1';

export interface Resolution {
  width: number;
  height: number;
  label: string;
}

/** Descending ladder. Adaptation walks this in one-rung steps. */
export const RESOLUTION_LADDER: Resolution[] = [
  { width: 3840, height: 2160, label: '2160p' },
  { width: 2560, height: 1440, label: '1440p' },
  { width: 1920, height: 1080, label: '1080p' },
  { width: 1280, height: 720, label: '720p' },
  { width: 854, height: 480, label: '480p' },
];

export const FPS_LADDER: number[] = [120, 90, 60, 30];

/**
 * Bits per pixel per second. h264 is the anchor:
 *   1920*1080*60 * 0.16 / 1000 ≈ 19,900 kbps ≈ Moonlight's 20 Mbps default.
 * The others are efficiency multipliers against that anchor.
 */
const BITS_PER_PIXEL: Record<VideoCodec, number> = {
  h264: 0.16,
  hevc: 0.104, // ~65% of h264 for equivalent quality
  av1: 0.08, // ~50% of h264
};

/** Codec preference, best first. Negotiation picks the first both sides support. */
export const CODEC_PREFERENCE: VideoCodec[] = ['av1', 'hevc', 'h264'];

export interface NodeStreamCapability {
  /** Codecs the node's encoder can produce. */
  codecs: VideoCodec[];
  maxResolution: Resolution;
  maxFps: number;
  hdr: boolean;
  /** Hardware encoder present. Software encoding is capped lower. */
  hardwareEncode: boolean;
  /** Audio channels the host can send. */
  audioChannels: 2 | 6 | 8;
}

export interface LinkTelemetry {
  rttMs: number;
  packetLossPct: number;
  jitterMs: number;
  /** Measured available bandwidth in kbps. */
  availableKbps: number;
  observedAt: string;
}

export interface StreamProfile {
  codec: VideoCodec;
  resolution: Resolution;
  fps: number;
  bitrateKbps: number;
  hdr: boolean;
  audioChannels: 2 | 6 | 8;
  /** False whenever the session's fidelity is below `interact`. */
  inputEnabled: boolean;
  /** Why this profile came out the way it did. Surfaced in the session journal. */
  reasons: string[];
}

export interface StreamRequest {
  /** What the operator asked for. Treated as a ceiling, never a floor. */
  preferredResolution?: Resolution;
  preferredFps?: number;
  preferredCodec?: VideoCodec;
  hdr?: boolean;
  fidelity: BifrostFidelity;
  scopes: BifrostScope[];
}

export function bitrateFor(resolution: Resolution, fps: number, codec: VideoCodec): number {
  const pixelsPerSecond = resolution.width * resolution.height * fps;
  return Math.round((pixelsPerSecond * BITS_PER_PIXEL[codec]) / 1000);
}

function resolutionRank(resolution: Resolution): number {
  return RESOLUTION_LADDER.findIndex(r => r.label === resolution.label);
}

function clampResolution(requested: Resolution, ceiling: Resolution): Resolution {
  // Higher index = lower resolution, so the larger index is the safer choice.
  const index = Math.max(resolutionRank(requested), resolutionRank(ceiling));
  return RESOLUTION_LADDER[index === -1 ? 2 : index];
}

/**
 * Pick the best profile that fits inside the node's capability, the granted
 * fidelity, and the measured link.
 */
export function negotiateStreamProfile(
  request: StreamRequest,
  capability: NodeStreamCapability,
  link?: LinkTelemetry
): StreamProfile {
  const reasons: string[] = [];

  // --- Codec ------------------------------------------------------------
  let codec: VideoCodec;
  if (request.preferredCodec && capability.codecs.includes(request.preferredCodec)) {
    codec = request.preferredCodec;
  } else {
    codec = CODEC_PREFERENCE.find(c => capability.codecs.includes(c)) || 'h264';
    if (request.preferredCodec) {
      reasons.push(`Requested codec '${request.preferredCodec}' unsupported by node; using '${codec}'.`);
    }
  }

  // --- Resolution -------------------------------------------------------
  let resolution = clampResolution(
    request.preferredResolution || capability.maxResolution,
    capability.maxResolution
  );
  if (request.preferredResolution && resolution.label !== request.preferredResolution.label) {
    reasons.push(`Resolution capped to ${resolution.label} by node capability.`);
  }

  // --- Frame rate -------------------------------------------------------
  let fps = Math.min(request.preferredFps || capability.maxFps, capability.maxFps);
  fps = FPS_LADDER.find(f => f <= fps) || 30;

  // Software encoding cannot sustain the top of the ladder.
  if (!capability.hardwareEncode) {
    const softwareCeiling = RESOLUTION_LADDER.findIndex(r => r.label === '1080p');
    if (resolutionRank(resolution) < softwareCeiling) {
      resolution = RESOLUTION_LADDER[softwareCeiling];
      reasons.push('No hardware encoder; resolution capped to 1080p.');
    }
    if (fps > 60) {
      fps = 60;
      reasons.push('No hardware encoder; frame rate capped to 60.');
    }
  }

  // --- Bitrate, then fit to the measured link ---------------------------
  let bitrateKbps = bitrateFor(resolution, fps, codec);

  if (link && link.availableKbps > 0) {
    // Leave 20% headroom so the stream does not saturate the link it measures.
    const budget = Math.floor(link.availableKbps * 0.8);
    while (bitrateKbps > budget && resolutionRank(resolution) < RESOLUTION_LADDER.length - 1) {
      resolution = RESOLUTION_LADDER[resolutionRank(resolution) + 1];
      bitrateKbps = bitrateFor(resolution, fps, codec);
      reasons.push(`Stepped down to ${resolution.label} to fit ${budget} kbps of measured bandwidth.`);
    }
    if (bitrateKbps > budget) {
      bitrateKbps = budget;
      reasons.push(`Bitrate clamped to link budget ${budget} kbps at the bottom of the ladder.`);
    }
  }

  // --- Input and HDR ----------------------------------------------------
  // Input follows the granted scope, never the request.
  const inputEnabled = request.scopes.includes('input_inject');
  if (request.preferredFps && !inputEnabled && request.fidelity === 'view') {
    reasons.push('Fidelity is view-only; input is disabled at the host.');
  }

  const hdr = Boolean(request.hdr && capability.hdr);
  if (request.hdr && !capability.hdr) {
    reasons.push('Node reports no HDR pipeline; HDR disabled.');
  }

  const audioChannels = request.scopes.includes('audio_out') ? capability.audioChannels : 2;

  return { codec, resolution, fps, bitrateKbps, hdr, audioChannels, inputEnabled, reasons };
}

export type AdaptationDirection = 'hold' | 'step_down' | 'step_up';

export interface AdaptationResult {
  profile: StreamProfile;
  direction: AdaptationDirection;
  reason: string;
}

/** Loss above this is treated as congestion rather than noise. */
export const LOSS_STEP_DOWN_PCT = 2;
export const RTT_STEP_DOWN_MS = 120;
/** Consecutive clean samples required before climbing back up. */
export const CLEAN_SAMPLES_TO_STEP_UP = 3;

/**
 * One adaptation step against fresh telemetry.
 *
 * Degrades on a single bad sample and recovers only after sustained clean ones,
 * which is the asymmetry every adaptive streamer needs: dropping quality is
 * cheap and reversible, oscillating is not.
 */
export function adaptStreamProfile(
  profile: StreamProfile,
  telemetry: LinkTelemetry,
  cleanSamples = 0,
  ceiling?: { resolution: Resolution; fps: number }
): AdaptationResult {
  const congested =
    telemetry.packetLossPct >= LOSS_STEP_DOWN_PCT || telemetry.rttMs >= RTT_STEP_DOWN_MS;

  if (congested) {
    const rank = resolutionRank(profile.resolution);

    // Drop frame rate first — it is less visually costly than resolution.
    const fpsIndex = FPS_LADDER.indexOf(profile.fps);
    if (fpsIndex >= 0 && fpsIndex < FPS_LADDER.length - 1) {
      const fps = FPS_LADDER[fpsIndex + 1];
      return {
        profile: {
          ...profile,
          fps,
          bitrateKbps: bitrateFor(profile.resolution, fps, profile.codec),
          reasons: [`Stepped down to ${fps} fps: ${telemetry.packetLossPct}% loss, ${telemetry.rttMs} ms RTT.`],
        },
        direction: 'step_down',
        reason: 'link_congested',
      };
    }

    if (rank < RESOLUTION_LADDER.length - 1) {
      const resolution = RESOLUTION_LADDER[rank + 1];
      return {
        profile: {
          ...profile,
          resolution,
          bitrateKbps: bitrateFor(resolution, profile.fps, profile.codec),
          reasons: [`Stepped down to ${resolution.label}: ${telemetry.packetLossPct}% loss.`],
        },
        direction: 'step_down',
        reason: 'link_congested',
      };
    }

    return { profile, direction: 'hold', reason: 'already_at_floor' };
  }

  if (cleanSamples >= CLEAN_SAMPLES_TO_STEP_UP) {
    const rank = resolutionRank(profile.resolution);
    const ceilingRank = ceiling ? resolutionRank(ceiling.resolution) : 0;

    if (rank > ceilingRank) {
      const resolution = RESOLUTION_LADDER[rank - 1];
      const candidate = bitrateFor(resolution, profile.fps, profile.codec);
      if (candidate <= telemetry.availableKbps * 0.8) {
        return {
          profile: {
            ...profile,
            resolution,
            bitrateKbps: candidate,
            reasons: [`Recovered to ${resolution.label} after ${cleanSamples} clean samples.`],
          },
          direction: 'step_up',
          reason: 'link_recovered',
        };
      }
    }

    const fpsIndex = FPS_LADDER.indexOf(profile.fps);
    const fpsCeiling = ceiling ? FPS_LADDER.indexOf(ceiling.fps) : 0;
    if (fpsIndex > fpsCeiling && fpsIndex > 0) {
      const fps = FPS_LADDER[fpsIndex - 1];
      const candidate = bitrateFor(profile.resolution, fps, profile.codec);
      if (candidate <= telemetry.availableKbps * 0.8) {
        return {
          profile: {
            ...profile,
            fps,
            bitrateKbps: candidate,
            reasons: [`Recovered to ${fps} fps after ${cleanSamples} clean samples.`],
          },
          direction: 'step_up',
          reason: 'link_recovered',
        };
      }
    }
  }

  return { profile, direction: 'hold', reason: 'stable' };
}

/** Default capability used when a node has not reported its encoder yet. */
export const CONSERVATIVE_CAPABILITY: NodeStreamCapability = {
  codecs: ['h264'],
  maxResolution: RESOLUTION_LADDER[2], // 1080p
  maxFps: 60,
  hdr: false,
  hardwareEncode: false,
  audioChannels: 2,
};
