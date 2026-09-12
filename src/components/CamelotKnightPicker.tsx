import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Persona } from '../types/persona';
import { getVoiceMetadata } from '../constants/voices';
import { voicePreviewService } from '../services/voice-preview-service';
import {
  Sparkles,
  Zap,
  Activity,
  Workflow,
  Radio,
  Sliders,
  MessageSquare,
  ShieldAlert,
  Volume2,
  Cpu,
  BookOpen,
  Settings2
} from 'lucide-react';

interface CamelotKnightPickerProps {
  personas: Persona[];
  selectedPersona: Persona;
  onSelectPersona: (persona: Persona) => void;
  isConnected: boolean;
  isConnecting: boolean;
  onConnect?: () => void;
  // System expansion toggles
  showLiveChat?: boolean;
  onToggleLiveChat?: () => void;
  showBlastHud?: boolean;
  onToggleBlastHud?: () => void;
  onOpenDiagnostics?: () => void;
  onOpenPersonaEditor?: () => void;
  onOpenSources?: () => void;
  onOpenSoundscape?: () => void;
}

export function CamelotKnightPicker({
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
  onOpenPersonaEditor,
  onOpenSources,
  onOpenSoundscape
}: CamelotKnightPickerProps) {
  const count = personas.length;
  const currentIndex = personas.findIndex(p => p.id === selectedPersona.id);
  const selected = currentIndex >= 0 ? currentIndex : 0;

  const [mode, setMode] = useState<'2d' | '3d'>('3d');
  const [depth, setDepth] = useState<number>(1.0);
  const [awake, setAwake] = useState<boolean>(false);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [turn, setTurn] = useState<number>(0);
  const [pitch, setPitch] = useState<number>(1.0);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [voiceStatus, setVoiceStatus] = useState<string>('Device voice preview');
  const [dragAngle, setDragAngle] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [conceptOpen, setConceptOpen] = useState<boolean>(false);
  const [announcement, setAnnouncement] = useState<string>('');

  const armoryRef = useRef<HTMLElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const conceptDialogRef = useRef<HTMLDialogElement>(null);
  const autoRotateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tiltFrameRef = useRef<number>(0);
  const pointerRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const draggedRef = useRef<boolean>(false);

  // Sync awake state with isConnected
  useEffect(() => {
    if (isConnected) {
      setAwake(true);
    }
  }, [isConnected]);

  // Current active persona
  const activeKnight = personas[selected] || personas[0];
  const activeVoiceMeta = getVoiceMetadata(activeKnight.voice);

  // Council persona format with knight attributes
  const knightList = useMemo(() => {
    return personas.map((p, i) => {
      const vMeta = getVoiceMetadata(p.voice);
      return {
        ...p,
        armor: p.armorSlot ?? (i % 7),
        color: p.color || '#dfc486',
        traits: p.traits && p.traits.length > 0 ? p.traits : (p.attributes?.expertise ? p.attributes.expertise.slice(0, 3) : ['SOVEREIGN', 'COUNCIL', 'KNIGHT']),
        voiceMeta: {
          gender: vMeta.gender,
          pitch: vMeta.pitch
        }
      };
    });
  }, [personas]);

  const wrap = (n: number) => ((n % count) + count) % count;
  const offsetFor = (i: number, cur: number) =>
    (((i - cur + count + Math.floor(count / 2)) % count) - Math.floor(count / 2));

  // Auto rotate handler
  const stopAuto = useCallback(() => {
    if (autoRotateTimerRef.current) {
      clearInterval(autoRotateTimerRef.current);
      autoRotateTimerRef.current = null;
    }
    setAutoRotate(false);
  }, []);

  const selectKnightIndex = useCallback((nextIdx: number, manual = true) => {
    if (manual) stopAuto();
    stopVoice();

    const wrapped = wrap(nextIdx);
    setTurn(prev => prev + offsetFor(wrapped, selected));
    onSelectPersona(personas[wrapped]);
    setAwake(false);
  }, [count, onSelectPersona, personas, selected, stopAuto]);

  const move = useCallback((delta: number) => {
    selectKnightIndex(selected + delta);
  }, [selectKnightIndex, selected]);

  // Auto-rotate effect
  useEffect(() => {
    if (autoRotate) {
      autoRotateTimerRef.current = setInterval(() => {
        setTurn(prev => prev + 1);
        const next = (selected + 1) % count;
        onSelectPersona(personas[next]);
      }, 3600);
    } else if (autoRotateTimerRef.current) {
      clearInterval(autoRotateTimerRef.current);
      autoRotateTimerRef.current = null;
    }
    return () => {
      if (autoRotateTimerRef.current) {
        clearInterval(autoRotateTimerRef.current);
      }
    };
  }, [autoRotate, count, onSelectPersona, personas, selected]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.closest('input,select,textarea,.voice-panel')) {
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        move(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        move(-1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        selectKnightIndex(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        selectKnightIndex(count - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [count, move, selectKnightIndex]);

  // Stop auto when tab is hidden
  useEffect(() => {
    const handleVisChange = () => {
      if (document.hidden) stopAuto();
    };
    document.addEventListener('visibilitychange', handleVisChange);
    return () => document.removeEventListener('visibilitychange', handleVisChange);
  }, [stopAuto]);

  // Speech preview control
  const speechAvailable = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

  const stopVoice = useCallback(() => {
    if (speechAvailable) {
      window.speechSynthesis.cancel();
    }
    voicePreviewService.stop();
    setIsSpeaking(false);
    setVoiceStatus(speechAvailable ? 'Device voice preview' : 'Voice preview ready');
  }, [speechAvailable]);

  const handlePlayVoice = () => {
    if (isSpeaking) {
      stopVoice();
      return;
    }
    stopAuto();

    const textToSpeak = `I am ${activeKnight.name}. ${activeKnight.description}`;

    if (speechAvailable) {
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.pitch = pitch;
      utterance.rate = 0.88;
      utterance.lang = 'en-US';

      utterance.onstart = () => {
        setIsSpeaking(true);
        setVoiceStatus('Playing voice preview');
      };

      utterance.onend = () => {
        stopVoice();
      };

      utterance.onerror = () => {
        stopVoice();
        setVoiceStatus('Voice preview interrupted');
      };

      window.speechSynthesis.speak(utterance);
    } else {
      // Fallback to Gemini 3.1 TTS via voice preview service
      setIsSpeaking(true);
      setVoiceStatus('Playing high-fidelity synthesis');
      voicePreviewService.playPreview(activeKnight, textToSpeak);
    }
  };

  // Radius calculation
  const getRadius = useCallback(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 700;
    const base = isMobile ? 265 : (typeof window !== 'undefined' && window.innerWidth >= 1600 ? 480 : 390);
    return base * depth;
  }, [depth]);

  const radius = getRadius();

  // Mouse tilt handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || (e.target as HTMLElement)?.closest('.voice-panel')) {
      return;
    }
    stopAuto();
    draggedRef.current = false;
    pointerRef.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerRef.current && e.pointerId === pointerRef.current.id) {
      const dx = e.clientX - pointerRef.current.x;
      const dy = e.clientY - pointerRef.current.y;

      if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) {
        draggedRef.current = true;
        setIsDragging(true);
        const divisor = (typeof window !== 'undefined' && window.innerWidth <= 700) ? 7 : 9;
        setDragAngle(dx / divisor);
      }
      return;
    }

    if (mode !== '3d' || e.pointerType === 'touch') return;

    if (tiltFrameRef.current) cancelAnimationFrame(tiltFrameRef.current);

    tiltFrameRef.current = requestAnimationFrame(() => {
      if (!sceneRef.current) return;
      const bounds = sceneRef.current.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, ((e.clientX - bounds.left) / bounds.width) * 2 - 1));
      const y = Math.max(-1, Math.min(1, ((e.clientY - bounds.top) / bounds.height) * 2 - 1));

      sceneRef.current.style.setProperty('--look-x', `${x * 5}deg`);
      sceneRef.current.style.setProperty('--look-y', `${-y * 3}deg`);
      tiltFrameRef.current = 0;
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerRef.current || e.pointerId !== pointerRef.current.id) return;

    const dx = e.clientX - pointerRef.current.x;
    const dy = e.clientY - pointerRef.current.y;

    setIsDragging(false);
    setDragAngle(0);

    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      draggedRef.current = true;
      const isMobile = typeof window !== 'undefined' && window.innerWidth <= 700;
      const steps = Math.max(1, Math.min(3, Math.round(Math.abs(dx) / (isMobile ? 180 : 250))));
      move(dx < 0 ? steps : -steps);
    }

    pointerRef.current = null;
    setTimeout(() => {
      draggedRef.current = false;
    }, 50);
  };

  const handlePointerLeave = () => {
    if (!pointerRef.current && sceneRef.current) {
      if (tiltFrameRef.current) cancelAnimationFrame(tiltFrameRef.current);
      sceneRef.current.style.setProperty('--look-x', '0deg');
      sceneRef.current.style.setProperty('--look-y', '0deg');
    }
  };

  // Concept dialog
  const openConcept = () => {
    stopAuto();
    setConceptOpen(true);
    conceptDialogRef.current?.showModal();
  };

  const closeConcept = () => {
    setConceptOpen(false);
    conceptDialogRef.current?.close();
  };

  // Announce for accessibility
  useEffect(() => {
    setAnnouncement(`${activeKnight.name}, ${selected + 1} of ${count}. ${awake ? 'Armor awakened.' : ''}`);
  }, [activeKnight.name, awake, count, selected]);

  // Handle Awaken Armor / Voice button
  const handleAwakenClick = () => {
    stopAuto();
    if (onConnect) {
      onConnect();
    } else {
      setAwake(!awake);
    }
  };

  return (
    <main
      ref={armoryRef}
      className={`armory select-none transition-colors duration-500 ${mode === '2d' ? 'flat' : ''} ${awake ? 'awakened' : ''} ${isDragging ? 'dragging' : ''}`}
      id="armory"
      style={{
        ['--accent' as string]: knightList[selected]?.color || '#dfc486'
      }}
    >
      {/* Masthead */}
      <header className="masthead">
        <a className="brand" href="#" aria-label="Camelot Armory">
          <span className="brand-mark" aria-hidden="true">C</span>
          <span>
            CAMELOT
            <span className="brand-sub">KNIGHT VOICE PICKER</span>
          </span>
        </a>

        <span className="chapter hidden sm:inline-block">
          COUNCIL COLLECTION <span> / </span> 002
        </span>

        {/* Action Controls in Header */}
        <div className="flex items-center gap-3">
          {/* System 2 B.L.A.S.T. DAG toggle */}
          {onToggleBlastHud && (
            <button
              onClick={onToggleBlastHud}
              className={`quiet-button hidden md:inline-flex text-xs px-2 py-1 rounded border transition-colors ${
                showBlastHud ? 'border-amber-400 text-amber-300 bg-amber-500/10' : 'border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
              title="System 2 B.L.A.S.T. Kinetic Protocol DAG"
            >
              <Workflow className="w-3.5 h-3.5 mr-1 text-amber-400" />
              B.L.A.S.T. DAG
            </button>
          )}

          {/* Live Conversation Chat toggle */}
          {onToggleLiveChat && (
            <button
              onClick={onToggleLiveChat}
              className={`quiet-button text-xs px-2.5 py-1 rounded border transition-colors ${
                showLiveChat ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10' : 'border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
              title="Toggle Live Session Chat & Telemetry"
            >
              <MessageSquare className="w-3.5 h-3.5 mr-1 text-cyan-400" />
              Live HUD
            </button>
          )}

          {/* Concept Modal Button */}
          <button className="quiet-button" id="reference" onClick={openConcept}>
            View concept <span aria-hidden="true">↗</span>
          </button>
        </div>
      </header>

      {/* Main Knight Collection Section */}
      <section className="collection" aria-label="Knight armor collection">
        <div className="section-intro">
          <p className="eyebrow">TEN PERSONAS. ONE COUNCIL.</p>
          <h1>Choose your <em>knight.</em></h1>
        </div>

        {/* Mode Controls */}
        <div className="mode-controls" aria-label="View controls">
          <div className="mode-switch" role="group" aria-label="Carousel depth">
            <button
              id="flat"
              aria-pressed={mode === '2d'}
              className={mode === '2d' ? 'selected' : ''}
              onClick={() => {
                setMode('2d');
                stopAuto();
              }}
            >
              2D
            </button>
            <button
              id="spatial"
              aria-pressed={mode === '3d'}
              className={mode === '3d' ? 'selected' : ''}
              onClick={() => {
                setMode('3d');
                stopAuto();
              }}
            >
              3D
            </button>
          </div>

          <label className="depth-control" htmlFor="depth">
            Depth{' '}
            <input
              id="depth"
              type="range"
              min="70"
              max="130"
              value={Math.round(depth * 100)}
              step="5"
              onChange={e => setDepth(Number(e.target.value) / 100)}
            />
            <output id="depth-value" htmlFor="depth">
              {Math.round(depth * 100)}%
            </output>
          </label>

          <button
            id="orbit"
            className="quiet-button"
            aria-pressed={autoRotate}
            onClick={() => {
              if (autoRotate) {
                stopAuto();
              } else {
                setAutoRotate(true);
                setAwake(false);
              }
            }}
          >
            <span aria-hidden="true">{autoRotate ? 'Ⅱ' : '↻'}</span>{' '}
            {autoRotate ? 'Pause rotation' : 'Auto rotate'}
          </button>
        </div>

        {/* 3D Kinetic Scene */}
        <div
          ref={sceneRef}
          className="scene"
          id="scene"
          role="region"
          aria-roledescription="carousel"
          aria-label="Knight armor, use left and right arrow keys to rotate"
          tabIndex={0}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          style={{
            ['--radius' as string]: `${radius}px`,
            ['--ring-radius' as string]: `${radius}px`
          }}
        >
          <div className="hall" aria-hidden="true" />
          <div className="scene-glow" aria-hidden="true" />
          <div className="beam" aria-hidden="true" />
          <div className="floor" aria-hidden="true">
            <i />
            <i />
            <i />
            <span />
          </div>

          {/* Perspective Camera */}
          <div className="camera" id="camera">
            <div className="orbit-track" aria-hidden="true" />
            <div
              className="knights"
              id="knights"
              style={{
                transform:
                  mode === '3d'
                    ? `translateZ(${-radius}px) rotateY(${(-turn * 360) / count + dragAngle}deg)`
                    : 'none'
              }}
            >
              {knightList.map((knight, i) => {
                const offset = offsetFor(i, selected);
                const isCenter = offset === 0;
                const isRear = Math.abs(offset) > 2;
                const visible = mode === '3d' || Math.abs(offset) <= 3;
                const isMobile = typeof window !== 'undefined' && window.innerWidth <= 700;

                const transformStyle =
                  mode === '3d'
                    ? `rotateY(${(i * 360) / count}deg) translateZ(${radius}px)`
                    : `translateX(${offset * (isMobile ? 180 : 254)}px) scale(${offset === 0 ? 1 : 0.83})`;

                return (
                  <button
                    key={knight.id}
                    type="button"
                    className={`knight ${isCenter ? 'active' : ''} ${isRear ? 'rear' : ''}`}
                    data-index={i}
                    aria-label={`Select ${knight.name}`}
                    aria-current={isCenter}
                    hidden={!visible}
                    aria-hidden={!visible}
                    tabIndex={isCenter ? 0 : -1}
                    onClick={() => {
                      if (!draggedRef.current) {
                        selectKnightIndex(i);
                      }
                    }}
                    style={{
                      transform: transformStyle,
                      zIndex: mode === '3d' ? 'auto' : 20 - Math.abs(offset),
                      ['--accent' as string]: knight.color,
                      ['--distance' as string]: Math.min(Math.abs(offset), 4)
                    }}
                  >
                    <span className="knight-shell">
                      <span className="armor-frame" aria-hidden="true" />
                      <span
                        className="armor"
                        aria-hidden="true"
                        style={{
                          ['--slot' as string]: knight.armor
                        }}
                      />
                      <span className="knight-plate">
                        <strong>{knight.name}</strong>
                        <small>{knight.voice} / {knight.voiceMeta.pitch}</small>
                      </span>
                      <span className="card-edge" aria-hidden="true" />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Floating Voice Preview Panel */}
          <aside className="voice-panel" aria-label="Selected knight voice preview">
            <div className="voice-title">
              <span className="panel-emblem" aria-hidden="true">✧</span>
              <span id="voice-title">{activeKnight.voice}</span>
              <span className="panel-caption">VOICE</span>
            </div>
            <p className="voice-meta" id="voice-meta">
              {activeVoiceMeta.gender} · {activeVoiceMeta.pitch}
            </p>

            <div className="playback-row">
              <div className={`waveform ${isSpeaking ? 'playing' : ''}`} id="waveform" aria-hidden="true">
                {Array.from({ length: 27 }).map((_, idx) => (
                  <i
                    key={idx}
                    style={{
                      ['--h' as string]: `${7 + Math.pow(Math.sin(idx * 1.43), 2) * 26}px`,
                      ['--delay' as string]: `${idx * -0.043}s`
                    }}
                  />
                ))}
              </div>
              <button
                id="play-voice"
                aria-label={isSpeaking ? 'Stop voice preview' : 'Play device voice preview'}
                onClick={handlePlayVoice}
              >
                {isSpeaking ? '■' : '▶'}
              </button>
            </div>

            <label className="pitch-label" htmlFor="pitch">
              Pitch <output id="pitch-value" htmlFor="pitch">{pitch.toFixed(2)}</output>
            </label>
            <input
              id="pitch"
              type="range"
              min="0.6"
              max="1.5"
              value={pitch}
              step="0.05"
              aria-label="Voice preview pitch"
              onChange={e => setPitch(Number(e.target.value))}
            />
            <p id="voice-status">{voiceStatus}</p>
          </aside>

          <div className="awakening-pulse" aria-hidden="true" />
          <span className="scene-label">
            THE ROUND TABLE <span aria-hidden="true">◆</span> VOICE COUNCIL
          </span>
        </div>

        {/* Stage Navigation */}
        <div className="stage-navigation">
          <button className="arrow" id="previous" aria-label="Previous knight" onClick={() => move(-1)}>
            ←
          </button>
          <span>
            DRAG TO ROTATE <span className="key-hint"> / ← →</span>
          </span>
          <button className="arrow" id="next" aria-label="Next knight" onClick={() => move(1)}>
            →
          </button>
        </div>

        {/* Selection Panel */}
        <div className="selection-panel">
          <div className="selection-index">
            <span id="index">{String(selected + 1).padStart(2, '0')}</span>
            <span className="index-total">/ {String(count).padStart(2, '0')}</span>
          </div>

          <div className="identity">
            <p className="eyebrow" id="role">{activeKnight.role}</p>
            <h2 id="knight-name">{activeKnight.name}</h2>
            <p id="description">{activeKnight.description}</p>
          </div>

          <div className="traits" id="traits">
            {knightList[selected]?.traits.map((t, idx) => (
              <span key={idx}>{t}</span>
            ))}
          </div>

          <button
            className="awaken"
            id="awaken"
            aria-pressed={awake}
            disabled={isConnecting}
            onClick={handleAwakenClick}
          >
            <span className="awaken-icon" aria-hidden="true">✧</span>
            <span id="awaken-label">
              {isConnecting ? (
                'Connecting…'
              ) : isConnected ? (
                'End voice session'
              ) : awake ? (
                'Rest armor'
              ) : (
                'Awaken armor'
              )}
            </span>
            <span aria-hidden="true">↗</span>
          </button>
        </div>

        {/* Roster Navigation Strip */}
        <nav className="roster" id="roster" aria-label="Select a knight">
          {knightList.map((k, i) => (
            <button
              key={k.id}
              type="button"
              data-number={String(i + 1).padStart(2, '0')}
              aria-current={i === selected}
              aria-label={`Select ${k.name}`}
              onClick={() => selectKnightIndex(i)}
            >
              {k.name.replace(/^The\s+/, '')}
            </button>
          ))}
        </nav>
      </section>

      {/* Footer */}
      <footer>
        <span>KNIGHT VOICE CITADEL</span>
        <span id="motion-note">
          {awake
            ? `${activeKnight.name.replace(/^The\s+/, '')} awakened`
            : 'Spatial armor preview'}
        </span>
        <span className="edition">CAMELOT / 2026</span>
      </footer>

      {/* Screen Reader Announcement */}
      <div className="sr-only" id="announcement" role="status" aria-live="polite">
        {announcement}
      </div>

      {/* Concept Dialog */}
      <dialog
        ref={conceptDialogRef}
        id="concept-dialog"
        aria-labelledby="concept-title"
        onClick={e => {
          if (e.target === conceptDialogRef.current) {
            closeConcept();
          }
        }}
      >
        <div className="dialog-heading">
          <h2 id="concept-title">Original knight concept</h2>
          <button id="close-concept" aria-label="Close concept" onClick={closeConcept}>
            ✕
          </button>
        </div>
        <img
          src="/embedded-reference.png"
          alt="The original Camelot knight armor concept: seven ceremonial armors surrounding an illuminated round table."
        />
      </dialog>
    </main>
  );
}
