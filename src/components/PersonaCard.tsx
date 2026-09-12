import { Persona } from '../types/persona';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Brain, Mic2, Sparkles, Edit2, Radio } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { getVoiceMetadata } from '../constants/voices';
import { PlayVoicePreviewButton } from './PlayVoicePreviewButton';

interface PersonaCardProps {
  persona: Persona;
  isSelected: boolean;
  onSelect: (persona: Persona) => void;
  onEdit: (persona: Persona) => void;
  disabled?: boolean;
  key?: string;
}

export function PersonaCard({ persona, isSelected, onSelect, onEdit, disabled }: PersonaCardProps) {
  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:border-primary/50 relative group overflow-hidden",
        isSelected && "border-primary ring-2 ring-primary/20",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      onClick={() => !disabled && onSelect(persona)}
    >
      {persona.backdropUrl && (
        <div className="absolute inset-0 pointer-events-none opacity-10 group-hover:opacity-20 transition-opacity">
          <img 
            src={persona.backdropUrl} 
            alt="" 
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover filter blur-[1px]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/85 to-transparent" />
        </div>
      )}
      <div className="relative z-10">
        <div className="absolute top-2 right-2 flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(persona);
          }}
          disabled={disabled}
        >
          <Edit2 className="w-3.5 h-3.5" />
        </Button>
        {isSelected && (
          <div className="p-1.5">
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
          </div>
        )}
      </div>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-full bg-primary/10">
            <Brain className="w-4 h-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">{persona.name}</CardTitle>
            <CardDescription className="text-xs font-mono">{persona.role}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {persona.description}
        </p>
        <div className="flex flex-wrap gap-1">
          {persona.attributes.expertise.map(exp => (
            <Badge key={exp} variant="secondary" className="text-[10px] px-1.5 py-0">
              {exp}
            </Badge>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Mic2 className="w-3.5 h-3.5 text-primary" />
            <span className="font-medium text-foreground">{persona.voice}</span>
            <span className="text-[10px] text-muted-foreground font-mono">({getVoiceMetadata(persona.voice).gender})</span>
          </div>
          <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0", getVoiceMetadata(persona.voice).color)}>
            {getVoiceMetadata(persona.voice).tag}
          </Badge>
        </div>

        <div className="mt-2 flex items-center justify-between gap-1.5 text-[10px] font-mono bg-muted/40 px-2 py-1 rounded border border-border/50">
          <span className="text-muted-foreground flex items-center gap-1">
            <Radio className="w-3 h-3 text-primary/70" />
            <span>Voice Signature:</span>
          </span>
          <span className="text-primary font-semibold truncate">
            {persona.synthesisEngine || 'Gemini-Voice-Live-2.0'}
          </span>
        </div>

        <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between gap-2">
          <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground/80">
            Voice Preview
          </span>
          <PlayVoicePreviewButton
            persona={persona}
            variant="compact"
            disabled={disabled}
          />
        </div>
      </CardContent>
      </div>
    </Card>
  );
}
