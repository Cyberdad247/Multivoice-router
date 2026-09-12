import React, { useEffect, useState } from 'react';
import { Persona } from '../types/persona';
import { voicePreviewService, VoicePreviewState } from '../services/voice-preview-service';
import { Button } from './ui/button';
import { Volume2, Square, Loader2, Play } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface PlayVoicePreviewButtonProps {
  persona: Persona;
  variant?: 'default' | 'compact' | 'pill' | 'icon-only';
  customText?: string;
  className?: string;
  disabled?: boolean;
}

export function PlayVoicePreviewButton({
  persona,
  variant = 'default',
  customText,
  className,
  disabled = false
}: PlayVoicePreviewButtonProps) {
  const [state, setState] = useState<VoicePreviewState>(voicePreviewService.getState());

  useEffect(() => {
    const unsubscribe = voicePreviewService.subscribe((newState) => {
      setState(newState);
    });
    return () => unsubscribe();
  }, []);

  const isCurrentPersona = state.personaId === persona.id;
  const isLoading = isCurrentPersona && state.isLoading;
  const isPlaying = isCurrentPersona && state.isPlaying;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (disabled) return;

    if (isPlaying) {
      voicePreviewService.stop();
    } else {
      voicePreviewService.playPreview(persona, customText);
    }
  };

  // Equalizer visualizer bars when playing
  const renderEqualizer = () => (
    <div className="flex items-end gap-0.5 h-3 px-0.5">
      <motion.span
        animate={{ height: ['30%', '100%', '40%', '80%', '30%'] }}
        transition={{ repeat: Infinity, duration: 0.7, ease: 'easeInOut' }}
        className="w-[2px] bg-amber-400 rounded-full"
      />
      <motion.span
        animate={{ height: ['60%', '20%', '100%', '50%', '60%'] }}
        transition={{ repeat: Infinity, duration: 0.5, ease: 'easeInOut', delay: 0.1 }}
        className="w-[2px] bg-amber-300 rounded-full"
      />
      <motion.span
        animate={{ height: ['40%', '90%', '20%', '70%', '40%'] }}
        transition={{ repeat: Infinity, duration: 0.6, ease: 'easeInOut', delay: 0.2 }}
        className="w-[2px] bg-amber-400 rounded-full"
      />
    </div>
  );

  if (variant === 'icon-only') {
    return (
      <Button
        type="button"
        size="icon"
        variant="ghost"
        disabled={disabled}
        onClick={handleClick}
        title={isPlaying ? `Stop ${persona.name} voice preview` : `Play ${persona.name} voice preview (${persona.voice})`}
        className={cn(
          "h-7 w-7 rounded-md transition-all",
          isPlaying && "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.3)]",
          isLoading && "bg-cyan-500/10 text-cyan-300",
          !isPlaying && !isLoading && "hover:bg-amber-500/10 hover:text-amber-300 text-zinc-400",
          className
        )}
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
        ) : isPlaying ? (
          renderEqualizer()
        ) : (
          <Volume2 className="w-3.5 h-3.5 text-amber-400" />
        )}
      </Button>
    );
  }

  if (variant === 'compact') {
    return (
      <Button
        type="button"
        size="sm"
        disabled={disabled}
        onClick={handleClick}
        className={cn(
          "h-6 px-2 text-[10px] font-mono gap-1.5 rounded transition-all border",
          isPlaying
            ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.25)] hover:bg-amber-500/30"
            : isLoading
            ? "bg-cyan-950/40 text-cyan-300 border-cyan-500/30"
            : "bg-black/50 text-zinc-300 border-zinc-700/80 hover:border-amber-500/40 hover:text-amber-300 hover:bg-amber-950/20",
          className
        )}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-2.5 h-2.5 animate-spin text-cyan-400" />
            <span>Voice Prep...</span>
          </>
        ) : isPlaying ? (
          <>
            {renderEqualizer()}
            <span className="text-amber-300">Stop Preview</span>
          </>
        ) : (
          <>
            <Play className="w-2.5 h-2.5 fill-current text-amber-400" />
            <span>Play Preview</span>
          </>
        )}
      </Button>
    );
  }

  if (variant === 'pill') {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={handleClick}
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono transition-all border select-none cursor-pointer",
          isPlaying
            ? "bg-amber-500/20 text-amber-300 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)] animate-pulse"
            : isLoading
            ? "bg-cyan-950/50 text-cyan-300 border-cyan-500/40 cursor-wait"
            : "bg-zinc-900/80 text-zinc-300 border-zinc-700 hover:border-amber-400/60 hover:text-amber-300 hover:bg-amber-950/30",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
            <span>Synthesizing Voice...</span>
          </>
        ) : isPlaying ? (
          <>
            {renderEqualizer()}
            <span className="font-semibold">Playing Preview</span>
            <Square className="w-2.5 h-2.5 ml-0.5 fill-amber-400 text-amber-400" />
          </>
        ) : (
          <>
            <Volume2 className="w-3 h-3 text-amber-400" />
            <span>Play Preview</span>
          </>
        )}
      </button>
    );
  }

  // Default variant
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        "h-7 text-xs font-mono gap-1.5 transition-all",
        isPlaying
          ? "border-amber-400 bg-amber-500/20 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.25)] hover:bg-amber-500/30"
          : isLoading
          ? "border-cyan-500/40 bg-cyan-950/30 text-cyan-300"
          : "border-zinc-700/80 hover:border-amber-500/50 hover:text-amber-300 hover:bg-amber-500/10 text-zinc-300",
        className
      )}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
          <span>Synthesizing...</span>
        </>
      ) : isPlaying ? (
        <>
          {renderEqualizer()}
          <span>Stop Preview</span>
          <Square className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
        </>
      ) : (
        <>
          <Volume2 className="w-3.5 h-3.5 text-amber-400" />
          <span>Play Preview</span>
        </>
      )}
    </Button>
  );
}
