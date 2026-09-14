import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Persona } from '../types/persona';
import { getVoiceMetadata } from '../constants/voices';
import { voicePreviewService } from '../services/voice-preview-service';
import { playArmorClick, playAwakenChord, playWhoosh } from '../lib/audio-utils';
import {
  Workflow,
  MessageSquare,
  ShieldAlert,
  Brain,
  Sparkles,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Radio,
  Sliders,
  ExternalLink,
  Shield,
  Loader2,
  PhoneCall,
  Award,
  Cpu,
  Bot,
  ChevronDown,
  SlidersHorizontal,
  Layers,
  LayoutGrid,
  Info,
  RotateCcw,
  Sparkle
} from 'lucide-react';
import { OrbitalFloorCanvas } from './OrbitalFloorCanvas';
import { AutonomousRouterBar } from './AutonomousRouterBar';

export interface CamelotCarouselProps {
  personas: Persona[];
  selectedPersona: Persona;
  onSelectPersona: (persona: Persona) => void;
  isConnected: boolean;
  isConnecting: boolean;
  onConnect?: () => void;
  // Optional system modal / drawer toggles
  showLiveChat?: boolean;
  onToggleLiveChat?: () => void;
  showBlastHud?: boolean;
  onToggleBlastHud?: () => void;
  onOpenDiagnostics?: () => void;
  onOpenVoiceStudio?: () => void;
  onOpenTelephony?: () => void;
  onOpenLicense?: () => void;
  onOpenArtemis?: () => void;
  onOpenBlastDag?: () => void;
  onOpenTriage?: () => void;
  onCloseAllModals?: () => void;
  userFriendlyMode?: boolean;
  onToggleUserFriendlyMode?: (friendly: boolean) => void;
  latestVoiceTranscript?: string;
}

const numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

export function CamelotCarousel({
  personas,
  selectedPersona,
  onSelectPersona,
  isConnected,
  isConnecting,
  onConnect,
  showLiveChat = false,
  onToggleLiveChat,
  showBlastHud = false,
  onToggleBlastHud,
  onOpenDiagnostics,
  onOpenVoiceStudio,
  onOpenTelephony,
  onOpenLicense,
  onOpenArtemis,
  onOpenBlastDag,
  onOpenTriage,
  onCloseAllModals,
  userFriendlyMode = true,
  onToggleUserFriendlyMode,
  latestVoiceTranscript
}: CamelotCarouselProps) {
  const [showProToolsMenu, setShowProToolsMenu] = useState(false);
  const totalCount = personas.length;
  const currentIndex = personas.findIndex(p => p.id === selectedPersona.id);
  const index = currentIndex >= 0 ? currentIndex : 0;
  const activeKnight = personas[index] || personas[0];
  const activeVoiceMeta = useMemo(() => getVoiceMetadata(activeKnight.voice), [activeKnight.voice]);

  // Persistent settings
  const [pitch, setPitch] = useState<number>(() => {
    if (typeof window === 'undefined') return 0.85;
    const saved = localStorage.getItem('camelot_pitch_' + activeKnight.id);
    return saved ? parseFloat(saved) : 0.85;
  });

  const [rate, setRate] = useState<number>(() => {
    if (typeof window === 'undefined') return 0.90;
    const saved = localStorage.getItem('camelot_rate_' + activeKnight.id);
    return saved ? parseFloat(saved) : 0.90;
  });

  const [voiceEngine, setVoiceEngine] = useState<'gemini' | 'device'>(() => {
    if (typeof window === 'undefined') return 'gemini';
    return (localStorage.getItem('camelot_voice_engine') as 'gemini' | 'device') || 'gemini';
  });

  const [hapticAudio, setHapticAudio] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('camelot_haptic_audio') !== 'false';
  });

  const [manualReduced, setManualReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('camelot_reduced_motion') === 'true';
  });

  const [sampleText, setSampleText] = useState<string>(() => {
    return activeKnight.signatureQuote || activeVoiceMeta.sampleQuote;
  });

  const [selectedDeviceVoice, setSelectedDeviceVoice] = useState<string>('');
  const [deviceVoices, setDeviceVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [playbackStatus, setPlaybackStatus] = useState<string>('Ready to preview with Gemini Neural Studio or Browser speech.');
  const [durationText, setDurationText] = useState<string>('—');
  const [announcement, setAnnouncement] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Card mouse tilt states for selected card
  const [cardTilt, setCardTilt] = useState<{ x: number; y: number; shineX: number; shineY: number }>({
    x: 0,
    y: 0,
    shineX: 50,
    shineY: 50
  });

  // UI/UX View Mode & 3D Interactive States
  const [viewMode, setViewMode] = useState<'carousel' | 'matrix'>('carousel');
  const [isCardFlipped, setIsCardFlipped] = useState<boolean>(false);
  const wheelTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const carouselRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  const suppressClickRef = useRef<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startedTimeRef = useRef<number>(0);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const sequenceRef = useRef<number>(0);

  // Load browser device voices with deduplication to prevent collisions
  const loadVoices = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      const seen = new Set<string>();
      const deduped: SpeechSynthesisVoice[] = [];
      for (const v of voices) {
        const id = `${v.voiceURI || v.name}:::${v.lang}:::${v.localService ? 'local' : 'remote'}`;
        if (!seen.has(id)) {
          seen.add(id);
          deduped.push(v);
        }
      }
      setDeviceVoices(deduped.length > 0 ? deduped : voices);
    }
  }, []);

  useEffect(() => {
    loadVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
      const t1 = setTimeout(loadVoices, 400);
      const t2 = setTimeout(loadVoices, 1400);
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [loadVoices]);

  // Update sample quote when active knight changes
  useEffect(() => {
    setSampleText(activeKnight.signatureQuote || activeVoiceMeta.sampleQuote);
    // Reload pitch and rate from persona or stored
    const savedPitch = localStorage.getItem('camelot_pitch_' + activeKnight.id);
    const savedRate = localStorage.getItem('camelot_rate_' + activeKnight.id);
    setPitch(savedPitch ? parseFloat(savedPitch) : 0.85);
    setRate(savedRate ? parseFloat(savedRate) : 0.90);
    // Reset card tilt
    setCardTilt({ x: 0, y: 0, shineX: 50, shineY: 50 });
  }, [activeKnight.id, activeKnight.signatureQuote, activeVoiceMeta.sampleQuote]);

  // Save tuning on change
  useEffect(() => {
    localStorage.setItem('camelot_pitch_' + activeKnight.id, pitch.toString());
    localStorage.setItem('camelot_rate_' + activeKnight.id, rate.toString());
    localStorage.setItem('camelot_voice_engine', voiceEngine);
    localStorage.setItem('camelot_haptic_audio', hapticAudio.toString());
    localStorage.setItem('camelot_reduced_motion', manualReduced.toString());
  }, [activeKnight.id, pitch, rate, voiceEngine, hapticAudio, manualReduced]);

  // Stop playback cleanup
  const stopPlayback = useCallback((announce = true) => {
    sequenceRef.current++;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    voicePreviewService.stop();
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    currentUtteranceRef.current = null;
    setIsSpeaking(false);
    setDurationText('—');
    if (announce) {
      setPlaybackStatus('Preview stopped. Your Knight remains selected.');
    }
  }, []);

  // Stop playback on unmount or page hide
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) stopPlayback(false);
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', () => stopPlayback(false));
    return () => {
      stopPlayback(false);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [stopPlayback]);

  // Select knight with bounds and feedback
  const selectKnight = useCallback((nextIndex: number, announce = true) => {
    const updated = (nextIndex + totalCount) % totalCount;
    if (updated === index) return;
    setIsCardFlipped(false);
    stopPlayback(false);
    const targetPersona = personas[updated];
    onSelectPersona(targetPersona);
    if (hapticAudio) {
      playArmorClick(1.0 + (updated % 6) * 0.05);
    }
    if (announce) {
      setAnnouncement(`${targetPersona.name}, ${targetPersona.voice}. Knight ${updated + 1} of ${totalCount}.`);
    }
    setPlaybackStatus(`Ready to preview ${targetPersona.name} with ${targetPersona.voice} voice.`);
  }, [index, totalCount, onSelectPersona, personas, hapticAudio, stopPlayback]);

  // Start speaking helper
  const markSpeaking = useCallback((token: number) => {
    if (token !== sequenceRef.current) return;
    setIsSpeaking(true);
    startedTimeRef.current = Date.now();
    setDurationText('00:00');
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedTimeRef.current) / 1000);
      const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
      const secs = String(elapsed % 60).padStart(2, '0');
      setDurationText(`${mins}:${secs}`);
    }, 250);
  }, []);

  const finishSpeaking = useCallback((token: number, message: string) => {
    if (token !== sequenceRef.current) return;
    stopPlayback(false);
    setPlaybackStatus(message);
  }, [stopPlayback]);

  // Awaken Voice Action
  const handleAwaken = async () => {
    if (isSpeaking) {
      stopPlayback(true);
      return;
    }

    const textToSpeak = sampleText.trim();
    if (!textToSpeak) {
      setPlaybackStatus('Enter some preview text first.');
      return;
    }

    stopPlayback(false);
    const token = ++sequenceRef.current;
    if (hapticAudio) {
      playAwakenChord();
    }

    // Check if custom voice snippet exists on persona
    if (activeKnight.baseVoiceSampleUrl) {
      try {
        setPlaybackStatus(`Playing custom reference voice for ${activeKnight.name}...`);
        const audio = new Audio(activeKnight.baseVoiceSampleUrl);
        currentAudioRef.current = audio;
        audio.onplaying = () => markSpeaking(token);
        audio.onended = () => finishSpeaking(token, 'Preview complete. Your Knight is selected.');
        audio.onerror = () => {
          fallbackSpeech(token, textToSpeak);
        };
        await audio.play();
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        fallbackSpeech(token, textToSpeak);
        return;
      }
    }

    // Engine Mode: Gemini Neural Studio vs Device Browser Speech
    if (voiceEngine === 'gemini') {
      try {
        setPlaybackStatus(`Synthesizing Gemini Neural Studio TTS (${activeKnight.voice})...`);
        markSpeaking(token);
        await voicePreviewService.playPreview(activeKnight, textToSpeak);
        finishSpeaking(token, 'Gemini Neural preview complete.');
      } catch (err: any) {
        console.warn('Gemini TTS fallback to browser speech:', err);
        setPlaybackStatus('Gemini endpoint unreachable. Falling back to device speech...');
        fallbackSpeech(token, textToSpeak);
      }
    } else {
      fallbackSpeech(token, textToSpeak);
    }
  };

  const fallbackSpeech = (token: number, text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      finishSpeaking(token, 'Speech preview is unavailable in this browser.');
      return;
    }

    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    currentUtteranceRef.current = utterance;

    // Find voice
    const matchedVoice =
      deviceVoices.find(v => v.voiceURI === selectedDeviceVoice || v.name === selectedDeviceVoice) ||
      deviceVoices.find(v => v.default && /^en/i.test(v.lang)) ||
      deviceVoices.find(v => /^en/i.test(v.lang));

    if (matchedVoice) {
      utterance.voice = matchedVoice;
      utterance.lang = matchedVoice.lang;
    } else {
      utterance.lang = 'en-US';
    }

    utterance.pitch = pitch;
    utterance.rate = rate;

    utterance.onstart = () => {
      markSpeaking(token);
      setPlaybackStatus(`Previewing ${activeKnight.name} with ${matchedVoice?.name || 'browser voice'}.`);
    };

    utterance.onend = () => {
      finishSpeaking(token, 'Preview complete. Your Knight is selected.');
    };

    utterance.onerror = (e) => {
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      finishSpeaking(token, 'Voice playback was blocked or encountered an issue. Tap Awaken again.');
    };

    try {
      synth.resume();
      synth.speak(utterance);
    } catch {
      finishSpeaking(token, 'Browser speech synthesis failed to start.');
    }
  };

  // Keyboard navigation on Carousel
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      selectKnight(index + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      selectKnight(index - 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      selectKnight(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      selectKnight(totalCount - 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleAwaken();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      stopPlayback(true);
    }
  };

  // Global Hotkey navigation
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key >= '1' && e.key <= '9') {
        const targetIdx = parseInt(e.key, 10) - 1;
        if (targetIdx < totalCount) {
          e.preventDefault();
          selectKnight(targetIdx);
        }
      } else if (e.code === 'Space') {
        e.preventDefault();
        handleAwaken();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        setIsCardFlipped(prev => !prev);
        if (hapticAudio) playArmorClick(1.2);
      } else if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        setViewMode(prev => (prev === 'carousel' ? 'matrix' : 'carousel'));
        if (hapticAudio) playArmorClick(1.1);
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        onConnect?.();
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        onToggleBlastHud?.();
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        onOpenTelephony?.();
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        onOpenLicense?.();
      } else if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        onOpenArtemis?.();
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        onOpenDiagnostics?.();
      } else if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        onOpenTriage?.();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [totalCount, selectKnight, handleAwaken, onConnect, onToggleBlastHud, onOpenTelephony, onOpenLicense, onOpenArtemis, onOpenDiagnostics, onOpenTriage]);

  // Pointer drag & mouse tilt handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary || e.button !== 0) return;
    pointerRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
    suppressClickRef.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    // If dragging
    if (pointerRef.current && e.pointerId === pointerRef.current.id) {
      const dx = e.clientX - pointerRef.current.x;
      const dy = e.clientY - pointerRef.current.y;
      if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) {
        pointerRef.current.moved = true;
        setIsDragging(true);
        if (carouselRef.current && !carouselRef.current.hasPointerCapture(e.pointerId)) {
          carouselRef.current.setPointerCapture(e.pointerId);
        }
      }
      return;
    }

    // Interactive 3D Card Mouse Tilt (Only for mouse and not reduced motion)
    if (e.pointerType !== 'mouse' || manualReduced) return;
    const carouselEl = carouselRef.current;
    if (!carouselEl) return;
    const rect = carouselEl.getBoundingClientRect();
    const x = Math.max(-0.5, Math.min(0.5, (e.clientX - rect.left) / rect.width - 0.5));
    const y = Math.max(-0.5, Math.min(0.5, (e.clientY - rect.top) / rect.height - 0.5));
    setCardTilt({
      x: -y * 8,
      y: x * 10,
      shineX: 50 + x * 80,
      shineY: 50 + y * 80
    });
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerRef.current || e.pointerId !== pointerRef.current.id) return;
    const dx = e.clientX - pointerRef.current.x;
    const dy = e.clientY - pointerRef.current.y;
    const changed = pointerRef.current.moved && Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy) * 1.2;
    suppressClickRef.current = pointerRef.current.moved;

    if (carouselRef.current && carouselRef.current.hasPointerCapture(e.pointerId)) {
      carouselRef.current.releasePointerCapture(e.pointerId);
    }
    pointerRef.current = null;
    setIsDragging(false);

    if (changed) {
      if (hapticAudio) playWhoosh();
      selectKnight(index + (dx < 0 ? 1 : -1));
    }
    setTimeout(() => {
      suppressClickRef.current = false;
    }, 80);
  };

  const handlePointerLeave = () => {
    setCardTilt({ x: 0, y: 0, shineX: 50, shineY: 50 });
  };

  // Horizontal mouse wheel navigation
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (viewMode !== 'carousel') return;
    if (Math.abs(e.deltaX) > 18 || Math.abs(e.deltaY) > 28) {
      if (wheelTimeoutRef.current) return;
      const dir = (e.deltaX > 0 || e.deltaY > 0) ? 1 : -1;
      selectKnight(index + dir);
      wheelTimeoutRef.current = setTimeout(() => {
        wheelTimeoutRef.current = null;
      }, 220);
    }
  };

  // Generate 52 waveform procedural heights
  const waveformBars = useMemo(() => {
    return Array.from({ length: 52 }, (_, i) => {
      const h = 10 + Math.abs(Math.sin(i * 1.7) * Math.sin(i * 0.33)) * 43;
      return {
        height: `${h}px`,
        delay: `${-(i % 9) * 0.11}s`
      };
    });
  }, []);

  // Card math geometry based on step width
  const renderCardStyle = (i: number) => {
    let diff = (i - index + totalCount) % totalCount;
    if (diff > totalCount / 2) diff -= totalCount;
    const distance = Math.abs(diff);
    const step = 148;
    const x = diff === 0 ? 0 : Math.sign(diff) * (step + (distance - 1) * 110);
    const y = distance === 0 ? -6 : distance === 1 ? 20 : 34;
    const z = distance === 0 ? 98 : -95 - distance * 78;
    const angle = diff === 0 ? 0 : Math.sign(diff) * -26;
    const opacity = distance >= 4 ? 0 : distance === 3 ? 0.35 : distance === 2 ? 0.68 : distance === 1 ? 0.92 : 1;
    const zIndex = 20 - distance;
    const pointerEvents = distance >= 3 ? 'none' : 'auto';

    return {
      '--x': `${x}px`,
      '--y': `${y}px`,
      '--z': `${z}px`,
      '--angle': `${angle}deg`,
      '--opacity': opacity.toString(),
      '--zindex': zIndex.toString(),
      pointerEvents: pointerEvents as any
    } as React.CSSProperties;
  };

  return (
    <div className={`citadel-root ${manualReduced ? 'motion-reduced' : ''} ${isSpeaking ? 'is-speaking' : ''}`}>
      {/* Skip Link */}
      <a className="skip-link" href="#voice-controls">
        Skip to voice controls
      </a>

      {/* Header */}
      <header className="header" role="banner">
        <a className="brand" href="/" aria-label="Knight Armor home">
          <img src="/assets/crest.svg" alt="" width={36} height={42} />
          <span>
            KNIGHT ARMOR
            <small>THE VOICE CITADEL</small>
          </span>
        </a>

        <div className="header-center">
          <span className="tiny-diamond" />
          CAMELOT <span className="slash">/</span> MULTIVOICE ROUTER
        </div>

        <div className="flex items-center gap-3">
          {/* Audio Haptic Toggle */}
          <button
            type="button"
            className="text-button text-xs hidden sm:inline-flex"
            onClick={() => {
              const next = !hapticAudio;
              setHapticAudio(next);
              if (next) playArmorClick(1.2);
            }}
            title="Toggle procedural mechanical acoustic clicks and armor chords"
            aria-pressed={hapticAudio}
          >
            {hapticAudio ? <Volume2 className="w-3.5 h-3.5 text-amber-400" /> : <VolumeX className="w-3.5 h-3.5 text-zinc-500" />}
            <span>Haptics: {hapticAudio ? 'ON' : 'MUTED'}</span>
          </button>

          {/* Mode Switcher: Friendly Auto vs Pro Developer */}
          {onToggleUserFriendlyMode && (
            <button
              type="button"
              className={`text-button text-xs flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${
                userFriendlyMode 
                  ? 'text-emerald-300 border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20' 
                  : 'text-zinc-400 border border-zinc-700 bg-zinc-800/40 hover:text-zinc-200'
              }`}
              onClick={() => onToggleUserFriendlyMode(!userFriendlyMode)}
              title={userFriendlyMode ? "Currently in Smart Friendly Auto mode. Click to switch to Pro mode." : "Currently in Pro Developer mode. Click to switch to Smart Friendly mode."}
            >
              <Bot className="w-3.5 h-3.5 text-emerald-400" />
              <span>{userFriendlyMode ? 'Smart Auto UI' : 'Mode: Pro'}</span>
            </button>
          )}

          {/* If userFriendlyMode is ON, collapse developer tools into a clean Pro Tools popover */}
          {userFriendlyMode ? (
            <div className="relative">
              <button
                type="button"
                className="text-button text-xs text-[#dfc486] hover:text-[#f3ddaa] flex items-center gap-1.5 border border-[#dfc486]/30 px-2.5 py-1 rounded bg-[#dfc486]/5"
                onClick={() => setShowProToolsMenu(!showProToolsMenu)}
                title="Open Pro Engineering Tools menu"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Pro Tools</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showProToolsMenu ? 'rotate-180' : ''}`} />
              </button>

              {showProToolsMenu && (
                <div 
                  className="absolute right-0 top-full mt-2 w-56 rounded-lg bg-[#0d121c] border border-zinc-700/80 shadow-2xl p-1.5 z-50 text-xs font-mono backdrop-blur-md"
                  onClick={() => setShowProToolsMenu(false)}
                >
                  <div className="px-2 py-1 text-[10px] text-zinc-500 font-bold uppercase border-b border-zinc-800 mb-1 flex items-center justify-between">
                    <span>Manual Subsystems</span>
                    <span className="text-zinc-600">Hotkeys</span>
                  </div>
                  {onOpenTelephony && (
                    <button
                      type="button"
                      className="w-full text-left px-2.5 py-1.5 rounded hover:bg-zinc-800 text-cyan-300 flex items-center justify-between transition-colors"
                      onClick={onOpenTelephony}
                    >
                      <span className="flex items-center gap-2">
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span>Telephony</span>
                      </span>
                      <kbd className="text-[10px] text-zinc-400 bg-zinc-900 border border-zinc-800 px-1.5 rounded">T</kbd>
                    </button>
                  )}
                  {onOpenLicense && (
                    <button
                      type="button"
                      className="w-full text-left px-2.5 py-1.5 rounded hover:bg-zinc-800 text-amber-300 flex items-center justify-between transition-colors"
                      onClick={onOpenLicense}
                    >
                      <span className="flex items-center gap-2">
                        <Award className="w-3.5 h-3.5" />
                        <span>Vocal License</span>
                      </span>
                      <kbd className="text-[10px] text-zinc-400 bg-zinc-900 border border-zinc-800 px-1.5 rounded">L</kbd>
                    </button>
                  )}
                  {onOpenArtemis && (
                    <button
                      type="button"
                      className="w-full text-left px-2.5 py-1.5 rounded hover:bg-zinc-800 text-blue-300 flex items-center justify-between transition-colors"
                      onClick={onOpenArtemis}
                    >
                      <span className="flex items-center gap-2">
                        <Cpu className="w-3.5 h-3.5" />
                        <span>Artemis Automation</span>
                      </span>
                      <kbd className="text-[10px] text-zinc-400 bg-zinc-900 border border-zinc-800 px-1.5 rounded">A</kbd>
                    </button>
                  )}
                  {onToggleBlastHud && (
                    <button
                      type="button"
                      className="w-full text-left px-2.5 py-1.5 rounded hover:bg-zinc-800 text-amber-400 flex items-center justify-between transition-colors"
                      onClick={onToggleBlastHud}
                    >
                      <span className="flex items-center gap-2">
                        <Workflow className="w-3.5 h-3.5" />
                        <span>B.L.A.S.T. DAG</span>
                      </span>
                      <kbd className="text-[10px] text-zinc-400 bg-zinc-900 border border-zinc-800 px-1.5 rounded">B</kbd>
                    </button>
                  )}
                  {onOpenVoiceStudio && (
                    <button
                      type="button"
                      className="w-full text-left px-2.5 py-1.5 rounded hover:bg-zinc-800 text-emerald-300 flex items-center justify-between transition-colors"
                      onClick={onOpenVoiceStudio}
                    >
                      <span className="flex items-center gap-2">
                        <Mic className="w-3.5 h-3.5" />
                        <span>Voice Studio</span>
                      </span>
                    </button>
                  )}
                  {onOpenDiagnostics && (
                    <button
                      type="button"
                      className="w-full text-left px-2.5 py-1.5 rounded hover:bg-zinc-800 text-zinc-400 flex items-center justify-between transition-colors"
                      onClick={onOpenDiagnostics}
                    >
                      <span className="flex items-center gap-2">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Diagnostics</span>
                      </span>
                      <kbd className="text-[10px] text-zinc-400 bg-zinc-900 border border-zinc-800 px-1.5 rounded">D</kbd>
                    </button>
                  )}
                  {onOpenTriage && (
                    <button
                      type="button"
                      className="w-full text-left px-2.5 py-1.5 rounded hover:bg-zinc-800 text-emerald-400 flex items-center justify-between transition-colors"
                      onClick={onOpenTriage}
                    >
                      <span className="flex items-center gap-2">
                        <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Self-Triage</span>
                      </span>
                      <kbd className="text-[10px] text-emerald-400 bg-zinc-900 border border-emerald-900/50 px-1.5 rounded">E</kbd>
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            // Pro Mode: Show all buttons across header
            <>
              {onOpenVoiceStudio && (
                <button
                  type="button"
                  className="text-button text-xs hidden md:inline-flex text-amber-300/80 hover:text-amber-200"
                  onClick={onOpenVoiceStudio}
                  title="Open Knight Voice Studio"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Voice Studio</span>
                </button>
              )}
              {onOpenTriage && (
                <button
                  type="button"
                  className="text-button text-xs hidden lg:inline-flex text-emerald-400 hover:text-emerald-300"
                  onClick={onOpenTriage}
                  title="Open Self-Error Triage Engine (NanoClaw + NanoBot) [Hotkey: E]"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Self-Triage [E]</span>
                </button>
              )}
              {onToggleBlastHud && (
                <button
                  type="button"
                  className={`text-button text-xs hidden lg:inline-flex ${showBlastHud ? 'text-amber-300' : ''}`}
                  onClick={onToggleBlastHud}
                  title="Inspect System 2 B.L.A.S.T. Kinetic Protocol DAG"
                >
                  <Workflow className="w-3.5 h-3.5" />
                  <span>B.L.A.S.T. DAG</span>
                </button>
              )}
              {onOpenTelephony && (
                <button
                  type="button"
                  className="text-button text-xs hidden lg:inline-flex text-cyan-300/80 hover:text-cyan-200"
                  onClick={onOpenTelephony}
                  title="Open Sovereign Telephony & SIP Trunking [Hotkey: T]"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Telephony [T]</span>
                </button>
              )}
              {onOpenLicense && (
                <button
                  type="button"
                  className="text-button text-xs hidden md:inline-flex text-amber-300/80 hover:text-amber-200"
                  onClick={onOpenLicense}
                  title="Open Sovereign Vocal License & Provenance Engine [Hotkey: L]"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Vocal License [L]</span>
                </button>
              )}
              {onOpenArtemis && (
                <button
                  type="button"
                  className="text-button text-xs hidden xl:inline-flex text-cyan-400 hover:text-cyan-300"
                  onClick={onOpenArtemis}
                  title="Open Google Artemis Autonomous Device Automation & Benchmark [Hotkey: A]"
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Artemis [A]</span>
                </button>
              )}
              {onOpenDiagnostics && (
                <button
                  type="button"
                  className="text-button text-xs hidden xl:inline-flex text-zinc-400 hover:text-zinc-200"
                  onClick={onOpenDiagnostics}
                  title="Open System Diagnostics & Tailscale Status"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Diagnostics</span>
                </button>
              )}
            </>
          )}

          {/* Private Sanctuary Badge */}
          <span className="private-badge" title="Sovereign bare-metal environment with zero external telemetry">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="6" y="10" width="12" height="10" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
            <span>Private sanctuary</span>
          </span>
        </div>
      </header>

      {/* Autonomous Embedded Router Deck */}
      <AutonomousRouterBar
        selectedPersona={selectedPersona}
        personas={personas}
        onSelectPersona={onSelectPersona}
        onOpenTelephony={onOpenTelephony || (() => {})}
        onOpenLicense={onOpenLicense || (() => {})}
        onOpenArtemis={onOpenArtemis || (() => {})}
        onOpenBlastDag={onOpenBlastDag || onToggleBlastHud || (() => {})}
        onOpenVoiceStudio={onOpenVoiceStudio || (() => {})}
        onCloseAllModals={onCloseAllModals}
        userFriendlyMode={userFriendlyMode}
        onToggleUserFriendlyMode={onToggleUserFriendlyMode || (() => {})}
        latestVoiceTranscript={latestVoiceTranscript}
      />

      {/* Main Content */}
      <main className="citadel-main">
        {/* Intro Section */}
        <section className="intro" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">
              <span /> THE ROUND TABLE AWAITS
            </p>
            <h1 id="page-title" className="citadel-h1">
              Every voice. <em>A presence.</em>
            </h1>
            <p className="intro-copy">Choose your armor. Find your resonance. Awaken your Knight.</p>
          </div>
          <div className="intro-mark">
            <span>{numerals[totalCount - 1] || `${totalCount}`}</span>
            <p>
              VOICES.
              <br />
              ONE CITADEL.
            </p>
          </div>
        </section>

        {/* The Citadel Armory Experience */}
        <section className="citadel" aria-label="Knight voice picker">
          {/* Top Bar */}
          <div className="citadel-top">
            <span>
              <i className={`status-dot ${isConnected ? 'active' : ''}`} />
              ARMORY <span className="muted">/ VOICE SELECTION</span>
            </span>
            <span className="top-right">
              {String(index + 1).padStart(2, '0')} <span className="muted">—</span> {numerals[totalCount - 1] || `${totalCount}`}{' '}
              <span className="tiny-diamond" />
            </span>
          </div>

          {/* Experience Grid: Stage + Voice Panel */}
          <div className="experience">
            {/* Left Stage */}
            <div className="stage-wrap">
              {/* Stage Heading with View Mode & Motion Toggles */}
              <div className="stage-heading flex items-center justify-between gap-2">
                <span className="eyebrow">CHOOSE YOUR KNIGHT</span>
                
                <div className="flex items-center gap-2">
                  {/* View Mode Switcher: 3D Stage vs Armory Grid */}
                  <div className="inline-flex p-0.5 rounded bg-black/60 border border-zinc-800">
                    <button
                      type="button"
                      className={`px-2.5 py-1 rounded text-xs flex items-center gap-1.5 transition-all ${
                        viewMode === 'carousel'
                          ? 'bg-amber-500/20 text-amber-300 font-medium border border-amber-500/40 shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                      onClick={() => setViewMode('carousel')}
                      title="3D Spatial Carousel Stage (Hotkey: V)"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>3D Stage</span>
                    </button>
                    <button
                      type="button"
                      className={`px-2.5 py-1 rounded text-xs flex items-center gap-1.5 transition-all ${
                        viewMode === 'matrix'
                          ? 'bg-cyan-500/20 text-cyan-300 font-medium border border-cyan-500/40 shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                      onClick={() => setViewMode('matrix')}
                      title="Armory Matrix Grid (Hotkey: V)"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>Armory Grid</span>
                    </button>
                  </div>

                  <button
                    id="motion-toggle"
                    className="text-button"
                    aria-pressed={manualReduced}
                    onClick={() => setManualReduced(!manualReduced)}
                    title={manualReduced ? 'Enable 3D animation' : 'Reduce 3D animation'}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5" />
                    </svg>
                    <span>{manualReduced ? 'Reduced motion' : 'Full motion'}</span>
                  </button>
                </div>
              </div>

              {/* Dynamic View: Armory Grid Matrix vs 3D Carousel Stage */}
              {viewMode === 'matrix' ? (
                <div className="p-4 sm:p-5 overflow-y-auto max-h-[520px]">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800/80">
                    <div>
                      <h3 className="text-xs font-mono font-bold text-amber-300 tracking-wider flex items-center gap-2">
                        <span>SOVEREIGN BIO-KINETIC ROSTER</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          {totalCount} KNIGHTS
                        </span>
                      </h3>
                      <p className="text-[11px] text-zinc-400 mt-0.5">Click any knight to equip armor and calibrate voice signature.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {personas.map((p, pIdx) => {
                      const isSelected = pIdx === index;
                      const crop = p.crop || [505, 111, 222, 406];
                      const [cropX, cropY, cropW, cropH] = crop;

                      return (
                        <div
                          key={`matrix-${p.id}-${pIdx}`}
                          onClick={() => selectKnight(pIdx)}
                          className={`group relative rounded-xl border p-3 transition-all duration-300 cursor-pointer overflow-hidden ${
                            isSelected
                              ? 'bg-gradient-to-b from-[#1b1610] to-[#0a0f16] border-[#dfc486] shadow-[0_0_20px_rgba(223,196,134,0.25)]'
                              : 'bg-[#0b0f15]/90 border-zinc-800 hover:border-zinc-600 hover:bg-[#111721] hover:translate-y-[-2px]'
                          }`}
                        >
                          {/* Top Row: Roman Numeral, Name, Voice */}
                          <div className="flex items-start justify-between gap-1 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-serif text-sm font-bold text-[#dfc486]">
                                {numerals[pIdx] || `${pIdx + 1}`}
                              </span>
                              <div>
                                <h4 className={`text-xs font-semibold ${isSelected ? 'text-[#f3ddaa]' : 'text-zinc-200 group-hover:text-white'}`}>
                                  {p.name}
                                </h4>
                                <div className="text-[9px] text-zinc-400 font-mono truncate max-w-[130px]">{p.role}</div>
                              </div>
                            </div>
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/60 border border-zinc-800 text-cyan-300">
                              {p.voice}
                            </span>
                          </div>

                          {/* Image preview */}
                          <div className="relative h-28 w-full rounded-lg overflow-hidden my-2 bg-black/60 border border-zinc-800/80">
                            {p.crop ? (
                              <img
                                src="/assets/knight-citadel.png"
                                alt={p.name}
                                className="absolute"
                                style={{
                                  width: `${(1280 / cropW) * 100}%`,
                                  height: `${(720 / cropH) * 100}%`,
                                  left: `${(-cropX / cropW) * 100}%`,
                                  top: `${(-cropY / cropH) * 100}%`
                                }}
                              />
                            ) : (
                              <img
                                src={p.backdropUrl || '/assets/knight-citadel.png'}
                                alt={p.name}
                                className="w-full h-full object-cover"
                              />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
                            <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between text-[9px] font-mono text-zinc-300">
                              <span className="truncate text-amber-200/90">{p.synthesisEngine ? p.synthesisEngine.split(' ')[0] : 'Gemini-Live'}</span>
                              {isSelected && (
                                <span className="text-amber-400 font-bold flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> EQUIPPED
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Quote snippet */}
                          <p className="text-[10px] text-zinc-400 line-clamp-2 italic mb-2">
                            "{p.signatureQuote || p.description}"
                          </p>

                          {/* Bottom Action row */}
                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-800/60">
                            <span className="text-[9px] font-mono text-zinc-500">
                              SLOT {p.armorSlot ?? pIdx}
                            </span>
                            <button
                              type="button"
                              className={`text-[10px] px-2 py-1 rounded transition-colors font-mono flex items-center gap-1 ${
                                isSelected && isSpeaking
                                  ? 'bg-amber-500 text-black font-bold'
                                  : 'bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700'
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isSelected) {
                                  selectKnight(pIdx);
                                }
                                setTimeout(() => handleAwaken(), 60);
                              }}
                            >
                              <Volume2 className="w-3 h-3" />
                              <span>{isSelected && isSpeaking ? 'Stop' : 'Audition'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* 3D Carousel Rotor */
                <div
                  id="carousel"
                  ref={carouselRef}
                  className={`carousel ${isDragging ? 'dragging' : ''}`}
                  tabIndex={0}
                  role="region"
                  aria-roledescription="carousel"
                  aria-label="Knight armor carousel"
                  aria-describedby="carousel-help"
                  onKeyDown={handleKeyDown}
                  onWheel={handleWheel}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={endDrag}
                  onPointerLeave={handlePointerLeave}
                >
                  {/* Visual Architecture & Spotlight */}
                  <div className="architecture" aria-hidden="true" />
                  <div className="spotlight" aria-hidden="true" />

                  {/* Orbital Concentric Floor with Reactive Particles */}
                  <div className="orbital-floor" aria-hidden="true">
                    <OrbitalFloorCanvas
                      isSpeaking={isSpeaking}
                      isConnected={isConnected}
                      reducedMotion={manualReduced}
                      activeColor="#dfc486"
                    />
                    <div className="floor-ring outer" />
                    <div className="floor-ring inner" />
                    <div className="floor-cross" />
                  </div>

                  {/* 3D Rotor of Armor Cards */}
                  <div id="rotor" className="rotor">
                    {personas.map((p, i) => {
                      const isSelected = i === index;
                      const crop = p.crop || [505, 111, 222, 406];
                      const [cropX, cropY, cropW, cropH] = crop;

                      return (
                        <div
                          key={`rotor-${p.id}-${i}`}
                          className={`armor-card ${isSelected ? 'selected' : ''}`}
                          style={renderCardStyle(i)}
                          data-index={i}
                          aria-hidden={!isSelected}
                          onClick={() => {
                            if (!suppressClickRef.current) selectKnight(i);
                          }}
                        >
                          {/* Acoustic Pulse Emitters when active Knight is speaking */}
                          {isSelected && (
                            <div className="acoustic-emitter" aria-hidden="true">
                              <div className="acoustic-ring" />
                              <div className="acoustic-ring" />
                              <div className="acoustic-ring" />
                            </div>
                          )}

                          <div
                            className="card-tilt"
                            style={
                              isSelected && !manualReduced
                                ? ({
                                    '--tilt-x': `${cardTilt.x}deg`,
                                    '--tilt-y': `${cardTilt.y}deg`
                                  } as React.CSSProperties)
                                : undefined
                            }
                          >
                            <div className={`card-flipper ${isSelected && isCardFlipped ? 'is-flipped' : ''}`}>
                              <div className="card-back" />
                              <div className="card-edge left" />
                              <div className="card-edge right" />

                              {/* Front Card Face */}
                              <div className="card-face">
                                <span className="card-number">{numerals[i] || `${i + 1}`}</span>

                                {/* 3D Flip Codex Button */}
                                {isSelected && (
                                  <button
                                    type="button"
                                    className="card-flip-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setIsCardFlipped(!isCardFlipped);
                                      if (hapticAudio) playArmorClick(1.25);
                                    }}
                                    title="Flip card for technical specifications & codex (Hotkey: F)"
                                    aria-label="Flip card for technical codex"
                                  >
                                    <Info className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                <div className="armor-art">
                                  {p.crop ? (
                                    <img
                                      src="/assets/knight-citadel.png"
                                      alt={p.name}
                                      draggable={false}
                                      style={{
                                        width: `${(1280 / cropW) * 100}%`,
                                        height: `${(720 / cropH) * 100}%`,
                                        left: `${(-cropX / cropW) * 100}%`,
                                        top: `${(-cropY / cropH) * 100}%`
                                      }}
                                    />
                                  ) : (
                                    <img
                                      src={p.backdropUrl || '/assets/knight-citadel.png'}
                                      alt={p.name}
                                      draggable={false}
                                      className="w-full h-full object-cover"
                                    />
                                  )}
                                </div>

                                <div
                                  className="card-shine"
                                  style={
                                    isSelected && !manualReduced
                                      ? ({
                                          '--shine-x': `${cardTilt.shineX}%`,
                                          '--shine-y': `${cardTilt.shineY}%`
                                        } as React.CSSProperties)
                                      : undefined
                                  }
                                />
                                <div className="card-label">
                                  {p.name}
                                  <small>{p.voice.toUpperCase()} &bull; {p.synthesisEngine ? p.synthesisEngine.split(' ')[0] : 'GEMINI'}</small>
                                </div>
                                <div className="selected-marker" />
                              </div>

                              {/* Back Card Face: Technical Codex */}
                              <div className="card-back-codex">
                                <div className="flex items-center justify-between border-b border-[#dfc486]/30 pb-2">
                                  <span className="text-[10px] font-mono text-[#dfc486] font-bold tracking-wider">
                                    KNIGHT CODEX &bull; {numerals[i] || `${i + 1}`}
                                  </span>
                                  <button
                                    type="button"
                                    className="text-[10px] font-mono text-zinc-400 hover:text-white px-1.5 py-0.5 rounded bg-zinc-800/80 border border-zinc-700"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setIsCardFlipped(false);
                                    }}
                                  >
                                    ✕ Close
                                  </button>
                                </div>

                                <div className="py-2 space-y-2 text-left">
                                  <div>
                                    <div className="text-xs font-serif font-bold text-[#f3ddaa]">{p.name}</div>
                                    <div className="text-[9px] text-[#88c5d7] font-mono">{p.role}</div>
                                  </div>

                                  <div className="p-1.5 rounded bg-black/60 border border-zinc-800 text-[9px] font-mono space-y-1">
                                    <div className="text-zinc-400 flex justify-between">
                                      <span>Voice Engine:</span>
                                      <span className="text-[#dfc486] font-bold truncate max-w-[105px]">
                                        {p.synthesisEngine || 'Gemini-Live-2.0'}
                                      </span>
                                    </div>
                                    <div className="text-zinc-400 flex justify-between">
                                      <span>Armor Slot:</span>
                                      <span className="text-cyan-300">Slot {p.armorSlot ?? i}</span>
                                    </div>
                                    <div className="text-zinc-400 flex justify-between">
                                      <span>Voice Timbre:</span>
                                      <span className="text-white">{p.voice}</span>
                                    </div>
                                  </div>

                                  <div className="text-[9px] text-zinc-300 line-clamp-3 italic">
                                    "{p.signatureQuote || p.description}"
                                  </div>
                                </div>

                                <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                                  <span className="text-[8px] text-zinc-500 font-mono">B.L.A.S.T. VERIFIED</span>
                                  <button
                                    type="button"
                                    className="text-[10px] text-[#dfc486] hover:text-[#f3ddaa] font-mono underline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setIsCardFlipped(false);
                                    }}
                                  >
                                    Flip Face ↺
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="stage-vignette" aria-hidden="true" />
                </div>
              )}

              {/* Nav controls & Position Indicator */}
              <div className="carousel-nav">
                <button
                  id="prev"
                  className="icon-button"
                  aria-label="Previous Knight"
                  onClick={() => selectKnight(index - 1)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m14 6-6 6 6 6" />
                  </svg>
                </button>
                <div className="position">
                  <span id="position">{String(index + 1).padStart(2, '0')}</span>
                  <span
                    className="position-line"
                    style={{
                      background: `linear-gradient(90deg, var(--gold) ${((index + 1) / totalCount) * 100}%, #48526644 ${((index + 1) / totalCount) * 100}%)`
                    }}
                  />
                  <span>{String(totalCount).padStart(2, '0')}</span>
                </div>
                <button
                  id="next"
                  className="icon-button"
                  aria-label="Next Knight"
                  onClick={() => selectKnight(index + 1)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m10 6 6 6-6 6" />
                  </svg>
                </button>
              </div>

              {/* Interactive Quick-Selector Dock */}
              <div className="carousel-dock-wrapper" aria-label="Quick knight selector">
                <div className="carousel-dock">
                  {personas.map((p, pIdx) => {
                    const isSelected = pIdx === index;
                    return (
                      <button
                        key={`dock-${p.id}-${pIdx}`}
                        type="button"
                        className={`dock-item ${isSelected ? 'active' : ''}`}
                        onClick={() => selectKnight(pIdx)}
                        title={`Select ${p.name} (${p.voice}) - Knight ${pIdx + 1}`}
                      >
                        <span className="dock-numeral">{numerals[pIdx] || `${pIdx + 1}`}</span>
                        <span className="truncate max-w-[80px]">{p.name.replace('Sir ', '')}</span>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <p id="carousel-help" className="carousel-help">
                Drag or scroll to rotate <span>·</span> <kbd>←</kbd> <kbd>→</kbd> navigate <span>·</span> <kbd>Space</kbd> awaken <span>·</span> <kbd>F</kbd> flip codex <span>·</span> <kbd>V</kbd> view mode
              </p>
            </div>

            {/* Right Voice Controls Panel */}
            <aside className="voice-panel" id="voice-controls" aria-labelledby="knight-name">
              <div className="panel-eyebrow">
                <span className="eyebrow">VOICE SIGNATURE</span>
                <span id="profile-number">KNIGHT {String(index + 1).padStart(2, '0')}</span>
              </div>

              <div className="knight-title">
                <h2 id="knight-name">
                  {activeKnight.name} <span>Ω</span>
                </h2>
                <span className="mini-crest" aria-hidden="true">
                  ♜
                </span>
              </div>

              <p id="knight-role" className="knight-role">
                {activeKnight.role}
              </p>
              <p id="knight-description" className="description">
                {activeKnight.description}
              </p>

              <div id="traits" className="traits">
                {(activeKnight.traits || ['Commanding', 'Resonant', 'Deliberate']).map((trait, tIdx) => (
                  <span key={`trait-${trait}-${tIdx}`}>{trait}</span>
                ))}
              </div>

              {/* Synthesis Engine Signature Badge */}
              <div className="flex items-center justify-between text-[10px] font-mono px-2.5 py-1.5 my-2 rounded bg-amber-500/10 border border-amber-500/25 text-amber-300 shadow-sm">
                <span className="text-zinc-400">Synthesis Signature:</span>
                <span className="font-bold text-[#dfc486] truncate max-w-[160px]">
                  {activeKnight.synthesisEngine || 'Gemini-Live-2.0-Flash'}
                </span>
              </div>

              {/* Voice Engine Mode Switcher */}
              <div className="flex items-center gap-1 my-2 p-0.5 bg-black/50 border border-zinc-700/60 rounded text-[10px]">
                <button
                  type="button"
                  className={`flex-1 py-1 rounded transition-colors text-center font-mono ${
                    voiceEngine === 'gemini'
                      ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  onClick={() => setVoiceEngine('gemini')}
                  title="Google Gemini 3.1 Flash Neural Studio TTS"
                >
                  Gemini Studio
                </button>
                <button
                  type="button"
                  className={`flex-1 py-1 rounded transition-colors text-center font-mono ${
                    voiceEngine === 'device'
                      ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  onClick={() => setVoiceEngine('device')}
                  title="Local Web Speech Synthesis API"
                >
                  Device Pitch
                </button>
              </div>

              {/* Waveform Panel */}
              <div className="wave-panel">
                <div className="wave-meta">
                  <span>
                    <i className="small-dot" />
                    <span id="voice-name">{activeKnight.voice.toUpperCase()}</span>
                  </span>
                  <span id="playback-label">
                    {isSpeaking ? 'PREVIEW PLAYING' : isConnected ? 'LIVE SESSION ACTIVE' : 'READY TO PREVIEW'}
                  </span>
                </div>

                <div id="waveform" className="waveform" aria-hidden="true">
                  {waveformBars.map((bar, barIdx) => (
                    <i
                      key={barIdx}
                      style={{
                        '--height': bar.height,
                        '--delay': bar.delay
                      } as React.CSSProperties}
                    />
                  ))}
                </div>

                <div className="wave-caption">
                  <span>{voiceEngine === 'gemini' ? 'GEMINI 3.1 FLASH TTS' : 'BROWSER VOICE PREVIEW'}</span>
                  <span id="duration">{durationText}</span>
                </div>
              </div>

              {/* Tuning Controls with Reset Option */}
              <div className="tuning">
                <div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="pitch">
                      Pitch <output id="pitch-value">{pitch.toFixed(2)}</output>
                    </label>
                  </div>
                  <input
                    id="pitch"
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.05"
                    value={pitch}
                    onChange={e => {
                      if (isSpeaking) stopPlayback(false);
                      setPitch(parseFloat(e.target.value));
                    }}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="rate">
                      Pace <output id="rate-value">{rate.toFixed(2)}×</output>
                    </label>
                    <button
                      type="button"
                      className="text-[9px] text-[#dfc486] hover:underline"
                      onClick={() => {
                        setPitch(0.85);
                        setRate(0.90);
                        if (hapticAudio) playArmorClick(1.0);
                      }}
                      title="Reset Pitch (0.85) and Pace (0.90) to Sovereign Standard"
                    >
                      Reset ↺
                    </button>
                  </div>
                  <input
                    id="rate"
                    type="range"
                    min="0.6"
                    max="1.4"
                    step="0.05"
                    value={rate}
                    onChange={e => {
                      if (isSpeaking) stopPlayback(false);
                      setRate(parseFloat(e.target.value));
                    }}
                  />
                </div>
              </div>

              {/* Quick Audition Prompt Selector */}
              <div className="my-2">
                <div className="text-[9px] font-mono uppercase tracking-wider text-zinc-400 mb-1 flex items-center justify-between">
                  <span>Quick Audition Prompts</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    className="px-2 py-1 rounded bg-black/60 hover:bg-zinc-800 border border-zinc-800 text-[10px] text-zinc-300 hover:text-amber-200 text-left truncate transition-colors"
                    onClick={() => {
                      setSampleText(activeKnight.signatureQuote || activeVoiceMeta.sampleQuote);
                      if (hapticAudio) playArmorClick(1.1);
                    }}
                    title="Load Signature Quote"
                  >
                    💬 Signature Quote
                  </button>
                  <button
                    type="button"
                    className="px-2 py-1 rounded bg-black/60 hover:bg-zinc-800 border border-zinc-800 text-[10px] text-zinc-300 hover:text-cyan-200 text-left truncate transition-colors"
                    onClick={() => {
                      setSampleText(`Anti-Gravity Forge telemetry initialized. Voice signature ${activeKnight.voice} locked at 48kHz.`);
                      if (hapticAudio) playArmorClick(1.1);
                    }}
                    title="Load Telemetry Briefing"
                  >
                    ⚡ Telemetry Brief
                  </button>
                </div>
              </div>

              {/* Awaken Button */}
              <button id="awaken" className="awaken" onClick={handleAwaken}>
                <svg id="play-icon" viewBox="0 0 24 24" aria-hidden="true">
                  {isSpeaking ? <path d="M6 6h12v12H6Z" /> : <path d="m9 5 10 7-10 7Z" />}
                </svg>
                <span>{isSpeaking ? 'Stop preview' : 'Awaken voice'}</span>
                <svg className="button-spark" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2v20M2 12h20m-16-6 12 12M6 18 18 6" />
                </svg>
              </button>

              {/* Optional Gemini Live Two-Way Session Toggle */}
              {onConnect && (
                <button
                  type="button"
                  className={`w-full mt-2 py-2 px-3 rounded border text-xs flex items-center justify-center gap-2 transition-all ${
                    isConnected
                      ? 'bg-red-500/20 text-red-300 border-red-500/40 hover:bg-red-500/30'
                      : isConnecting
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-zinc-900/80 text-zinc-300 border-zinc-700 hover:border-zinc-500 hover:text-white'
                  }`}
                  onClick={onConnect}
                  disabled={isConnecting}
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                      <span>Connecting Live Router...</span>
                    </>
                  ) : isConnected ? (
                    <>
                      <MicOff className="w-3.5 h-3.5 text-red-400" />
                      <span>Disconnect Live Audio Session</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5 text-amber-400" />
                      <span>Enter Live Multivoice Session</span>
                    </>
                  )}
                </button>
              )}

              {/* Playback Status */}
              <p id="playback-status" className="playback-status" role="status" aria-live="polite">
                {playbackStatus}
              </p>

              {/* Preview Settings Details */}
              <details className="preview-settings">
                <summary>
                  Preview settings <span>+</span>
                </summary>
                <div className="settings-body">
                  <label htmlFor="device-voice">Playback voice</label>
                  <select
                    id="device-voice"
                    value={selectedDeviceVoice}
                    onChange={e => {
                      if (isSpeaking) stopPlayback(false);
                      setSelectedDeviceVoice(e.target.value);
                    }}
                  >
                    <option value="">Device default</option>
                    {deviceVoices.map((v, vIdx) => {
                      const voiceKey = `dev-voice-${v.voiceURI || v.name}-${v.lang}-${v.localService ? 'local' : 'remote'}-${vIdx}`;
                      return (
                        <option key={voiceKey} value={v.voiceURI || v.name}>
                          {v.name} · {v.lang}
                          {v.localService ? ' · device' : ''}
                        </option>
                      );
                    })}
                  </select>
                  <p className="fallback-note">
                    {voiceEngine === 'gemini'
                      ? 'Gemini Studio calls Google 3.1 Flash Neural TTS directly. Device mode uses browser SpeechSynthesis.'
                      : 'Browser speech approximates the profile. It is not the original Gemini voice.'}
                  </p>

                  <label htmlFor="sample-text">Preview text</label>
                  <textarea
                    id="sample-text"
                    rows={3}
                    maxLength={400}
                    value={sampleText}
                    onChange={e => {
                      if (isSpeaking) stopPlayback(false);
                      setSampleText(e.target.value);
                    }}
                  />
                  <div className="text-meta">
                    <button
                      id="reset-sample"
                      className="text-button"
                      type="button"
                      onClick={() => {
                        if (isSpeaking) stopPlayback(false);
                        setSampleText(activeKnight.signatureQuote || activeVoiceMeta.sampleQuote);
                      }}
                    >
                      Restore sample
                    </button>
                    <span id="char-count">{sampleText.length} / 400</span>
                  </div>
                </div>
              </details>
            </aside>
          </div>

          {/* Direct Voice Roster Grid */}
          <div className="roster-section">
            <div className="roster-label">
              <span className="eyebrow">THE VOICE ROSTER</span>
              <span>Find your resonance</span>
            </div>
            <div id="roster" className="roster" role="group" aria-label="Choose a Knight directly">
              {personas.slice(0, 6).map((p, i) => {
                const isSelected = i === index;
                const crop = p.crop || [505, 111, 222, 406];
                const [cropX, cropY, cropW, cropH] = crop;
                const portraitH = cropH * 0.73;

                return (
                  <button
                    key={`roster-${p.id}-${i}`}
                    className="roster-button"
                    data-index={i}
                    aria-label={`Select ${p.name}, ${p.voice} voice. Hotkey: ${i + 1}`}
                    aria-pressed={isSelected}
                    onClick={() => selectKnight(i)}
                  >
                    <span className="roster-portrait" aria-hidden="true">
                      <img
                        src="/assets/knight-citadel.png"
                        alt=""
                        draggable={false}
                        style={{
                          width: `${(1280 / cropW) * 100}%`,
                          height: `${(720 / portraitH) * 100}%`,
                          left: `${(-cropX / cropW) * 100}%`,
                          top: `${(-cropY / portraitH) * 100}%`
                        }}
                      />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center justify-between">
                        <strong>{p.name}</strong>
                        <span className="text-[8px] font-mono text-amber-300/80 border border-zinc-700/60 bg-black/40 px-1 py-0.5 rounded ml-1">
                          {i + 1}
                        </span>
                      </span>
                      <small>{p.voice.toUpperCase()}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Below Stage Info */}
        <div className="below-stage">
          <p>
            <span className="tiny-diamond" /> Your chosen Knight and voice settings stay on this device.
          </p>
          <span id="selection-summary">
            {activeKnight.name.toUpperCase()} · {activeKnight.voice.toUpperCase()}
          </span>
        </div>
      </main>

      {/* Footer */}
      <footer className="citadel-footer">
        <span>
          CYBERDAD247 <b>/</b> MULTIVOICE-ROUTER
        </span>
        <a href="https://github.com/Cyberdad247/Multivoice-router" target="_blank" rel="noopener noreferrer">
          Source project <span>↗</span>
        </a>
        <span className="footer-end">
          FORGED IN CAMELOT <span>✧</span>
        </span>
      </footer>

      {/* Screen Reader Announcements */}
      <div id="announcement" className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
    </div>
  );
}
