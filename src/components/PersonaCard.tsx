import { Persona } from '../types/persona';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Brain, Mic2, Sparkles, Edit2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';

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
        <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Mic2 className="w-3 h-3" />
          <span>Voice: {persona.voice}</span>
        </div>
      </CardContent>
    </Card>
  );
}
