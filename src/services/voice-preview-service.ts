import { Persona } from '../types/persona';
import { createPlayableAudioUrl } from '../lib/audio-utils';
import { toast } from 'sonner';

export interface VoicePreviewState {
  personaId: string | null;
  isLoading: boolean;
  isPlaying: boolean;
  error: string | null;
}

type Listener = (state: VoicePreviewState) => void;

class VoicePreviewService {
  private currentAudio: HTMLAudioElement | null = null;
  private currentUrl: string | null = null;
  private currentPersonaId: string | null = null;
  private isLoading: boolean = false;
  private isPlaying: boolean = false;
  private audioCache: Map<string, { audioBase64: string; mimeType: string }> = new Map();
  private listeners: Set<Listener> = new Set();

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach(l => l(state));
  }

  public getState(): VoicePreviewState {
    return {
      personaId: this.currentPersonaId,
      isLoading: this.isLoading,
      isPlaying: this.isPlaying,
      error: null
    };
  }

  public stop() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    if (this.currentUrl) {
      URL.revokeObjectURL(this.currentUrl);
      this.currentUrl = null;
    }
    this.isPlaying = false;
    this.isLoading = false;
    this.currentPersonaId = null;
    this.notify();
  }

  public async playPreview(persona: Persona, customText?: string) {
    // If the same persona is already playing, toggle stop
    if (this.currentPersonaId === persona.id && this.isPlaying) {
      this.stop();
      return;
    }

    // Stop any currently playing audio
    this.stop();

    this.currentPersonaId = persona.id;
    this.isLoading = true;
    this.isPlaying = false;
    this.notify();

    const cacheKey = `${persona.id}-${persona.voice}-${customText || 'default'}`;

    try {
      let audioBase64: string;
      let mimeType: string;

      if (this.audioCache.has(cacheKey)) {
        const cached = this.audioCache.get(cacheKey)!;
        audioBase64 = cached.audioBase64;
        mimeType = cached.mimeType;
      } else {
        const res = await fetch('/api/voice/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            personaId: persona.id,
            voice: persona.voice,
            name: persona.name,
            role: persona.role,
            tone: persona.attributes.tone,
            text: customText
          })
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to generate voice preview (${res.status})`);
        }

        const data = await res.json();
        if (!data.audio) {
          throw new Error('No audio returned from voice preview service');
        }

        audioBase64 = data.audio;
        mimeType = data.mimeType || 'audio/pcm;rate=24000';
        this.audioCache.set(cacheKey, { audioBase64, mimeType });
      }

      // Create playable audio URL (WAV format)
      const audioUrl = createPlayableAudioUrl(audioBase64, mimeType);
      this.currentUrl = audioUrl;

      const audio = new Audio(audioUrl);
      this.currentAudio = audio;

      audio.onplay = () => {
        this.isLoading = false;
        this.isPlaying = true;
        this.notify();
      };

      audio.onended = () => {
        this.stop();
      };

      audio.onerror = (e) => {
        console.error('Audio element playback error:', e);
        toast.error('Audio playback failed in browser');
        this.stop();
      };

      await audio.play();
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // play() was interrupted by a call to pause() or load(), which is fine
        console.log('Voice preview playback aborted');
        return;
      }
      console.error('Error generating/playing voice preview:', err);
      toast.error(err?.message || 'Failed to preview persona voice');
      this.stop();
    }
  }
}

export const voicePreviewService = new VoicePreviewService();
