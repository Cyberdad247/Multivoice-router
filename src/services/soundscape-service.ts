// Web Audio API generative ambient soundscape engine
export type SoundscapeType = 'none' | 'laboratory' | 'coffee-shop' | 'neon-rain' | 'deep-space';
export type SoundscapeMode = 'ducking' | 'reactive';

export interface SoundscapePreset {
  id: SoundscapeType;
  name: string;
  category: string;
  icon: string;
  description: string;
  color: string;
}

export const SOUNDSCAPE_PRESETS: SoundscapePreset[] = [
  {
    id: 'none',
    name: 'Mute / Off',
    category: 'Silence',
    icon: 'VolumeX',
    description: 'Ambient soundscape disabled.',
    color: 'text-zinc-500 border-zinc-700'
  },
  {
    id: 'laboratory',
    name: 'Laboratory',
    category: 'Sci-Fi & Cybernetics',
    icon: 'FlaskConical',
    description: 'Server cooling fans, sub-bass 60Hz magnetic drone, and sporadic quantum telemetry pings.',
    color: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/20'
  },
  {
    id: 'coffee-shop',
    name: 'Coffee Shop',
    category: 'Acoustic Warmth',
    icon: 'Coffee',
    description: 'Warm cafe room tone, diffused vocal murmur chatter, and gentle ceramic porcelain clinks.',
    color: 'text-amber-400 border-amber-500/40 bg-amber-950/20'
  },
  {
    id: 'neon-rain',
    name: 'Neon Rain',
    category: 'Atmospheric Weather',
    icon: 'CloudRain',
    description: 'Continuous soothing rainfall against window glass with distant sub-bass rolling thunder.',
    color: 'text-blue-400 border-blue-500/40 bg-blue-950/20'
  },
  {
    id: 'deep-space',
    name: 'Deep Space',
    category: 'Cosmic Drone',
    icon: 'Orbit',
    description: 'Ethereal polyphonic cosmic synth pad, gravitational hum, and orbital spatial resonance.',
    color: 'text-purple-400 border-purple-500/40 bg-purple-950/20'
  }
];

class SoundscapeEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private duckingGain: GainNode | null = null;
  private currentType: SoundscapeType = 'none';
  private nodes: (AudioNode | number)[] = [];
  private intervals: number[] = [];
  private baseVolume: number = 0.35;
  private duckingSensitivity: number = 0.65;
  private mode: SoundscapeMode = 'ducking';
  private lastEffectiveVolume: number = 0;
  private onVolumeChange?: (vol: number) => void;

  private initContext() {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.baseVolume, this.ctx.currentTime);

      this.duckingGain = this.ctx.createGain();
      this.duckingGain.gain.setValueAtTime(1.0, this.ctx.currentTime);

      this.duckingGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setListener(cb: (vol: number) => void) {
    this.onVolumeChange = cb;
  }

  public getPreset(): SoundscapeType {
    return this.currentType;
  }

  public getBaseVolume(): number {
    return this.baseVolume;
  }

  public setBaseVolume(vol: number) {
    this.baseVolume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.baseVolume, this.ctx.currentTime, 0.05);
    }
  }

  public getMode(): SoundscapeMode {
    return this.mode;
  }

  public setMode(mode: SoundscapeMode) {
    this.mode = mode;
  }

  public getDuckingSensitivity(): number {
    return this.duckingSensitivity;
  }

  public setDuckingSensitivity(val: number) {
    this.duckingSensitivity = Math.max(0, Math.min(1, val));
  }

  // Called dynamically with live conversation intensity (0.0 to 1.0)
  public updateConversationIntensity(intensity: number) {
    if (!this.duckingGain || !this.ctx || this.currentType === 'none') {
      return;
    }

    const clampedIntensity = Math.min(1, Math.max(0, intensity * 2.5));
    let targetMultiplier = 1.0;

    if (this.mode === 'ducking') {
      // Smart Ducking: Lowers background ambient audio during active speech so voices remain clear
      // Drops to (1 - sensitivity * 0.8) during high intensity
      const drop = clampedIntensity * this.duckingSensitivity * 0.85;
      targetMultiplier = Math.max(0.12, 1.0 - drop);
    } else {
      // Reactive Resonance: Ambient audio surges subtly with speech passion
      const boost = clampedIntensity * this.duckingSensitivity * 0.7;
      targetMultiplier = Math.min(1.5, 0.8 + boost);
    }

    // Smooth exponential approach over ~120ms
    this.duckingGain.gain.setTargetAtTime(targetMultiplier, this.ctx.currentTime, 0.12);

    const effective = this.baseVolume * targetMultiplier;
    this.lastEffectiveVolume = effective;
    if (this.onVolumeChange) {
      this.onVolumeChange(effective);
    }
  }

  public stop() {
    // Clear scheduled intervals
    this.intervals.forEach(id => window.clearInterval(id));
    this.intervals = [];

    // Stop and disconnect nodes
    this.nodes.forEach(item => {
      try {
        if (typeof item === 'object' && item !== null) {
          if ('stop' in item && typeof (item as any).stop === 'function') {
            (item as any).stop();
          }
          if ('disconnect' in item && typeof item.disconnect === 'function') {
            item.disconnect();
          }
        }
      } catch (e) {}
    });
    this.nodes = [];
    this.currentType = 'none';

    if (this.duckingGain && this.ctx) {
      this.duckingGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
    }
  }

  public play(type: SoundscapeType) {
    this.stop();
    if (type === 'none') return;

    this.initContext();
    if (!this.ctx || !this.duckingGain) return;

    this.currentType = type;

    switch (type) {
      case 'laboratory':
        this.buildLaboratory();
        break;
      case 'coffee-shop':
        this.buildCoffeeShop();
        break;
      case 'neon-rain':
        this.buildNeonRain();
        break;
      case 'deep-space':
        this.buildDeepSpace();
        break;
    }
  }

  // --- Soundscape 1: Laboratory (Sci-Fi Server fans, 60Hz magnetic drone & sporadic telemetry pings) ---
  private buildLaboratory() {
    if (!this.ctx || !this.duckingGain) return;

    // 1. Dual low-frequency magnetic drone (55Hz and 110Hz sub-harmonics)
    const drone1 = this.ctx.createOscillator();
    drone1.type = 'sawtooth';
    drone1.frequency.setValueAtTime(55, this.ctx.currentTime);

    const drone2 = this.ctx.createOscillator();
    drone2.type = 'sine';
    drone2.frequency.setValueAtTime(110.5, this.ctx.currentTime);

    const droneFilter = this.ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.setValueAtTime(180, this.ctx.currentTime);

    const droneGain = this.ctx.createGain();
    droneGain.gain.setValueAtTime(0.18, this.ctx.currentTime);

    drone1.connect(droneFilter);
    drone2.connect(droneFilter);
    droneFilter.connect(droneGain);
    droneGain.connect(this.duckingGain);

    drone1.start();
    drone2.start();
    this.nodes.push(drone1, drone2, droneFilter, droneGain);

    // 2. Ventilation / Cooling flow (Filtered pink noise with LFO air sweep)
    const noiseBuffer = this.createNoiseBuffer(4);
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(450, this.ctx.currentTime);
    noiseFilter.Q.setValueAtTime(1.8, this.ctx.currentTime);

    // LFO for breathing ventilation flow
    const lfo = this.ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.2, this.ctx.currentTime); // slow breathing sweep
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(120, this.ctx.currentTime);
    lfo.connect(noiseFilter.frequency);
    lfo.start();

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.12, this.ctx.currentTime);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.duckingGain);

    noiseSource.start();
    this.nodes.push(noiseSource, noiseFilter, lfo, lfoGain, noiseGain);

    // 3. Periodic delicate quantum telemetry bleeps (sterilized high-frequency sine pings)
    const triggerPing = () => {
      if (!this.ctx || !this.duckingGain || this.currentType !== 'laboratory') return;
      try {
        const pingOsc = this.ctx.createOscillator();
        const pingGain = this.ctx.createGain();

        const freqs = [1860, 2480, 2790, 3120, 3720];
        const randomFreq = freqs[Math.floor(Math.random() * freqs.length)];
        pingOsc.type = 'sine';
        pingOsc.frequency.setValueAtTime(randomFreq, this.ctx.currentTime);

        const now = this.ctx.currentTime;
        pingGain.gain.setValueAtTime(0.001, now);
        pingGain.gain.exponentialRampToValueAtTime(0.04, now + 0.02);
        pingGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

        pingOsc.connect(pingGain);
        pingGain.connect(this.duckingGain);

        pingOsc.start(now);
        pingOsc.stop(now + 0.38);
      } catch (e) {}
    };

    const intervalId = window.setInterval(() => {
      if (Math.random() > 0.4) {
        triggerPing();
      }
    }, 2800);
    this.intervals.push(intervalId);
  }

  // --- Soundscape 2: Coffee Shop (Warm chatter murmur, room ambience & soft ceramic cup chinks) ---
  private buildCoffeeShop() {
    if (!this.ctx || !this.duckingGain) return;

    // 1. Diffused human murmur simulator: multi-pole bandpass noise shaped into human speech formant frequencies
    const noiseBuffer = this.createNoiseBuffer(5);
    const noiseSource1 = this.ctx.createBufferSource();
    noiseSource1.buffer = noiseBuffer;
    noiseSource1.loop = true;

    const formant1 = this.ctx.createBiquadFilter();
    formant1.type = 'bandpass';
    formant1.frequency.setValueAtTime(320, this.ctx.currentTime);
    formant1.Q.setValueAtTime(2.2, this.ctx.currentTime);

    const formant2 = this.ctx.createBiquadFilter();
    formant2.type = 'bandpass';
    formant2.frequency.setValueAtTime(780, this.ctx.currentTime);
    formant2.Q.setValueAtTime(2.8, this.ctx.currentTime);

    const murmurGain = this.ctx.createGain();
    murmurGain.gain.setValueAtTime(0.16, this.ctx.currentTime);

    noiseSource1.connect(formant1);
    noiseSource1.connect(formant2);
    formant1.connect(murmurGain);
    formant2.connect(murmurGain);
    murmurGain.connect(this.duckingGain);

    noiseSource1.start();
    this.nodes.push(noiseSource1, formant1, formant2, murmurGain);

    // 2. Warm low room acoustic resonance
    const roomTone = this.ctx.createOscillator();
    roomTone.type = 'triangle';
    roomTone.frequency.setValueAtTime(145, this.ctx.currentTime);

    const roomFilter = this.ctx.createBiquadFilter();
    roomFilter.type = 'lowpass';
    roomFilter.frequency.setValueAtTime(200, this.ctx.currentTime);

    const roomGain = this.ctx.createGain();
    roomGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    roomTone.connect(roomFilter);
    roomFilter.connect(roomGain);
    roomGain.connect(this.duckingGain);

    roomTone.start();
    this.nodes.push(roomTone, roomFilter, roomGain);

    // 3. Occasional subtle porcelain ceramic cup chinks
    const triggerChink = () => {
      if (!this.ctx || !this.duckingGain || this.currentType !== 'coffee-shop') return;
      try {
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();

        const baseF = 2100 + Math.random() * 800;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseF, this.ctx.currentTime);

        const now = this.ctx.currentTime;
        oscGain.gain.setValueAtTime(0.001, now);
        oscGain.gain.exponentialRampToValueAtTime(0.03, now + 0.015);
        oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

        osc.connect(oscGain);
        oscGain.connect(this.duckingGain);

        osc.start(now);
        osc.stop(now + 0.2);
      } catch (e) {}
    };

    const intervalId = window.setInterval(() => {
      if (Math.random() > 0.45) {
        triggerChink();
        // Occasionally double-clink
        if (Math.random() > 0.6) {
          setTimeout(triggerChink, 120);
        }
      }
    }, 4200);
    this.intervals.push(intervalId);
  }

  // --- Soundscape 3: Neon Rain (Continuous rainfall with distant rolling low thunder) ---
  private buildNeonRain() {
    if (!this.ctx || !this.duckingGain) return;

    const noiseBuffer = this.createNoiseBuffer(5);
    const rainSource = this.ctx.createBufferSource();
    rainSource.buffer = noiseBuffer;
    rainSource.loop = true;

    // Highpass + notch for rain on glass
    const rainFilter = this.ctx.createBiquadFilter();
    rainFilter.type = 'highpass';
    rainFilter.frequency.setValueAtTime(850, this.ctx.currentTime);

    const rainGain = this.ctx.createGain();
    rainGain.gain.setValueAtTime(0.18, this.ctx.currentTime);

    rainSource.connect(rainFilter);
    rainFilter.connect(rainGain);
    rainGain.connect(this.duckingGain);

    rainSource.start();
    this.nodes.push(rainSource, rainFilter, rainGain);

    // Distant thunder simulator
    const triggerThunder = () => {
      if (!this.ctx || !this.duckingGain || this.currentType !== 'neon-rain') return;
      try {
        const thunSource = this.ctx.createBufferSource();
        thunSource.buffer = noiseBuffer;
        
        const thunFilter = this.ctx.createBiquadFilter();
        thunFilter.type = 'lowpass';
        thunFilter.frequency.setValueAtTime(75, this.ctx.currentTime);

        const thunGain = this.ctx.createGain();
        const now = this.ctx.currentTime;
        const dur = 4.0;

        thunGain.gain.setValueAtTime(0.001, now);
        thunGain.gain.linearRampToValueAtTime(0.22, now + 1.2);
        thunGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        thunSource.connect(thunFilter);
        thunFilter.connect(thunGain);
        thunGain.connect(this.duckingGain);

        thunSource.start(now);
        thunSource.stop(now + dur);
      } catch (e) {}
    };

    const intervalId = window.setInterval(() => {
      if (Math.random() > 0.6) {
        triggerThunder();
      }
    }, 7500);
    this.intervals.push(intervalId);
  }

  // --- Soundscape 4: Deep Space (Cosmic pad & orbital drone) ---
  private buildDeepSpace() {
    if (!this.ctx || !this.duckingGain) return;

    const chords = [65.41, 98.0, 130.81, 196.0]; // C2, G2, C3, G3
    chords.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq + (idx * 0.4), this.ctx!.currentTime);

      const filter = this.ctx!.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(340, this.ctx!.currentTime);

      const gain = this.ctx!.createGain();
      gain.gain.setValueAtTime(0.07, this.ctx!.currentTime);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.duckingGain!);

      osc.start();
      this.nodes.push(osc, filter, gain);
    });
  }

  private createNoiseBuffer(durationSeconds: number): AudioBuffer {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
    }
    const sampleRate = this.ctx.sampleRate;
    const bufferSize = sampleRate * durationSeconds;
    const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    let lastOut = 0.0;
    // Pink noise approximation for softer, more natural acoustics
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5; // Gain compensation
    }
    return buffer;
  }
}

export const soundscapeService = new SoundscapeEngine();
