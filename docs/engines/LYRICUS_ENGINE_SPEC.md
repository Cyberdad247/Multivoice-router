# LYRICUS Engine – Audio and Voice Engine Spec

Camelot-OS | Sonic Generation Layer

LYRICUS is Camelot-OS's dedicated audio and voice engine. It compiles text, lyrics, scripts, persona tone, and musical intent into high-fidelity audio prompts and voice instructions for local TTS and generative audio platforms.

## 1. Role and Scope

LYRICUS is responsible for:

- text-to-speech prompt shaping,
- voice persona mapping,
- phonetic performance control,
- music generation prompt compilation,
- podcast/audio-overview generation,
- sonic branding for Camelot personas and client content.

LYRICUS does not execute payments, publish audio, or upload generated content without approval. It only prepares or routes audio-generation jobs.

## 2. Core Technology Targets

### Local / Low Latency

- Kokoro-ONNX for local TTS.

### Heavy / Generative

- Suno-style music generation.
- Udio-style music generation.
- NotebookLM Audio Studio for audio overviews and synthesized podcast-style narration.
- Modal workers for heavy audio batch generation.

## 3. Phonetic Hacking

LYRICUS uses structured performance markup to guide audio models toward human-style delivery.

Supported techniques:

- CAPS emphasis: `NEVER fold.`
- Hyphenation: `kin-et-ic`, `so-ver-eign`
- Stage directions: `[low breath]`, `[gravel tone]`, `[half-whisper]`
- Cadence control: `[pause 0.5s]`, `[accelerate]`, `[hold note]`
- Emotion tags: `[defiant]`, `[warm]`, `[urgent]`

## 4. Monster Algorithm

The Monster Algorithm is the S3_FUSE_CREW scoring system for advanced music direction.

Conceptual formula:

```text
F_power = (orchestral_scale * mafiosa_swagger) + delta_chaos
```

Recommended controls:

- bpm
- key
- scale
- energy
- grit
- orchestral scale
- vocal stack count
- harmonic density
- cinematic multiplier

## 5. Universal Execution Block

LYRICUS emits a platform-neutral audio block:

```text
[STYLE_PROMPT]
Genre:
Mood:
BPM:
Key:
Vocal Style:
Instrumentation:
Mix:
Performance Notes:
Negative Constraints:
[/STYLE_PROMPT]
```

This block can be adapted for Kokoro, Suno, Udio, or NotebookLM Audio Studio.

## 6. Camelot Runtime Integration

```text
Text / Script / Lyric Intent
  -> LYRICUS compile
  -> Universal Execution Block
  -> AETHER route
  -> Kokoro / Suno / Udio / NotebookLM Audio Studio / Modal
  -> OUROBOROS memory event
```

## 7. Safety Rules

- Do not clone a real person's voice without permission.
- Do not claim generated audio is a real person.
- Require approval before publishing, monetizing, or uploading.
- Store prompt, provider, and output refs in the provenance ledger.

## 8. Golden Rule

LYRICUS shapes sound. It does not publish sound. Publishing routes through AETHER and ANTIGRAVITY approval gates.
