import React, { useState } from 'react';
import { Persona } from '../types/persona';
import { getPersonaBackdrop, PersonaBackdropInfo } from '../constants/persona-backdrops';
import { motion, AnimatePresence } from 'motion/react';
import { Image as ImageIcon, Sparkles, Eye, Sliders, Maximize2 } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

export type BackdropMode = 'cinematic' | 'atmosphere' | 'minimalist';

interface PersonaBackdropProps {
  persona: Persona;
  audioLevel: number;
  isConnected: boolean;
  children?: React.ReactNode;
}

export function PersonaBackdrop({
  persona,
  audioLevel,
  isConnected,
  children
}: PersonaBackdropProps) {
  const [mode, setMode] = useState<BackdropMode>('atmosphere');
  const [showMeta, setShowMeta] = useState<boolean>(true);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);

  const backdropInfo: PersonaBackdropInfo = getPersonaBackdrop(persona.id, persona.backdropUrl);

  // Calculate dynamic reactivity based on audio level
  const audioGlowIntensity = isConnected ? Math.min(1, audioLevel * 3.0) : 0;
  
  // Opacity configuration per mode
  const getModeStyles = () => {
    switch (mode) {
      case 'cinematic':
        return {
          imgOpacity: 0.45 + (audioGlowIntensity * 0.15),
          vignette: 'from-background/70 via-background/85 to-background/95',
          scale: 1.02 + (audioGlowIntensity * 0.03)
        };
      case 'atmosphere':
        return {
          imgOpacity: 0.22 + (audioGlowIntensity * 0.12),
          vignette: 'from-background/80 via-background/92 to-background/98',
          scale: 1.01 + (audioGlowIntensity * 0.02)
        };
      case 'minimalist':
        return {
          imgOpacity: 0.08 + (audioGlowIntensity * 0.06),
          vignette: 'from-background/90 via-background/96 to-background',
          scale: 1.0
        };
    }
  };

  const currentStyles = getModeStyles();

  return (
    <div className="relative overflow-hidden rounded-t-xl transition-all">
      {/* Background Image Container with Crossfade on Persona Switch */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none">
        <AnimatePresence mode="wait">
          <motion.div
            key={persona.id + (persona.backdropUrl || '')}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ 
              opacity: currentStyles.imgOpacity,
              scale: currentStyles.scale
            }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="absolute inset-0 w-full h-full"
          >
            <img
              src={imageError 
                ? `https://picsum.photos/seed/${backdropInfo.fallbackSeed}/1920/1080?blur=2` 
                : backdropInfo.imageUrl
              }
              alt={`${persona.name} Visual Environment Backdrop`}
              referrerPolicy="no-referrer"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover object-center filter saturate-125 contrast-110"
            />
          </motion.div>
        </AnimatePresence>

        {/* Dynamic Audio-Reactive Color Aura Glow */}
        <motion.div
          className={cn(
            "absolute inset-0 bg-gradient-to-tr transition-opacity duration-300 pointer-events-none mix-blend-screen",
            backdropInfo.accentGlow
          )}
          animate={{
            opacity: isConnected ? 0.35 + (audioGlowIntensity * 0.65) : 0.15
          }}
          transition={{ duration: 0.15 }}
        />

        {/* Deep Vignette and Readability Gradient */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-b transition-all duration-500",
          currentStyles.vignette
        )} />

        {/* Subtle Cybernetic Grid Mesh */}
        <div 
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(${backdropInfo.dominantHex} 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        />
      </div>

      {/* Floating Backdrop Controls Bar */}
      <div className="relative z-10 px-6 pt-4 pb-0 flex flex-wrap items-center justify-between gap-2">
        {/* Environment Lore Badge */}
        <AnimatePresence>
          {showMeta && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex items-center gap-2"
            >
              <Badge 
                variant="outline"
                className={cn(
                  "text-[10px] font-mono tracking-wider uppercase px-2 py-0.5 border shadow-xs backdrop-blur-md bg-background/60",
                  backdropInfo.borderColor
                )}
                style={{ color: backdropInfo.dominantHex }}
              >
                <Sparkles className="w-3 h-3 mr-1 inline" />
                {backdropInfo.title}
              </Badge>
              <span className="hidden sm:inline text-[11px] text-muted-foreground/80 font-mono">
                {backdropInfo.environment}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mode Selector & Backdrop Intensity Toggles */}
        <div className="flex items-center gap-1.5 ml-auto">
          <div className="flex items-center rounded-lg bg-background/70 border border-border/80 backdrop-blur-md p-0.5 text-[10px] font-mono shadow-xs">
            <button
              onClick={() => setMode('cinematic')}
              className={cn(
                "px-2 py-0.5 rounded transition-all",
                mode === 'cinematic' 
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs" 
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Vivid backdrop visual immersion"
            >
              Cinematic
            </button>
            <button
              onClick={() => setMode('atmosphere')}
              className={cn(
                "px-2 py-0.5 rounded transition-all",
                mode === 'atmosphere' 
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs" 
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Balanced atmospheric backdrop with high readability"
            >
              Atmosphere
            </button>
            <button
              onClick={() => setMode('minimalist')}
              className={cn(
                "px-2 py-0.5 rounded transition-all",
                mode === 'minimalist' 
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs" 
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Subtle ambient glow with darkened background"
            >
              Minimal
            </button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMeta(!showMeta)}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground bg-background/50 backdrop-blur-md rounded-md border border-border/60"
            title="Toggle environment badge"
          >
            <Eye className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Foreground Children (Title, description, visualizer, soundscapes) */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
