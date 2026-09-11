import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Persona } from '../types/persona';
import { getVoiceMetadata } from '../constants/voices';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { 
  ChevronLeft, 
  ChevronRight, 
  Zap, 
  Cpu, 
  Shield, 
  Sparkles, 
  Mic2, 
  Terminal, 
  Workflow, 
  Layers, 
  CheckCircle2, 
  Activity,
  Compass,
  Radio,
  ExternalLink
} from 'lucide-react';
import { cn } from '../lib/utils';

interface CamelotCarouselProps {
  personas: Persona[];
  selectedPersona: Persona;
  onSelectPersona: (persona: Persona) => void;
  isConnected: boolean;
  isConnecting: boolean;
  onConnect?: () => void;
}

const CAMELOT_IMAGE_URL = 'https://i.postimg.cc/HLbzLvC3/Chat-GPT-Image-Sep-11-2026-09-57-53-AM.png';

export function CamelotCarousel({
  personas,
  selectedPersona,
  onSelectPersona,
  isConnected,
  isConnecting,
  onConnect
}: CamelotCarouselProps) {
  const currentIndex = personas.findIndex(p => p.id === selectedPersona.id);
  const activeIdx = currentIndex >= 0 ? currentIndex : 0;
  
  const [activeBlastStep, setActiveBlastStep] = useState<string>('B');
  const [showBlastDrawer, setShowBlastDrawer] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePrev = () => {
    const nextIdx = (activeIdx - 1 + personas.length) % personas.length;
    onSelectPersona(personas[nextIdx]);
  };

  const handleNext = () => {
    const nextIdx = (activeIdx + 1) % personas.length;
    onSelectPersona(personas[nextIdx]);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIdx, personas]);

  const current = personas[activeIdx] || personas[0];
  const voiceMeta = getVoiceMetadata(current.voice);

  const blastSteps = [
    { key: 'B', name: 'Blueprint', desc: 'task plan.json & bounding context isolation', status: 'verified', time: '0.12ms' },
    { key: 'L', name: 'Link', desc: 'mTLS MCP servers (FileSystem, GitHub, Figma-to-UI)', status: 'active', time: '0.45ms' },
    { key: 'A', name: 'Architect', desc: 'Z3-verified SOPs & AST tree-sitter patching', status: 'verified', time: '1.20ms' },
    { key: 'S', name: 'Stylize', desc: 'Luxury Minimalist Brutalism (Obsidian/Gold/Cyan)', status: 'rendered', time: '0.88ms' },
    { key: 'T', name: 'Trigger', desc: 'Parallel WASM32-WASI test suite execution', status: 'ready', time: '2.14ms' },
  ];

  return (
    <div 
      ref={containerRef}
      className="relative w-full rounded-2xl overflow-hidden border border-amber-500/30 bg-[#090a0f] shadow-2xl transition-all select-none"
    >
      {/* Top Nexus HUD Bar */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-cyan-500/20 bg-black/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-400/40 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-black tracking-widest text-amber-400 uppercase">
                OMEGA_TITAN_ANTI_GRAVITY_NEXUS
              </span>
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-cyan-500/40 text-cyan-300 bg-cyan-950/30">
                v1000 Parallel Forge
              </Badge>
            </div>
            <p className="text-[10px] font-mono text-zinc-400">
              @ctx|camelot-os.dev/ukg &bull; ROOT: MERLIN_Ω &bull; 8GB_EDGE_CEILING (memfd_create zero-copy IPC)
            </p>
          </div>
        </div>

        {/* Right HUD status actions */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowBlastDrawer(!showBlastDrawer)}
            className="h-7 text-[11px] font-mono border-amber-500/40 text-amber-300 hover:bg-amber-500/10 hover:text-amber-200"
          >
            <Workflow className="w-3.5 h-3.5 mr-1 text-amber-400" />
            B.L.A.S.T. DAG [{showBlastDrawer ? 'Hide' : 'Inspect'}]
          </Button>
          <Badge variant="outline" className="hidden sm:inline-flex text-[10px] font-mono border-emerald-500/40 text-emerald-400 bg-emerald-950/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping mr-1.5" />
            CoW MicroVM Δ ≤ 0.12 MiB
          </Badge>
        </div>
      </div>

      {/* B.L.A.S.T. Protocol Quick Drawer */}
      <AnimatePresence>
        {showBlastDrawer && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="relative z-20 border-b border-amber-500/20 bg-[#0d0e14]/95 backdrop-blur-xl px-5 py-3 text-xs"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Kinetic Workflow: B.L.A.S.T. Execution Protocol
              </span>
              <span className="font-mono text-[10px] text-zinc-500">
                PROVENANCE_LEDGER.md &bull; AST-aware tree-sitter &bull; Z3 SMT-LIB Verified
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 font-mono">
              {blastSteps.map((step) => (
                <div
                  key={step.key}
                  onClick={() => setActiveBlastStep(step.key)}
                  className={cn(
                    "cursor-pointer p-2.5 rounded-lg border transition-all",
                    activeBlastStep === step.key
                      ? "bg-amber-500/15 border-amber-400/60 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                      : "bg-black/40 border-zinc-800 hover:border-zinc-700"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-amber-400 font-bold text-xs">{step.key}_{step.name}</span>
                    <span className="text-[9px] text-cyan-400/80">{step.time}</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-snug line-clamp-2">{step.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Kinetic Stage with Master Image Backdrop */}
      <div className="relative min-h-[360px] md:min-h-[420px] w-full flex flex-col justify-between overflow-hidden">
        {/* Background Image Layer */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <img 
            src={CAMELOT_IMAGE_URL} 
            alt="Camelot-OS Anti-Gravity Forge Stage" 
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center opacity-35 filter contrast-125 saturate-120 scale-105 transition-transform duration-1000 ease-out"
          />
          {/* Obsidian Luxury Minimalist Vignette Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#090a0f] via-[#090a0f]/60 to-[#090a0f]/80" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_#090a0f_75%)]" />
          {/* Cyber Scanline Grid Overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#06b6d408_1px,transparent_1px),linear-gradient(to_bottom,#06b6d408_1px,transparent_1px)] bg-[size:28px_28px] opacity-40" />
        </div>

        {/* 3D Kinetic Carousel Card Stage */}
        <div className="relative z-10 w-full py-6 px-4 flex items-center justify-center">
          <div className="w-full max-w-5xl flex items-center justify-center relative min-h-[260px] [perspective:1200px]">
            {/* Carousel Navigation Button Left */}
            <button
              onClick={handlePrev}
              aria-label="Previous Agent"
              className="absolute left-2 sm:left-4 z-30 p-2.5 rounded-full bg-black/70 hover:bg-black border border-amber-500/40 text-amber-300 hover:text-amber-200 transition-all hover:scale-110 shadow-lg shadow-black/60 focus:outline-none"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Carousel Navigation Button Right */}
            <button
              onClick={handleNext}
              aria-label="Next Agent"
              className="absolute right-2 sm:right-4 z-30 p-2.5 rounded-full bg-black/70 hover:bg-black border border-amber-500/40 text-amber-300 hover:text-amber-200 transition-all hover:scale-110 shadow-lg shadow-black/60 focus:outline-none"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* 3D Cards Ring */}
            <div className="relative w-full flex items-center justify-center h-[260px]">
              {personas.map((p, idx) => {
                const offset = idx - activeIdx;
                const isCenter = offset === 0;
                
                // Visible cards within range [-2, 2]
                const isVisible = Math.abs(offset) <= 2;
                if (!isVisible) return null;

                const translateX = offset * 220; // px spacing
                const rotateY = offset * -25; // 3D rotation angle
                const scale = isCenter ? 1 : 0.82;
                const zIndex = 20 - Math.abs(offset) * 5;
                const opacity = isCenter ? 1 : 0.45;
                const pVoiceMeta = getVoiceMetadata(p.voice);

                return (
                  <motion.div
                    key={p.id}
                    onClick={() => onSelectPersona(p)}
                    animate={{
                      x: translateX,
                      rotateY: rotateY,
                      scale: scale,
                      opacity: opacity,
                      zIndex: zIndex
                    }}
                    transition={{
                      type: 'spring',
                      stiffness: 280,
                      damping: 28,
                      mass: 0.8
                    }}
                    style={{
                      transformStyle: 'preserve-3d',
                      position: 'absolute'
                    }}
                    className={cn(
                      "w-[270px] sm:w-[310px] rounded-xl p-4 cursor-pointer transition-colors backdrop-blur-xl border select-none overflow-hidden relative",
                      isCenter
                        ? "bg-[#0d0f18]/90 border-amber-400/80 shadow-[0_0_30px_rgba(245,158,11,0.25),0_15px_30px_rgba(0,0,0,0.8)] ring-1 ring-amber-400/50"
                        : "bg-[#090b12]/80 border-cyan-500/20 shadow-lg hover:border-cyan-400/50"
                    )}
                  >
                    {/* Persona Environment Backdrop Preview */}
                    {p.backdropUrl && (
                      <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden">
                        <img 
                          src={p.backdropUrl} 
                          alt="" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover object-center filter saturate-150 contrast-125"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0f18] via-[#0d0f18]/70 to-transparent" />
                      </div>
                    )}

                    <div className="relative z-10">
                      {/* Card Header */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-7 h-7 rounded-md flex items-center justify-center text-xs font-mono font-bold border",
                          isCenter 
                            ? "bg-amber-500/20 text-amber-300 border-amber-400/50" 
                            : "bg-cyan-950/40 text-cyan-400 border-cyan-500/30"
                        )}>
                          {p.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className={cn(
                            "font-display text-sm font-bold tracking-tight truncate max-w-[150px]",
                            isCenter ? "text-amber-200" : "text-zinc-200"
                          )}>
                            {p.name}
                          </h4>
                          <span className="text-[10px] font-mono text-cyan-400/80 block leading-tight truncate max-w-[150px]">
                            {p.role}
                          </span>
                        </div>
                      </div>

                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-[9px] px-1.5 py-0 font-mono",
                          isCenter ? "border-amber-400/50 text-amber-300 bg-amber-950/30" : "border-zinc-700 text-zinc-400"
                        )}
                      >
                        {p.voice}
                      </Badge>
                    </div>

                    {/* Description */}
                    <p className="text-[11px] text-zinc-300/90 leading-snug line-clamp-2 mb-3 min-h-[30px]">
                      {p.description}
                    </p>

                    {/* Expertise tags */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {p.attributes.expertise.slice(0, 3).map((exp, i) => (
                        <span 
                          key={i} 
                          className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-zinc-400 border border-zinc-800"
                        >
                          {exp}
                        </span>
                      ))}
                    </div>

                    {/* Footer telemetry */}
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 text-[10px] font-mono text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Cpu className="w-3 h-3 text-cyan-400" />
                        Δ ≤ 0.12 MiB
                      </span>
                      <span className={cn(
                        "font-semibold",
                        isCenter ? "text-amber-400" : "text-zinc-500"
                      )}>
                        {isCenter ? '● ACTIVE NODE' : 'CLICK TO SELECT'}
                      </span>
                    </div>
                  </div>
                </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Carousel Focal Bar with Selected Persona Detail & Live Connection */}
        <div className="relative z-20 px-5 py-3 border-t border-amber-500/20 bg-black/75 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-widest">
                  Selected Entity:
                </span>
                <span className="font-display font-bold text-sm text-amber-300">
                  {current.name}
                </span>
                <Badge variant="outline" className="text-[9px] border-cyan-400/40 text-cyan-300 font-mono">
                  {current.attributes.personality}
                </Badge>
              </div>
              <p className="text-[11px] text-zinc-400 max-w-xl truncate">
                <span className="font-mono text-amber-400/80">Tone:</span> {current.attributes.tone} &bull; <span className="font-mono text-cyan-400/80">Model Voice:</span> {current.voice} ({voiceMeta.pitch}, {voiceMeta.tempo})
              </p>
            </div>
          </div>

          {/* Quick Connect / Deploy Action */}
          <div className="flex items-center gap-2">
            {/* Pagination Dots */}
            <div className="hidden md:flex items-center gap-1 mr-3">
              {personas.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => onSelectPersona(p)}
                  aria-label={`Select ${p.name}`}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    i === activeIdx 
                      ? "w-5 bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)]" 
                      : "bg-zinc-700 hover:bg-zinc-500"
                  )}
                />
              ))}
            </div>

            {onConnect && (
              <Button
                size="sm"
                onClick={onConnect}
                disabled={isConnecting}
                className={cn(
                  "font-mono text-xs font-bold px-4 h-8 transition-all",
                  isConnected 
                    ? "bg-red-500/20 border border-red-500 text-red-300 hover:bg-red-500/30" 
                    : "bg-gradient-to-r from-amber-500 to-amber-600 text-black hover:from-amber-400 hover:to-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                )}
              >
                {isConnecting ? (
                  <>
                    <Zap className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Linking Sovereign Brain...
                  </>
                ) : isConnected ? (
                  <>
                    <Activity className="w-3.5 h-3.5 mr-1.5 text-red-400 animate-pulse" />
                    Disconnect {current.name}
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 mr-1.5 fill-black" />
                    Deploy & Converse Live
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
