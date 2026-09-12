/**
 * Utilities for processing PCM audio data for the Gemini Multimodal Live API.
 */

/**
 * Converts Float32 audio data (from Web Audio API) to Int16 PCM data (expected by Gemini).
 */
export function float32ToInt16(float32Array: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

/**
 * Converts Int16 PCM data (from Gemini) to Float32 audio data (for Web Audio API).
 */
export function int16ToFloat32(int16Array: Int16Array): Float32Array {
  const float32Array = new Float32Array(int16Array.length);
  for (let i = 0; i < int16Array.length; i++) {
    float32Array[i] = int16Array[i] / 32768;
  }
  return float32Array;
}

/**
 * Converts an ArrayBuffer to a Base64 string.
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Converts a Base64 string to an ArrayBuffer.
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Wraps raw 16-bit PCM buffer into a valid WAV file Blob (default 24000Hz mono).
 */
export function pcm16ToWavBlob(pcmData: ArrayBuffer | Uint8Array, sampleRate = 24000): Blob {
  const pcmBytes = pcmData instanceof Uint8Array ? pcmData : new Uint8Array(pcmData);
  const wavBuffer = new ArrayBuffer(44 + pcmBytes.length);
  const view = new DataView(wavBuffer);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  // RIFF header
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + pcmBytes.length, true);
  writeString(8, 'WAVE');

  // fmt chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true);  // AudioFormat (1 for PCM)
  view.setUint16(22, 1, true);  // NumChannels (1 = Mono)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate (SampleRate * 1 channel * 2 bytes/sample)
  view.setUint16(32, 2, true);  // BlockAlign (1 channel * 2 bytes)
  view.setUint16(34, 16, true); // BitsPerSample (16-bit)

  // data chunk
  writeString(36, 'data');
  view.setUint32(40, pcmBytes.length, true);

  // PCM bytes
  new Uint8Array(wavBuffer, 44).set(pcmBytes);

  return new Blob([wavBuffer], { type: 'audio/wav' });
}

/**
 * Creates a playable object URL from base64 audio (handles both raw PCM and encoded audio).
 */
export function createPlayableAudioUrl(base64Audio: string, mimeType = 'audio/pcm;rate=24000'): string {
  const arrayBuffer = base64ToArrayBuffer(base64Audio);
  const lowerMime = mimeType.toLowerCase();
  if (lowerMime.includes('pcm') || lowerMime.includes('raw') || lowerMime.includes('l16') || !lowerMime.includes('/')) {
    const rateMatch = lowerMime.match(/rate=(\d+)/);
    const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;
    const blob = pcm16ToWavBlob(arrayBuffer, sampleRate);
    return URL.createObjectURL(blob);
  }
  const blob = new Blob([arrayBuffer], { type: mimeType });
  return URL.createObjectURL(blob);
}

// Tactical Web Audio Haptic Feedback Engine
let sharedAudioCtx: AudioContext | null = null;

function getHapticAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        sharedAudioCtx = new AudioCtxClass();
      }
    }
    if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

/**
 * Synthesizes a crisp, subtle mechanical ratchet/armor clink when rotating carousel or switching knights.
 */
export function playArmorClick(pitchMultiplier = 1.0) {
  try {
    const ctx = getHapticAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    const baseFreq = 840 * Math.max(0.6, Math.min(1.8, pitchMultiplier));
    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.4, ctx.currentTime + 0.035);

    filter.type = 'highpass';
    filter.frequency.setValueAtTime(450, ctx.currentTime);

    gain.gain.setValueAtTime(0.045, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.035);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  } catch {
    // Graceful fallback if audio is blocked
  }
}

/**
 * Synthesizes a resonant harmonic awakening chord when a knight is awakened.
 */
export function playAwakenChord() {
  try {
    const ctx = getHapticAudioContext();
    if (!ctx) return;

    // Harmonic triad: A4 (440Hz), C#5 (554Hz), E5 (659Hz)
    const freqs = [440, 554.37, 659.25];
    const now = ctx.currentTime;

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const delay = idx * 0.03;
      gain.gain.setValueAtTime(0.0001, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.045, now + delay + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.48);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + 0.5);
    });
  } catch {
    // Graceful fallback
  }
}

/**
 * Synthesizes a subtle low-resonance aerodynamic whoosh on fast kinetic swipe.
 */
export function playWhoosh() {
  try {
    const ctx = getHapticAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sine';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(260, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.16);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.03, now + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.17);
  } catch {
    // Graceful fallback
  }
}
