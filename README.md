<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Multivoice Router — Camelot L7 Interface

This repository is the voice, persona, and input compiler layer (Anya_Ω) of the Camelot-OS architecture.

## 🧠 System Overview

```text
Voice Input
→ Anya Compiler (APEE + QFT)
→ Titan Prompt
→ Camelot Engine Pipeline
→ AETHER Router
→ Edge Nodes (PhoneClaw / Chrome / RustDesk)
→ Execution
→ OUROBOROS Memory + Ledger
```

## ⚙️ Core Components

### Anya Compiler
- Triple-QFT filtering
- Titan Prompt generation
- AgentArmor security
- Skill loading

### Engine Layer
- APEE (input compiler)
- GENESIS (persona)
- VIDENEPTUS (reasoning)
- VERITAS (verification)
- AETHER (routing)
- ANTIGRAVITY (execution safety)
- OUROBOROS (memory)
- AURORA (vision)
- LYRICUS (audio)

### Edge Execution
- PhoneClaw (Android)
- superpowers-chrome (browser)
- RustDesk Agent (desktop)

## 🖥️ UI Components

### GenesisTerminal
A 16-bit Sega Genesis aesthetic terminal component built with React and Tailwind CSS.

**Features:**
- CRT scanline overlay with phosphor mesh simulation
- VDP boot sequence typing animation
- Step-function cursor blink (authentic to Genesis hardware)
- Responsive 320×224 pixel-doubled layout (`aspect-[640/448]`)
- Pixel-press button with 4px shadow-snap on active
- `Press Start 2P` font loaded via `next/font/google`

**Usage:**
```tsx
import { GenesisTerminal } from '@/components/GenesisTerminal';

export default function Page() {
  return <GenesisTerminal />;
}
```

**Required Tailwind config extensions** (`tailwind.config.ts`):
```ts
animation: {
  'fade-in': 'fadeIn 0.4s ease-in forwards',
  blink: 'blink 1s step-end infinite',
},
keyframes: {
  fadeIn: { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
  blink: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0' } },
},
```

## 🚀 Run Locally

1. Install dependencies:
   `npm install`
2. Set `GEMINI_API_KEY` in `.env.local`
3. Run:
   `npm run dev`

## 🧬 Vision

This is not just a chatbot. It is a governed AI execution system that converts human intent into secure, traceable, and executable commands.
