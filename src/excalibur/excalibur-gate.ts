/**
 * Excalibur Gate — the consent gate that binds every crossing between
 * the Multivoice command center and the Camelot CloudBrain.
 *
 * Forged from Camelot-VPS VS-005: Excalibur binds human consent. The
 * gate is pure and fail-closed:
 *  - A sealed bridge blocks every crossing, no exceptions.
 *  - All five gates (identity, integrity, intent, payload, access)
 *    must hold for any crossing, read or write.
 *  - A mutation additionally requires explicit human approval.
 *  - Read-only crossings do not need human approval, but still need
 *    every gate and an unsealed bridge.
 *  - Missing or malformed input fails closed. This function never throws.
 */

export type GateName = 'identity' | 'integrity' | 'intent' | 'payload' | 'access';

export const GATE_NAMES: GateName[] = ['identity', 'integrity', 'intent', 'payload', 'access'];

export interface CrossingInput {
  identity: boolean;
  integrity: boolean;
  intent: boolean;
  payload: boolean;
  access: boolean;
  bridgeSealed: boolean;
  humanApproved: boolean;
  mutation: boolean;
}

export interface CrossingResult {
  allowed: boolean;
  reasons: string[];
}

export function evaluateCrossing(
  input: Partial<CrossingInput> | null | undefined,
): CrossingResult {
  try {
    const safe: CrossingInput = {
      identity: input?.identity === true,
      integrity: input?.integrity === true,
      intent: input?.intent === true,
      payload: input?.payload === true,
      access: input?.access === true,
      bridgeSealed: input?.bridgeSealed === true,
      humanApproved: input?.humanApproved === true,
      mutation: input?.mutation === true,
    };

    const reasons: string[] = [];

    if (safe.bridgeSealed) {
      reasons.push('Bridge is sealed — all crossings are blocked until the seal is lifted.');
    }

    for (const gate of GATE_NAMES) {
      if (!safe[gate]) {
        reasons.push(`Gate failed: ${gate} — crossings require every gate to hold (fail-closed).`);
      }
    }

    if (safe.mutation && !safe.humanApproved) {
      reasons.push('Mutation requires explicit human approval — Excalibur binds human consent.');
    }

    if (reasons.length === 0) {
      reasons.push(
        safe.mutation
          ? 'All gates hold, bridge unsealed, human approval present — mutation crossing allowed.'
          : 'All gates hold, bridge unsealed — read-only crossing allowed.',
      );
      return { allowed: true, reasons };
    }

    return { allowed: false, reasons };
  } catch {
    return { allowed: false, reasons: ['Gate evaluation failed — fail-closed, crossing denied.'] };
  }
}
