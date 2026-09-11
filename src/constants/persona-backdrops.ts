export interface PersonaBackdropInfo {
  id: string;
  personaName: string;
  title: string;
  environment: string;
  imageUrl: string;
  fallbackSeed: string;
  accentGlow: string; // Tailwind color class / rgba
  borderColor: string;
  dominantHex: string;
  themePrompt: string;
}

export const PERSONA_BACKDROPS: Record<string, PersonaBackdropInfo> = {
  'merlin-omega': {
    id: 'merlin-omega',
    personaName: 'MERLIN_Ω',
    title: 'Sovereign Orchestration Nexus',
    environment: 'Anti-Gravity Parallel Forge Core',
    imageUrl: 'https://i.postimg.cc/HLbzLvC3/Chat-GPT-Image-Sep-11-2026-09-57-53-AM.png',
    fallbackSeed: 'merlin-omega-nexus',
    accentGlow: 'from-amber-500/25 via-cyan-500/20 to-transparent',
    borderColor: 'border-amber-500/40',
    dominantHex: '#f59e0b',
    themePrompt: 'Cinematic command nexus with dark obsidian stone monoliths, glowing gold circuits, and radiant cyan holographic geometric data structures.'
  },
  'sir-codex': {
    id: 'sir-codex',
    personaName: 'Sir Codex',
    title: 'WASM32 & Zero-Copy Cathedral',
    environment: 'High-Density MicroVM Assembly Matrix',
    imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=1920&auto=format&fit=crop',
    fallbackSeed: 'sir-codex-wasm',
    accentGlow: 'from-cyan-500/25 via-teal-500/15 to-transparent',
    borderColor: 'border-cyan-500/40',
    dominantHex: '#06b6d4',
    themePrompt: 'Cybernetic compiler forge with floating holographic assembly code, zero-copy memory matrix, and sleek dark carbon fiber server racks.'
  },
  'sir-boris': {
    id: 'sir-boris',
    personaName: 'Sir Boris',
    title: '3D Kinetic Brutalist Atelier',
    environment: 'Spring Physics & Perspective Stage',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1920&auto=format&fit=crop',
    fallbackSeed: 'sir-boris-kinetics',
    accentGlow: 'from-purple-500/25 via-pink-500/15 to-transparent',
    borderColor: 'border-purple-500/40',
    dominantHex: '#a855f7',
    themePrompt: 'Mesmerizing 3D kinetic architecture laboratory with dynamic geometric forms, gyroscopic rings, and radiant lighting in luxury brutalism.'
  },
  'sir-gideon': {
    id: 'sir-gideon',
    personaName: 'Sir Gideon',
    title: 'Iron Gate & Z3 SMT Citadel',
    environment: 'Vigilant Security & Provenance Vault',
    imageUrl: 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?q=80&w=1920&auto=format&fit=crop',
    fallbackSeed: 'sir-gideon-vault',
    accentGlow: 'from-emerald-500/25 via-blue-500/15 to-transparent',
    borderColor: 'border-emerald-500/40',
    dominantHex: '#10b981',
    themePrompt: 'Futuristic Iron Gate fortress with massive dark titanium vault doors engraved with cryptographic glyphs and radiant blue security shields.'
  },
  'nova': {
    id: 'nova',
    personaName: 'Nova',
    title: 'Interstellar Quantum Horizon',
    environment: 'Deep Space Outpost & Orbital Observatory',
    imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1920&auto=format&fit=crop',
    fallbackSeed: 'nova-quantum-space',
    accentGlow: 'from-blue-500/25 via-indigo-500/20 to-transparent',
    borderColor: 'border-blue-500/40',
    dominantHex: '#3b82f6',
    themePrompt: 'Expansive cosmic nebula with star-forming interstellar gas clouds, quantum computing rings, and deep space exploration vista.'
  },
  'elara': {
    id: 'elara',
    personaName: 'Elara',
    title: 'Classical Alexandria Archive',
    environment: 'Ancient Sanctuary of Lost Manuscripts',
    imageUrl: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?q=80&w=1920&auto=format&fit=crop',
    fallbackSeed: 'elara-antiquity-library',
    accentGlow: 'from-amber-600/25 via-yellow-600/15 to-transparent',
    borderColor: 'border-amber-600/40',
    dominantHex: '#d97706',
    themePrompt: 'Grand ancient classical library and museum arches with warm candlelight, Roman marble statues, and leather-bound scrolls.'
  },
  'jax': {
    id: 'jax',
    personaName: 'Jax',
    title: 'Cyberpunk Sprawl Underbelly',
    environment: 'Decentralized Dark-Net Node',
    imageUrl: 'https://images.unsplash.com/photo-1515260268569-9271009adfdb?q=80&w=1920&auto=format&fit=crop',
    fallbackSeed: 'jax-cyberpunk-sprawl',
    accentGlow: 'from-fuchsia-500/25 via-red-500/15 to-transparent',
    borderColor: 'border-fuchsia-500/40',
    dominantHex: '#d946ef',
    themePrompt: 'Neon-drenched cyberpunk alley with glowing Japanese signage, optical fiber cables, and holographic command consoles in a dark rainy city.'
  },
  'atlas': {
    id: 'atlas',
    personaName: 'Atlas',
    title: 'Mariana Midnight Abyss',
    environment: 'Hadal Submersible Observation Chamber',
    imageUrl: 'https://images.unsplash.com/photo-1682687220063-4742bd7fd538?q=80&w=1920&auto=format&fit=crop',
    fallbackSeed: 'atlas-ocean-abyss',
    accentGlow: 'from-teal-600/25 via-blue-700/20 to-transparent',
    borderColor: 'border-teal-500/40',
    dominantHex: '#14b8a6',
    themePrompt: 'Bioluminescent deep oceanic midnight abyss with glowing marine life, hydrothermal vents, and dark submarine viewing portholes.'
  },
  'lyra': {
    id: 'lyra',
    personaName: 'Lyra',
    title: 'Synesthesia Chromatic Void',
    environment: 'Generative Algorithm & Sound Stage',
    imageUrl: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=1920&auto=format&fit=crop',
    fallbackSeed: 'lyra-synesthesia-art',
    accentGlow: 'from-pink-500/25 via-rose-500/20 to-transparent',
    borderColor: 'border-pink-500/40',
    dominantHex: '#ec4899',
    themePrompt: 'Vibrant kaleidoscopic generative fluid art with neon swirls, synesthesia color soundscapes, and hypnotic algorithmic waveforms.'
  },
  'sage': {
    id: 'sage',
    personaName: 'Sage',
    title: 'Primordial Mycelial Canopy',
    environment: 'Planetary Biosphere Sanctuary',
    imageUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=1920&auto=format&fit=crop',
    fallbackSeed: 'sage-mycelial-canopy',
    accentGlow: 'from-emerald-600/25 via-lime-600/15 to-transparent',
    borderColor: 'border-emerald-600/40',
    dominantHex: '#059669',
    themePrompt: 'Ethereal mossy ancient redwood forest with glowing mycelial networks, sunbeams filtering through dense green branches, and serene natural sanctuary.'
  }
};

export function getPersonaBackdrop(personaId: string, customBackdropUrl?: string): PersonaBackdropInfo {
  const backdrop = PERSONA_BACKDROPS[personaId] || PERSONA_BACKDROPS['merlin-omega'];
  if (customBackdropUrl) {
    return {
      ...backdrop,
      imageUrl: customBackdropUrl
    };
  }
  return backdrop;
}
