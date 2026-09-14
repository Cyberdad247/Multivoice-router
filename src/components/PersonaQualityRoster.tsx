import React from 'react';
import { Persona } from '../types/persona';
import { VoiceSample } from '../types/voice-sample';
import { calculateCloningQuality } from '../lib/cloning-quality';
import { RadialQualityScore } from './RadialQualityScore';
import { Badge } from './ui/badge';
import { Sparkles, FileText, Mic } from 'lucide-react';

interface PersonaQualityRosterProps {
  personas: Persona[];
  selectedPersonaId: string;
  onSelectPersona: (persona: Persona) => void;
  samples: VoiceSample[];
}

export const PersonaQualityRoster: React.FC<PersonaQualityRosterProps> = ({
  personas,
  selectedPersonaId,
  onSelectPersona,
  samples
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[#dfc486]" />
          <span className="text-xs font-mono uppercase tracking-wider text-[#aa9872] font-semibold">
            Council Synthesis Fidelity Matrix
          </span>
          <span className="text-[10px] text-[#89909b] font-mono">
            ({personas.length} Knights)
          </span>
        </div>
        <span className="text-[10px] font-mono text-[#89909b]">
          Select knight to inspect acoustic profile &amp; sources
        </span>
      </div>

      {/* Horizontal Scrollable Roster Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
        {personas.map((persona) => {
          const isSelected = persona.id === selectedPersonaId;
          const report = calculateCloningQuality(persona, samples);

          return (
            <button
              key={persona.id}
              type="button"
              onClick={() => onSelectPersona(persona)}
              className={`p-2.5 rounded-xl border text-left transition-all duration-200 relative group flex flex-col justify-between cursor-pointer ${
                isSelected
                  ? 'bg-[#0f1724] border-[#dfc486] shadow-md shadow-[#dfc486]/10 ring-1 ring-[#dfc486]/30'
                  : 'bg-[#090d14] border-zinc-800/80 hover:border-zinc-700 hover:bg-[#0c121b]'
              }`}
            >
              {/* Top Row: Avatar/Color & Small Radial Progress Bar */}
              <div className="flex items-center justify-between w-full mb-2">
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-3 h-3 rounded-full border border-white/20 shrink-0"
                    style={{ backgroundColor: persona.color || '#dfc486' }}
                  />
                  <span className="text-[9px] font-mono text-zinc-400 uppercase truncate max-w-[60px]">
                    {persona.voice}
                  </span>
                </div>

                {/* Small Radial Progress Bar for this persona */}
                <div className="relative">
                  <RadialQualityScore 
                    score={report.score} 
                    size="sm" 
                    strokeWidth={3} 
                    tier={report.tier}
                    tooltipText={`${persona.name}: ${report.score}% Cloning Quality (${report.tier})`}
                  />
                </div>
              </div>

              {/* Middle: Knight Name & Role */}
              <div className="space-y-0.5 mb-2 w-full">
                <div className="text-xs font-serif font-bold text-[#efece4] truncate">
                  {persona.name}
                </div>
                <div className="text-[10px] text-[#89909b] truncate font-mono">
                  {persona.role}
                </div>
              </div>

              {/* Bottom: Sources & Sample Badges */}
              <div className="flex items-center justify-between pt-1 border-t border-white/5 w-full text-[9px] font-mono text-[#89909b]">
                <span className="flex items-center gap-0.5" title={`${report.totalSourcesCount} uploaded sources`}>
                  <FileText className="w-2.5 h-2.5 text-[#38bdf8]" />
                  {report.totalSourcesCount}
                </span>
                <span className="flex items-center gap-0.5" title={`${report.audioSamplesCount} acoustic audio clips`}>
                  <Mic className="w-2.5 h-2.5 text-[#dfc486]" />
                  {report.audioSamplesCount}
                </span>
                <span 
                  className="font-bold font-mono"
                  style={{ color: report.tierColor }}
                >
                  {report.score}%
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
