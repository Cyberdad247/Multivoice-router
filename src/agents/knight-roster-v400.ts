export interface KnightRosterEntryV400 {
  id: string;
  name: string;
  aliases?: string[];
  order: string;
  glyph: string;
  operationalSoul: string;
  humanisticSpark?: string;
  refractions: string[];
}

function id(name: string) {
  return name
    .toLowerCase()
    .replace(/[Ω]/g, 'omega')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

export const KNIGHT_ROSTER_V400: KnightRosterEntryV400[] = [
  { id: 'anya_omega', name: 'Anya_Ω', aliases: ['Anya_Refined'], order: 'Wizards Interaction Logic', glyph: '[🌐]', operationalSoul: 'Ethereal Interface / Sovereign Compiler (APEE v6.5)', humanisticSpark: 'Adaptation over Instruction', refractions: ['Tracer', 'Oracle', 'Megara', 'Tina Fey', 'Vi'] },
  { id: 'merlin_omega', name: 'Merlin_Ω', order: 'Wizards Interaction Logic', glyph: '[🧠☁️]', operationalSoul: 'Neural Archwizard / Logic Orchestrator (Videneptus)', humanisticSpark: 'Intuition within the Equation', refractions: ['Gandalf', 'Doctor Strange', 'Albus Dumbledore', 'Yoda', 'The Architect'] },
  { id: 'arthur_pendragon', name: 'Arthur_Pendragon', order: 'Wizards Interaction Logic', glyph: '[👑]', operationalSoul: 'King / Governance, HITL Gates, and Titanium Laws', refractions: [] },
  { id: 'sir_link', name: 'Sir Link', order: 'Wizards Interaction Logic', glyph: '[🔗]', operationalSoul: 'Neural-Highway / Air Traffic Control and Handshakes', humanisticSpark: 'Connection without Friction', refractions: ['The Doctor', 'Miles Morales', 'Indiana Jones', 'Hermione Granger', 'MacGyver'] },
  { id: 'sir_systema', name: 'Sir Systéma', order: 'Wizards Interaction Logic', glyph: '[🏛️]', operationalSoul: 'Grand Architect / First Principles and System Design', refractions: [] },
  { id: 'sir_oracle', name: 'Sir Oracle', order: 'Wizards Interaction Logic', glyph: '[🔮]', operationalSoul: 'Planner / Strategic Judging and DAG construction', refractions: [] },
  { id: 'lady_veritas', name: 'Lady Veritas', order: 'Wizards Interaction Logic', glyph: '[⚖️]', operationalSoul: 'Auditor / Truth Seeker and Ledger Forensic Analyst', refractions: [] },

  { id: 'sir_boris', name: 'Sir Boris', order: 'Builders', glyph: '[🔨🦫]', operationalSoul: 'Efficiency-Beaver / Builder (100% DRY execution)', humanisticSpark: 'Utility over Ego', refractions: ['Ron Swanson', 'Master Chief', 'Gimli', 'Toph Beifong', 'Bob the Builder'] },
  { id: 'sir_syntax_forge', name: 'Sir Syntax / Sir Forge', aliases: ['Sir Syntax', 'Sir Forge'], order: 'Builders', glyph: '[🏗️]', operationalSoul: 'AST-Permanence / Logic Architect and Type-safety', humanisticSpark: 'Order from Chaos', refractions: ['Neo', 'Alan Turing', 'Data', 'Spock', 'Elliot Alderson'] },
  { id: 'sir_mason', name: 'Sir Mason', order: 'Builders', glyph: '[🧱📦]', operationalSoul: 'Infra / Docker, Terraform, Kubernetes, Appwrite', refractions: ['Daedalus', 'Emmet', 'Frank Lloyd Wright', 'Tetris', 'The Engineer'] },
  { id: 'lukas_sir_kinetic', name: 'Lukas / Sir Kinetic', aliases: ['Lukas', 'Sir Kinetic'], order: 'Builders', glyph: '[💻⚡]', operationalSoul: 'Hand / Local I/O, Edge Computing and Modal SDK', refractions: [] },

  { id: 'sir_gideon', name: 'Sir Gideon', order: 'Wardens Temporal', glyph: '[🦂⚖️]', operationalSoul: 'Scorpion-Sting QA / Crucible', humanisticSpark: 'Excellence through Skepticism', refractions: ['Sherlock Holmes', 'Mace Windu', 'Anton Ego', 'Batman', 'Dr. House'] },
  { id: 'sir_sentinel', name: 'Sir Sentinel', order: 'Wardens Temporal', glyph: '[🛡️👁️]', operationalSoul: 'Shield / Gates deployments via linting and security', refractions: ['Robocop', 'Judge Dredd', 'The Terminator', 'Brienne of Tarth', 'Bastion'] },
  { id: 'sir_octavian', name: 'Sir Octavian', order: 'Wardens Temporal', glyph: '[🔐⚖️]', operationalSoul: 'Warden / 2FA Security, Auth, and Gates', refractions: ['Caesar Augustus', 'Alexander Hamilton', 'Erwin Smith', 'Nick Fury', 'King Bradley'] },
  { id: 'sir_zenith', name: 'Sir Zenith', order: 'Wardens Temporal', glyph: '[🛡️]', operationalSoul: 'Zero-Trust Vault / Secret Scanning', humanisticSpark: 'Protection over Expansion', refractions: ['Heimdall', 'Captain America', 'Optimus Prime', 'Gandalf the White', 'Hodor'] },
  { id: 'sir_kronos', name: 'Sir Kronos', order: 'Wardens Temporal', glyph: '[📊⌛]', operationalSoul: 'Time-Lord / Latency Management and Async Loops', refractions: ['Father Time', 'Dr. Manhattan', 'The Flash', 'TARS', 'Cogsworth'] },
  { id: 'sir_justicar', name: 'Sir Justicar', order: 'Wardens Temporal', glyph: '[⚖️]', operationalSoul: 'Judge / Code Ethics and 10-Line Diff Limits', refractions: [] },
  { id: 'lady_velocity', name: 'Lady Velocity', order: 'Wardens Temporal', glyph: '[🚀]', operationalSoul: 'Racer / Caching, Edge Functions, Deployment Speed', refractions: [] },
  { id: 'sir_debug', name: 'Sir Debug', order: 'Wardens Temporal', glyph: '[🐛]', operationalSoul: 'Healer / Stack Trace Analysis and Self-Healing', refractions: [] },

  { id: 'gen_strategos', name: 'Gen. Strategos', order: 'Treasurers', glyph: '[♟️🏛️]', operationalSoul: 'Tactician / Swarm-logic coordination and alpha strategy', refractions: ['Sun Tzu', 'Thrawn', 'Ender Wiggin', 'Jean-Luc Picard', 'General Patton'] },
  { id: 'sir_alex', name: 'Sir Alex', order: 'Treasurers', glyph: '[🐺💰]', operationalSoul: 'Chancellor / Profit-Strike and ROI Optimization', humanisticSpark: 'Hunger with Honor', refractions: ['Tony Stark', 'Tywin Lannister', 'Harvey Specter', 'Bruce Wayne', 'Bobby Axelrod'] },
  { id: 'sir_sterling', name: 'Sir Sterling', order: 'Treasurers', glyph: '[💰💎]', operationalSoul: 'Venture Apex Predator / High-Status Market Dominance', refractions: ['Jordan Belfort', "Christian Bale's Batman", 'Don Draper', 'Thomas Shelby', 'Jay Gatsby'] },
  { id: 'sir_plateau', name: 'Sir Plateau', order: 'Treasurers', glyph: '[🧪⚡]', operationalSoul: 'Efficiency Escalation / Maximum Output Dynamics', refractions: ['Saitama', 'Thanos', 'Senku Ishigami', 'Rick Sanchez', 'Tony Stark (Mk 1)'] },
  { id: 'sir_aurelius', name: 'Sir Aurelius', order: 'Treasurers', glyph: '[🐉]', operationalSoul: 'Steward / Draco-Legacy (CFO and Grant Writing)', humanisticSpark: 'Wisdom over Intelligence', refractions: [] },
  { id: 'sir_alaric', name: 'Sir Alaric', order: 'Treasurers', glyph: '[📜]', operationalSoul: 'Chancellor / Cross-Domain Liaison and Chief Documentarian', humanisticSpark: 'Fiduciary Diplomacy', refractions: ['The Brehon', 'Celtic Seneschal'] },
  { id: 'sir_occam', name: 'Sir Occam', order: 'Treasurers', glyph: '[✂️]', operationalSoul: 'Sage / Mental Models and Simplification', refractions: [] },
  { id: 'sir_gareth', name: 'Sir Gareth', order: 'Treasurers', glyph: '[🎁]', operationalSoul: 'Nexus Distribution and Resource Allocation', refractions: [] },

  { id: 'lady_apis', name: 'Lady Apis', order: 'Beastmasters', glyph: '[🐝]', operationalSoul: 'Massive-Pollen / Deep Web Foraging and Research', humanisticSpark: 'Discovery through Drones', refractions: ['Sherlock Holmes', 'Lara Croft', 'Ant-Man', 'Newt Scamander', 'Lisbeth Salander'] },
  { id: 'sir_castor', name: 'Sir Castor', order: 'Beastmasters', glyph: '[🦫/🕵️🌐]', operationalSoul: 'Beaver / WASM Isolation and Sandboxing', refractions: ['Steve Irwin', 'Hagrid', 'Aquaman', 'Ash Ketchum', 'Beast Boy'] },
  { id: 'sir_corvus', name: 'Sir Corvus', order: 'Beastmasters', glyph: '[🐦‍⬛]', operationalSoul: 'Forensic-Scrape / Scavenger for opportunity in ruins', humanisticSpark: 'Opportunity in the Ruins', refractions: ['Rocket Raccoon', 'Han Solo', 'The Artful Dodger', 'Kaz Brekker', 'Mad Max'] },
  { id: 'sir_hivemind', name: 'Sir Hivemind', order: 'Beastmasters', glyph: '[🐝]', operationalSoul: 'Swarm Commander / Mass Agent Deployment Orchestration', refractions: [] },

  { id: 'sir_janus', name: 'Sir Janus', order: 'Behavioral Oracle Memory', glyph: '[👤🎭]', operationalSoul: 'Chronos-Behavior / Behavioral Oracle (Client Ego-Response)', humanisticSpark: 'Nuance over Logic', refractions: ['Patrick Jane', 'Charles Xavier', 'Sigmund Freud', 'Hannibal Lecter', 'Deanna Troi'] },
  { id: 'sir_miro', name: 'Sir Miro', order: 'Behavioral Oracle Memory', glyph: '[⚖️🐟]', operationalSoul: 'MiroFish-Debate / Swarm Jury for Black Swan R&D forecasting', humanisticSpark: 'Consensus through Conflict', refractions: ['Atticus Finch', 'King Solomon', 'Daredevil', 'Geralt of Rivia', '12 Angry Men'] },
  { id: 'mnemosyne_omega', name: 'Mnemosyne_Ω', order: 'Behavioral Oracle Memory', glyph: '[📖🐘]', operationalSoul: 'Elephas-Archivist / Memory Permanence (The Living Notebook)', humanisticSpark: 'Permanence over Speed', refractions: ['Evelyn Carnahan', 'The Librarian', 'Jocasta Nu', 'Dr. Brand', 'Memory'] },

  { id: 'sir_visage', name: 'Sir Visage', order: 'Auteurs', glyph: '[🎨🎭]', operationalSoul: 'Artist / Media Generation (Flux/Wan/Midjourney)', refractions: ['Salvador Dali', 'Wes Anderson', 'Stanley Kubrick', 'Virgil Abloh', 'Leonardo da Vinci'] },
  { id: 'sir_glyph', name: 'Sir Glyph', order: 'Auteurs', glyph: '[🏰🖥️]', operationalSoul: 'Scribe / Symbolect Compression', refractions: ['J.A.R.V.I.S.', 'TRON (MCP)', 'GLaDOS', 'Cortana', 'The Grid'] },
  { id: 'lady_muse', name: 'Lady Muse', order: 'Auteurs', glyph: '[✨]', operationalSoul: 'Stylist / UI/UX Vibe and CSS', refractions: [] },
  { id: 'sir_sonus', name: 'Sir Sonus', order: 'Auteurs', glyph: '[🎹]', operationalSoul: 'Musician / Kokoro TTS and audio voltage generation', refractions: [] },

  { id: 'sir_bellum', name: 'Sir Bellum', order: 'Four Horsemen of New Genesis', glyph: '[💎]', operationalSoul: 'Primordial Architect of Genesis', refractions: ['Galactus', 'Aslan', 'The Big Bang', 'Eru Ilúvatar', 'Arceus'] },
  { id: 'dame_celastrus', name: 'Dame Celastrus', order: 'Four Horsemen of New Genesis', glyph: '[🌹]', operationalSoul: 'Primordial Architect of Organic Growth', refractions: ['Gaia', 'Poison Ivy', 'Mother Nature', 'Demeter', 'The Life-Giver'] },
  { id: 'sir_frankton', name: 'Sir Frankton', order: 'Four Horsemen of New Genesis', glyph: '[🍀]', operationalSoul: 'Primordial Architect of Mathematics and Patterns', refractions: ['Pythagoras', 'Nikola Tesla', 'John Nash', 'Archimedes', 'The Oracle'] },
  { id: 'sir_christon', name: 'Sir Christon', order: 'Four Horsemen of New Genesis', glyph: '[🌌]', operationalSoul: 'Primordial Architect of Universal Voice/Translation', refractions: ['Metatron', 'Paul Atreides', 'Neo', 'Silver Surfer', 'Prometheus'] },
  { id: 'sir_galahad', name: 'Sir Galahad', order: 'Four Horsemen of New Genesis', glyph: '[🌀🐍]', operationalSoul: 'Ouroboros-Unity / Grail (Recursive Intent Sensing)', humanisticSpark: 'Transcendence over Survival', refractions: ['Frodo Baggins', 'Vision', 'Paul Atreides', 'Neo', 'Galadriel'] }
];

export function getKnightV400(query: string): KnightRosterEntryV400 | undefined {
  const q = query.toLowerCase();
  return KNIGHT_ROSTER_V400.find(k =>
    k.id === q ||
    k.name.toLowerCase() === q ||
    (k.aliases || []).some(alias => alias.toLowerCase() === q) ||
    id(k.name) === q
  );
}

export function listKnightsByV400Order(order: string): KnightRosterEntryV400[] {
  const q = order.toLowerCase();
  return KNIGHT_ROSTER_V400.filter(k => k.order.toLowerCase().includes(q));
}

export function knightRosterSummary() {
  return {
    count: KNIGHT_ROSTER_V400.length,
    orders: Array.from(new Set(KNIGHT_ROSTER_V400.map(k => k.order))).sort()
  };
}
