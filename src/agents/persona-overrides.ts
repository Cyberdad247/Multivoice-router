import { KNIGHT_ROSTER_V400, KnightRosterEntryV400 } from './knight-roster-v400';
import { VoiceProfile } from '../voice/voice-profile-registry';

export interface KnightPersonaOverride {
  knightId: string;
  displayName?: string;
  aliases?: string[];
  glyph?: string;
  operationalSoul?: string;
  humanisticSpark?: string;
  refractions?: string[];
  mentalModels?: string[];
  style?: {
    voiceTone?: string;
    speakingCadence?: string;
    humorLevel?: 'none' | 'low' | 'medium' | 'high';
    directness?: 'soft' | 'balanced' | 'blunt';
    formality?: 'casual' | 'operator' | 'executive' | 'mythic';
  };
  voice?: Partial<VoiceProfile> & {
    preferredLocalEngine?: 'kokoro_onnx' | 'piper' | 'browser_speech_synthesis' | 'android_system_tts';
    billSafe?: boolean;
  };
  dashboard?: {
    defaultPanel?: string;
    visibleInClientShell?: boolean;
    visibleInOperatorCockpit?: boolean;
  };
  notes?: string;
}

export interface HydratedKnightPersona extends KnightRosterEntryV400 {
  displayName: string;
  mentalModels: string[];
  style: NonNullable<KnightPersonaOverride['style']>;
  voice?: KnightPersonaOverride['voice'];
  dashboard: NonNullable<KnightPersonaOverride['dashboard']>;
  notes?: string;
}

const DEFAULT_STYLE: HydratedKnightPersona['style'] = {
  voiceTone: 'clear, grounded, useful',
  speakingCadence: 'concise with enough context to act',
  humorLevel: 'low',
  directness: 'balanced',
  formality: 'operator',
};

const DEFAULT_DASHBOARD: HydratedKnightPersona['dashboard'] = {
  defaultPanel: 'overview',
  visibleInClientShell: false,
  visibleInOperatorCockpit: true,
};

export function applyPersonaOverride(base: KnightRosterEntryV400, override?: KnightPersonaOverride): HydratedKnightPersona {
  return {
    ...base,
    name: override?.displayName || base.name,
    displayName: override?.displayName || base.name,
    aliases: override?.aliases || base.aliases,
    glyph: override?.glyph || base.glyph,
    operationalSoul: override?.operationalSoul || base.operationalSoul,
    humanisticSpark: override?.humanisticSpark || base.humanisticSpark,
    refractions: override?.refractions || base.refractions,
    mentalModels: override?.mentalModels || [],
    style: { ...DEFAULT_STYLE, ...(override?.style || {}) },
    voice: override?.voice,
    dashboard: { ...DEFAULT_DASHBOARD, ...(override?.dashboard || {}) },
    notes: override?.notes,
  };
}

export function hydrateKnightPersonas(overrides: KnightPersonaOverride[] = []): HydratedKnightPersona[] {
  const byId = new Map(overrides.map(o => [o.knightId, o]));
  return KNIGHT_ROSTER_V400.map(knight => applyPersonaOverride(knight, byId.get(knight.id)));
}

export function findHydratedKnight(knightId: string, overrides: KnightPersonaOverride[] = []): HydratedKnightPersona | undefined {
  return hydrateKnightPersonas(overrides).find(k =>
    k.id === knightId ||
    k.name.toLowerCase() === knightId.toLowerCase() ||
    (k.aliases || []).some(alias => alias.toLowerCase() === knightId.toLowerCase())
  );
}

export function validatePersonaOverrides(overrides: KnightPersonaOverride[]): string[] {
  const known = new Set(KNIGHT_ROSTER_V400.map(k => k.id));
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const override of overrides) {
    if (!known.has(override.knightId)) errors.push(`Unknown knightId: ${override.knightId}`);
    if (seen.has(override.knightId)) errors.push(`Duplicate override for knightId: ${override.knightId}`);
    seen.add(override.knightId);
    if (override.voice?.billSafe === false) errors.push(`Voice override for ${override.knightId} disables billSafe mode. Paid voices require HITL policy.`);
  }

  return errors;
}
