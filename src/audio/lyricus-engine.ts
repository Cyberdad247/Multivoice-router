export type LyricusTarget = 'kokoro_onnx' | 'suno' | 'udio' | 'notebooklm_audio' | 'modal_audio_worker';

export interface LyricusInput {
  text: string;
  target?: LyricusTarget;
  mood?: string;
  genre?: string;
  bpm?: number;
  key?: string;
  voiceProfile?: string;
  instrumentation?: string[];
  publishIntent?: boolean;
}

export interface LyricusOutput {
  target: LyricusTarget;
  phoneticScript: string;
  universalExecutionBlock: string;
  monsterScore: {
    orchestralScale: number;
    mafiosaSwagger: number;
    deltaChaos: number;
    fPower: number;
  };
  requiresApproval: boolean;
  notes: string[];
}

function phoneticHack(text: string) {
  return text
    .replace(/\bnever\b/gi, 'NEVER')
    .replace(/\bsovereign\b/gi, 'so-ver-eign')
    .replace(/\bkinetic\b/gi, 'kin-et-ic')
    .replace(/\bpower\b/gi, 'POWER')
    .replace(/\./g, '. [pause 0.35s]');
}

function monsterScore(input: LyricusInput) {
  const orchestralScale = input.instrumentation?.length ? Math.min(5, input.instrumentation.length) : 2;
  const mafiosaSwagger = /gritty|dark|cinematic|mafiosa|trap|anthem/i.test(`${input.genre} ${input.mood}`) ? 4 : 2;
  const deltaChaos = /chaos|wild|aggressive|war/i.test(`${input.genre} ${input.mood}`) ? 2 : 0.75;
  const fPower = (orchestralScale * mafiosaSwagger) + deltaChaos;
  return { orchestralScale, mafiosaSwagger, deltaChaos, fPower };
}

export function runLyricus(input: LyricusInput): LyricusOutput {
  const target = input.target || 'kokoro_onnx';
  const hacked = phoneticHack(input.text);
  const score = monsterScore(input);
  const bpm = input.bpm || (target === 'suno' || target === 'udio' ? 142 : undefined);
  const key = input.key || (target === 'suno' || target === 'udio' ? 'D minor' : undefined);

  const universalExecutionBlock = [
    '[STYLE_PROMPT]',
    `Target: ${target}`,
    `Genre: ${input.genre || 'cinematic spoken-word / adaptive narration'}`,
    `Mood: ${input.mood || 'focused, sovereign, emotionally grounded'}`,
    bpm ? `BPM: ${bpm}` : undefined,
    key ? `Key: ${key}` : undefined,
    `Vocal Style: ${input.voiceProfile || 'Jarvis operator voice, clear, calm, controlled'}`,
    `Instrumentation: ${(input.instrumentation || ['subtle pulse', 'warm low strings']).join(', ')}`,
    'Mix: high-fidelity, clean transient control, no muddy low end',
    `Performance Notes: ${hacked}`,
    'Negative Constraints: no vocal cloning, no impersonation, no genre drift, no uncontrolled ad-libs',
    '[/STYLE_PROMPT]'
  ].filter(Boolean).join('\n');

  return {
    target,
    phoneticScript: hacked,
    universalExecutionBlock,
    monsterScore: score,
    requiresApproval: Boolean(input.publishIntent),
    notes: [
      `LYRICUS compiled audio intent for ${target}.`,
      `Monster F_power=${score.fPower}.`,
      input.publishIntent ? 'Publishing intent detected: approval required.' : 'No publishing intent detected.'
    ]
  };
}
