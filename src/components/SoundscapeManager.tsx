import React, { useState, useEffect } from 'react';
import { 
  soundscapeService, 
  SoundscapeType, 
  SoundscapeMode, 
  SOUNDSCAPE_PRESETS 
} from '../services/soundscape-service';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Volume2, 
  VolumeX, 
  FlaskConical, 
  Coffee, 
  CloudRain, 
  Orbit, 
  Sparkles, 
  Activity, 
  Sliders, 
  ChevronDown, 
  ChevronUp,
  Waves,
  Mic
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface SoundscapeManagerProps {
  conversationIntensity: number; // 0.0 to 1.0 from live session
  isConnected: boolean;
}

export function SoundscapeManager({ conversationIntensity, isConnected }: SoundscapeManagerProps) {
  const [selectedPreset, setSelectedPreset] = useState<SoundscapeType>(soundscapeService.getPreset());
  const [baseVolume, setBaseVolume] = useState<number>(soundscapeService.getBaseVolume());
  const [mode, setMode] = useState<SoundscapeMode>(soundscapeService.getMode());
  const [sensitivity, setSensitivity] = useState<number>(soundscapeService.getDuckingSensitivity());
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [dynamicVolume, setDynamicVolume] = useState<number>(0);

  // Update soundscape engine dynamically whenever conversation intensity changes
  useEffect(() => {
    soundscapeService.updateConversationIntensity(conversationIntensity);
  }, [conversationIntensity]);

  // Listen to effective volume changes from engine
  useEffect(() => {
    soundscapeService.setListener((vol) => {
      setDynamicVolume(vol);
    });
  }, []);

  const handleSelectPreset = (presetId: SoundscapeType) => {
    if (presetId === selectedPreset) {
      // Toggle off if already selected
      soundscapeService.stop();
      setSelectedPreset('none');
    } else {
      soundscapeService.play(presetId);
      setSelectedPreset(presetId);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setBaseVolume(val);
    soundscapeService.setBaseVolume(val);
  };

  const handleSensitivityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setSensitivity(val);
    soundscapeService.setDuckingSensitivity(val);
  };

  const handleModeToggle = (newMode: SoundscapeMode) => {
    setMode(newMode);
    soundscapeService.setMode(newMode);
  };

  const getPresetIcon = (iconName: string) => {
    switch (iconName) {
      case 'FlaskConical': return <FlaskConical className="w-4 h-4" />;
      case 'Coffee': return <Coffee className="w-4 h-4" />;
      case 'CloudRain': return <CloudRain className="w-4 h-4" />;
      case 'Orbit': return <Orbit className="w-4 h-4" />;
      default: return <VolumeX className="w-4 h-4" />;
    }
  };

  const activePresetInfo = SOUNDSCAPE_PRESETS.find(p => p.id === selectedPreset) || SOUNDSCAPE_PRESETS[0];
  const isPlaying = selectedPreset !== 'none';

  // Calculate dynamic volume reduction/boost percentage
  const duckingPct = baseVolume > 0 
    ? Math.round(((dynamicVolume - baseVolume) / baseVolume) * 100) 
    : 0;

  return (
    <div className="rounded-xl border border-border/80 bg-card/60 backdrop-blur-md p-4 transition-all shadow-sm">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center transition-colors border",
            isPlaying 
              ? "bg-primary/20 text-primary border-primary/50 shadow-[0_0_12px_rgba(59,130,246,0.3)]" 
              : "bg-muted text-muted-foreground border-border"
          )}>
            {isPlaying ? <Waves className="w-4 h-4 animate-pulse" /> : <VolumeX className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold tracking-tight">Ambient Soundscapes</h3>
              <Badge 
                variant="outline" 
                className={cn(
                  "text-[10px] px-1.5 py-0 font-mono",
                  isPlaying ? "border-emerald-500/50 text-emerald-400 bg-emerald-950/20" : "text-muted-foreground"
                )}
              >
                {isPlaying ? `Playing: ${activePresetInfo.name}` : 'Muted'}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Dynamic volume adjusts in real time with live speech intensity
            </p>
          </div>
        </div>

        {/* Right quick controls */}
        <div className="flex items-center gap-2">
          {isPlaying && (
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-secondary/40 border text-[11px] font-mono">
              <Activity className={cn("w-3 h-3", conversationIntensity > 0.05 ? "text-amber-400 animate-pulse" : "text-zinc-500")} />
              <span className="text-muted-foreground">Intensity:</span>
              <span className="font-semibold text-foreground">
                {Math.round(conversationIntensity * 100)}%
              </span>
              <span className="text-zinc-500">|</span>
              <span className="text-muted-foreground">Dynamic:</span>
              <span className={cn("font-semibold", duckingPct < 0 ? "text-cyan-400" : "text-amber-400")}>
                {duckingPct >= 0 ? `+${duckingPct}%` : `${duckingPct}%`}
              </span>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1 font-mono"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{isExpanded ? 'Simple' : 'Tune'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {/* Preset Selector Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3.5">
        {SOUNDSCAPE_PRESETS.map((preset) => {
          const isSelected = selectedPreset === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => handleSelectPreset(preset.id)}
              className={cn(
                "flex flex-col items-start p-2.5 rounded-lg border text-left transition-all relative overflow-hidden",
                isSelected
                  ? "border-primary bg-primary/10 shadow-md ring-1 ring-primary/40"
                  : "border-border/60 bg-background/50 hover:bg-muted/40 hover:border-border"
              )}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className={cn(
                  "p-1 rounded-md border",
                  isSelected ? "bg-primary/20 text-primary border-primary/40" : "bg-muted text-muted-foreground border-transparent"
                )}>
                  {getPresetIcon(preset.icon)}
                </span>
                {isSelected && (
                  <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                )}
              </div>
              <span className="text-xs font-semibold leading-tight truncate w-full">
                {preset.name}
              </span>
              <span className="text-[10px] text-muted-foreground truncate w-full mt-0.5">
                {preset.category}
              </span>
            </button>
          );
        })}
      </div>

      {/* Expanded Fine-Tuning & Dynamic Telemetry Drawer */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mt-4 pt-4 border-t border-border/60 space-y-4"
          >
            {/* Real-time Dynamic Ducking / Swell Visualizer */}
            <div className="p-3 rounded-lg bg-secondary/30 border border-border/50 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Mic className="w-3.5 h-3.5 text-primary" />
                  Live Conversation Energy:
                </span>
                <span className="font-semibold text-primary">
                  {Math.round(conversationIntensity * 100)}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-amber-500 rounded-full"
                  animate={{ width: `${Math.min(100, conversationIntensity * 200)}%` }}
                  transition={{ ease: 'easeOut', duration: 0.1 }}
                />
              </div>

              <div className="flex items-center justify-between text-xs font-mono pt-1">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                  Effective Soundscape Output:
                </span>
                <span className="font-semibold text-cyan-400">
                  {Math.round((isPlaying ? dynamicVolume : 0) * 100)}%
                  {isPlaying && baseVolume > 0 && (
                    <span className="text-[10px] text-muted-foreground ml-1.5">
                      ({duckingPct >= 0 ? `+${duckingPct}%` : `${duckingPct}%`})
                    </span>
                  )}
                </span>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-cyan-400 rounded-full"
                  animate={{ width: `${isPlaying ? Math.min(100, dynamicVolume * 150) : 0}%` }}
                  transition={{ ease: 'easeOut', duration: 0.15 }}
                />
              </div>
            </div>

            {/* Controls: Sliders and Mode Switch */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Volume Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-medium">
                  <label className="text-muted-foreground flex items-center gap-1">
                    <Volume2 className="w-3.5 h-3.5" />
                    Base Soundscape Volume
                  </label>
                  <span className="font-mono text-[11px]">{Math.round(baseVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={baseVolume}
                  onChange={handleVolumeChange}
                  className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>

              {/* Dynamic Sensitivity Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-medium">
                  <label className="text-muted-foreground flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5" />
                    Conversation Ducking Sensitivity
                  </label>
                  <span className="font-mono text-[11px]">{Math.round(sensitivity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={sensitivity}
                  onChange={handleSensitivityChange}
                  className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
            </div>

            {/* Adaptation Mode Selector */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <span className="text-xs text-muted-foreground font-medium">
                Intensity Response Mode:
              </span>
              <div className="flex items-center gap-1.5 bg-secondary/50 p-1 rounded-lg border">
                <button
                  onClick={() => handleModeToggle('ducking')}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-mono transition-all",
                    mode === 'ducking'
                      ? "bg-background text-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Voice Priority (Smart Ducking)
                </button>
                <button
                  onClick={() => handleModeToggle('reactive')}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-mono transition-all",
                    mode === 'reactive'
                      ? "bg-background text-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Kinetic Surge (Reactive)
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
