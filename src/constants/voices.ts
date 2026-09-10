import { GeminiVoiceMetadata } from '../types/persona';

export const GEMINI_LIVE_VOICES: GeminiVoiceMetadata[] = [
  {
    id: 'Zephyr',
    name: 'Zephyr',
    gender: 'Neutral',
    tone: 'Crisp, Inspiring & Adaptive',
    pitch: 'Balanced Mid',
    tempo: 'Natural',
    tag: 'Visionary & Adaptive',
    description: 'Bright, balanced, and forward-looking with clear modern articulation. Ideal for tech visionaries, conversational mentors, and interactive guides.',
    sampleQuote: 'The next frontier of human ingenuity is shaped one breakthrough at a time.',
    color: 'from-sky-500/20 to-blue-500/10 text-sky-400 border-sky-500/30 ring-sky-500/30'
  },
  {
    id: 'Kore',
    name: 'Kore',
    gender: 'Female',
    tone: 'Warm, Serene & Scholarly',
    pitch: 'Soft Mid',
    tempo: 'Measured',
    tag: 'Calm & Philosophical',
    description: 'Nurturing, measured, and soothing cadence. Ideal for historians, philosophers, mindfulness guides, and empathetic counselors.',
    sampleQuote: 'Take a quiet breath and look at how each small step connects to the greater whole.',
    color: 'from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30 ring-emerald-500/30'
  },
  {
    id: 'Puck',
    name: 'Puck',
    gender: 'Neutral',
    tone: 'Playful, Whimsical & Energetic',
    pitch: 'Expressive High',
    tempo: 'Lively',
    tag: 'Creative & Spirited',
    description: 'Spirited, high-energy, and whimsical with spontaneous vocal dynamics. Tailored for digital artists, creative brainstormers, and entertainers.',
    sampleQuote: 'What if we throw out the manual entirely and paint outside the canvas for once?',
    color: 'from-amber-500/20 to-orange-500/10 text-amber-400 border-amber-500/30 ring-amber-500/30'
  },
  {
    id: 'Charon',
    name: 'Charon',
    gender: 'Male',
    tone: 'Deep, Resonant & Authoritative',
    pitch: 'Deep Bass',
    tempo: 'Deliberate',
    tag: 'Commanding & Resonant',
    description: 'Deep, gravelly, and commanding baritone with unwavering gravitas. Suited for commanders, security auditors, oceanographers, and veteran analysts.',
    sampleQuote: 'Tread carefully in uncharted territory; discipline and patience reveal what lies hidden.',
    color: 'from-indigo-500/20 to-purple-500/10 text-indigo-400 border-indigo-500/30 ring-indigo-500/30'
  },
  {
    id: 'Fenrir',
    name: 'Fenrir',
    gender: 'Male',
    tone: 'Fast-paced, Sharp & Tactical',
    pitch: 'Edgy Mid',
    tempo: 'Fast',
    tag: 'Tactical & Assertive',
    description: 'Urgent, direct, and street-smart with rapid tactical pacing. Perfect for cybersecurity specialists, hackers, and high-velocity strategists.',
    sampleQuote: 'Operational security and fast execution beat brute force every single time.',
    color: 'from-rose-500/20 to-red-500/10 text-rose-400 border-rose-500/30 ring-rose-500/30'
  },
  {
    id: 'Aoede',
    name: 'Aoede',
    gender: 'Female',
    tone: 'Lyrical, Cultured & Eloquent',
    pitch: 'Melodic Mid',
    tempo: 'Expressive',
    tag: 'Melodic & Eloquent',
    description: 'Melodic, nuanced, and cultured storytelling cadence. Designed for creative writers, researchers, educators, and literary personas.',
    sampleQuote: 'Every thought carries resonance; let us speak with clarity and lasting harmony.',
    color: 'from-violet-500/20 to-fuchsia-500/10 text-violet-400 border-violet-500/30 ring-violet-500/30'
  }
];

export function getVoiceMetadata(voiceId: string): GeminiVoiceMetadata {
  const found = GEMINI_LIVE_VOICES.find(v => v.id.toLowerCase() === voiceId.toLowerCase());
  return found || GEMINI_LIVE_VOICES[0];
}
