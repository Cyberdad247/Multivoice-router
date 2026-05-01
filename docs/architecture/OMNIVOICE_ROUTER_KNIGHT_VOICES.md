# OmniVoice Router – Knight Voice Architecture

Multivoice Router | Anya Edge UI | LYRICUS | Camelot-OS

## Purpose

Every Knight can have its own recognizable voice without creating surprise cloud bills.

```text
Knight -> Voice Profile -> OmniVoice Router -> Local/Free Engine -> Cache -> Playback
```

## Prime Law

```text
No surprise voice bills.
```

All voice generation follows this routing order:

```text
1. Cached audio
2. Local/free TTS
3. Free-tier remote provider
4. Paid/cloud provider only with policy approval
5. Human-readable transcript fallback
```

## Cost Policy

### Free by Default

Default voice output should use:

- local TTS engine,
- browser/device speech synthesis,
- cached audio segments,
- pre-rendered persona phrases,
- transcript-only fallback.

### Paid Requires HITL

Paid or quota-consuming engines require approval for:

- long podcast rendering,
- music generation,
- external voice APIs,
- cloned voices,
- publishing-ready audio,
- batch generation.

## Voice Engine Lanes

### Lane 0: Cache

Use when the same line or common phrase has already been rendered.

Examples:

- "Approval required."
- "Command completed."
- "The ANT dashboard is online."

### Lane 1: Local TTS

Preferred default.

Examples:

- Kokoro ONNX
- Piper
- eSpeak NG
- Coqui local model, if installed
- Android system TTS
- Browser SpeechSynthesis

### Lane 2: Free Remote

Allowed only if configured and within quota.

Examples:

- free-tier endpoint,
- local LAN model gateway,
- OmniRoute free voice adapter.

### Lane 3: Paid / Premium

Requires explicit approval.

Examples:

- Suno/Udio-style music generation,
- cloud TTS with billing,
- NotebookLM Audio generation if quota-sensitive,
- voice cloning providers.

## Knight Voice Identity

Every Knight voice profile should include:

- speaker id,
- Knight id,
- display name,
- voice engine preference order,
- style prompt,
- sample rate,
- max free characters,
- cache policy,
- allowed modes,
- cost ceiling,
- HITL requirement for premium.

## Routing Algorithm

```text
Input: speaker, text, mode, destination, budget policy

1. Normalize text.
2. Compute cache key.
3. If cached audio exists, return cached ref.
4. Select local/free engine matching speaker profile.
5. If local engine unavailable, use browser/device TTS fallback.
6. If podcast/high-fidelity requested, check budget policy.
7. If paid required and not approved, return transcript + approval request.
8. Render audio.
9. Cache result.
10. Return audio ref + transcript + cost estimate.
```

## Knight Voice Examples

### Anya Ω

- Primary: Gemini Live or local expressive TTS
- Fallback: Browser speech synthesis
- Style: fast, warm, operator voice
- Bill policy: free/local unless explicitly approved

### Merlin Ω

- Primary: local Kokoro/Piper
- Style: calm architectural explainer
- Bill policy: never paid for normal council responses

### Sir Alex

- Primary: local Kokoro/Piper
- Style: sharp ROI strategist
- Bill policy: never paid for normal council responses

### Sir Gideon

- Primary: local Kokoro/Piper
- Style: skeptical QA auditor
- Bill policy: never paid for normal audits

### Sir Sonus

- Primary: local TTS for narration
- Premium: music/podcast polish only with approval
- Bill policy: premium engines always HITL-gated

## UI Requirements

Anya UI should show:

- active voice engine,
- estimated cost,
- cache hit/miss,
- speaker timeline,
- local/free/premium badge,
- approval requirement before premium render,
- transcript fallback button.

## Golden Rule

Voices are persona interfaces, not billing traps. If free/local cannot render safely, return a transcript and ask for approval before using paid engines.
