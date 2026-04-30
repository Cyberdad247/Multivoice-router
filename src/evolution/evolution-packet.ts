export type EvolutionRisk = 'low' | 'medium' | 'high' | 'blocked';

export interface EvolutionPacket {
  type: 'EVOLUTION_PACKET';
  packetId: string;
  targetComponent: string;
  reason: string;
  proposedChanges: string[];
  riskLevel: EvolutionRisk;
  testsRequired: string[];
  rollbackPlan: string;
  memoryRefs: string[];
  requiresApproval: boolean;
}

export function createEvolutionPacket(input: Omit<EvolutionPacket, 'type' | 'packetId' | 'requiresApproval'>): EvolutionPacket {
  return {
    type: 'EVOLUTION_PACKET',
    packetId: `evo_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    requiresApproval: input.riskLevel === 'high' || input.riskLevel === 'blocked',
    ...input,
  };
}

export function validateEvolutionPacket(packet: EvolutionPacket): string[] {
  const errors: string[] = [];
  if (!packet.targetComponent) errors.push('targetComponent is required.');
  if (!packet.reason) errors.push('reason is required.');
  if (!packet.proposedChanges.length) errors.push('At least one proposed change is required.');
  if (!packet.testsRequired.length) errors.push('testsRequired must not be empty.');
  if (!packet.rollbackPlan) errors.push('rollbackPlan is required.');
  if (packet.riskLevel === 'blocked') errors.push('Blocked evolution packets cannot execute.');
  return errors;
}
