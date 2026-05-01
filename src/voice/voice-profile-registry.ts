export type VoiceEngine = 'kokoro_onnx' | 'gemini_live' | 'suno' | 'udio' | 'notebooklm_audio' | 'stub';
export type VoiceMode = 'single' | 'council' | 'podcast' | 'automation';

export interface VoiceProfile {
  speakerId: string;
  knightId: string;
  displayName: string;
  engine: VoiceEngine;
  style: string;
  allowedModes: VoiceMode[];
  safetyNotes: string[];
}

export const VOICE_PROFILES: VoiceProfile[] = [
  {
    speakerId: 'anya_host',
    knightId: 'anya_omega',
    displayName: 'Anya Ω',
    engine: 'gemini_live',
    style: 'fast, warm, street-smart operator voice; clear command framing',
    allowedModes: ['single', 'council', 'podcast', 'automation'],
    safetyNotes: ['May initiate private local voice output.', 'External publishing requires HITL.']
  },
  {
    speakerId: 'merlin_architect',
    knightId: 'merlin_omega',
    displayName: 'Merlin Ω',
    engine: 'kokoro_onnx',
    style: 'calm architectural explainer; precise and layered',
    allowedModes: ['council', 'podcast', 'automation'],
    safetyNotes: ['Should explain plans, not execute actions directly.']
  },
  {
    speakerId: 'alex_roi',
    knightId: 'sir_alex',
    displayName: 'Sir Alex',
    engine: 'kokoro_onnx',
    style: 'sharp business strategist; ROI-first; concise judgment',
    allowedModes: ['council', 'podcast', 'automation'],
    safetyNotes: ['Financial claims require Veritas review before external use.']
  },
  {
    speakerId: 'gideon_auditor',
    knightId: 'sir_gideon',
    displayName: 'Sir Gideon',
    engine: 'kokoro_onnx',
    style: 'skeptical QA auditor; blunt but useful',
    allowedModes: ['council', 'podcast', 'automation'],
    safetyNotes: ['Flags risk and uncertainty.']
  },
  {
    speakerId: 'apis_research',
    knightId: 'lady_apis',
    displayName: 'Lady Apis',
    engine: 'kokoro_onnx',
    style: 'evidence-focused researcher; cites source confidence',
    allowedModes: ['council', 'podcast', 'automation'],
    safetyNotes: ['Source-backed claims only.']
  },
  {
    speakerId: 'sonus_narrator',
    knightId: 'sir_sonus',
    displayName: 'Sir Sonus',
    engine: 'suno',
    style: 'sonic director and narrator; cinematic transitions',
    allowedModes: ['podcast', 'automation'],
    safetyNotes: ['Publishing, cloning, or paid generation requires HITL.']
  }
];

export function getVoiceProfile(speakerId: string): VoiceProfile | undefined {
  return VOICE_PROFILES.find(v => v.speakerId === speakerId || v.knightId === speakerId);
}

export function listVoiceProfilesForMode(mode: VoiceMode): VoiceProfile[] {
  return VOICE_PROFILES.filter(v => v.allowedModes.includes(mode));
}
