import React, { useState } from 'react';
import { Persona, Source } from '../types/persona';
import { VoiceSample } from '../types/voice-sample';
import { calculateCloningQuality } from '../lib/cloning-quality';
import { RadialQualityScore } from './RadialQualityScore';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { 
  Sparkles, 
  FileText, 
  Mic, 
  Star, 
  ChevronDown, 
  ChevronUp, 
  HelpCircle,
  PlusCircle,
  TrendingUp,
  CheckCircle2
} from 'lucide-react';

interface CloningQualityCardProps {
  persona: Persona;
  samples?: VoiceSample[];
  onAddSourceClick?: () => void;
  onRecordClick?: () => void;
  compact?: boolean;
}

export const CloningQualityCard: React.FC<CloningQualityCardProps> = ({
  persona,
  samples = [],
  onAddSourceClick,
  onRecordClick,
  compact = false
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const report = calculateCloningQuality(persona, samples);

  return (
    <div 
      className={`rounded-xl border transition-all duration-300 relative overflow-hidden ${
        report.score >= 88 
          ? 'bg-gradient-to-br from-[#12161f] via-[#0e131d] to-[#1a1710] border-[#dfc486]/40 shadow-lg shadow-[#dfc486]/5' 
          : report.score >= 70
          ? 'bg-gradient-to-br from-[#0c141d] via-[#091018] to-[#0d1c16] border-emerald-500/30'
          : 'bg-[#0a0f18] border-zinc-800'
      } p-4 text-[#efece4]`}
    >
      {/* Background Accent Grid / Glow */}
      <div 
        className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none blur-3xl opacity-20"
        style={{ backgroundColor: report.tierColor }}
      />

      {/* Main Header & Radial Gauge */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
        
        {/* Left: Persona Identity & Quality Score Indicator */}
        <div className="flex items-center gap-3.5">
          {/* Small Radial Progress Bar */}
          <div className="relative p-1 rounded-full bg-black/40 border border-white/5">
            <RadialQualityScore 
              score={report.score} 
              size="md" 
              strokeWidth={4} 
              tier={report.tier}
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#aa9872] flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#dfc486]" />
                Synthesis Fidelity
              </span>
              <Badge 
                variant="outline" 
                className="text-[10px] font-mono py-0 px-2 font-bold"
                style={{ 
                  borderColor: `${report.tierColor}60`, 
                  color: report.tierColor,
                  backgroundColor: `${report.tierColor}15`
                }}
              >
                {report.tier}
              </Badge>
            </div>

            <div className="flex items-baseline gap-2 mt-0.5">
              <h3 className="text-lg font-serif tracking-tight text-[#efece4]">
                Cloning Quality
              </h3>
              <span 
                className="text-base font-mono font-bold"
                style={{ color: report.tierColor }}
              >
                {report.score}%
              </span>
            </div>

            <p className="text-[11px] text-[#89909b]">
              Grounded across <span className="text-[#efece4] font-semibold">{report.totalSourcesCount} source{report.totalSourcesCount === 1 ? '' : 's'}</span> ({report.estimatedTokens.toLocaleString()} tokens) &amp; <span className="text-[#efece4] font-semibold">{report.audioSamplesCount} acoustic sample{report.audioSamplesCount === 1 ? '' : 's'}</span>.
            </p>
          </div>
        </div>

        {/* Right: Quick Action Controls & Toggle */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          {onAddSourceClick && (
            <Button
              size="sm"
              variant="outline"
              onClick={onAddSourceClick}
              className="h-7 text-xs font-mono border-[#dfc486]/30 text-[#dfc486] hover:bg-[#dfc486]/10 gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Add Source
            </Button>
          )}

          {onRecordClick && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRecordClick}
              className="h-7 text-xs font-mono border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-1.5"
            >
              <Mic className="w-3.5 h-3.5 text-red-400" />
              Record Clip
            </Button>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowDetails(!showDetails)}
            className="h-7 text-xs font-mono text-[#89909b] hover:text-[#efece4] gap-1 px-2"
          >
            {showDetails ? 'Hide Diagnostics' : 'Inspect'}
            {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {/* Dual Component Bar Summary */}
      <div className="grid grid-cols-2 gap-3 mt-3.5 pt-3 border-t border-white/5 relative z-10">
        <div className="p-2.5 rounded-lg bg-black/30 border border-white/5 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-[#89909b] flex items-center gap-1.5">
              <FileText className="w-3 h-3 text-[#38bdf8]" />
              Uploaded Sources Fidelity
            </span>
            <span className="text-[#38bdf8] font-bold">{report.sourceScore} / 50 pts</span>
          </div>
          <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-[#38bdf8] h-full transition-all duration-500 rounded-full"
              style={{ width: `${(report.sourceScore / 50) * 100}%` }}
            />
          </div>
          <div className="text-[10px] text-zinc-400 flex justify-between">
            <span>{report.totalSourcesCount} documents uploaded</span>
            <span>{report.totalTextLength > 0 ? `${report.totalTextLength} chars` : '0 chars'}</span>
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-black/30 border border-white/5 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-[#89909b] flex items-center gap-1.5">
              <Mic className="w-3 h-3 text-[#dfc486]" />
              Acoustic Audio Samples
            </span>
            <span className="text-[#dfc486] font-bold">{report.acousticScore} / 50 pts</span>
          </div>
          <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-[#dfc486] h-full transition-all duration-500 rounded-full"
              style={{ width: `${(report.acousticScore / 50) * 100}%` }}
            />
          </div>
          <div className="text-[10px] text-zinc-400 flex justify-between">
            <span>{report.audioSamplesCount} clips ({Math.round(report.totalAudioDurationSeconds)}s)</span>
            <span className={report.hasBaseReference ? 'text-amber-400' : 'text-zinc-500'}>
              {report.hasBaseReference ? '★ Base Active' : 'No Base Ref'}
            </span>
          </div>
        </div>
      </div>

      {/* Expanded Diagnostics Drawer */}
      {showDetails && (
        <div className="mt-4 pt-4 border-t border-white/10 space-y-4 animate-in fade-in slide-in-from-top-2 relative z-10">
          <div>
            <div className="text-xs font-mono text-[#aa9872] flex items-center gap-1.5 mb-2">
              <TrendingUp className="w-3.5 h-3.5 text-[#dfc486]" />
              Source &amp; Timbre Scoring Breakdown
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {report.metrics.map((metric) => (
                <div 
                  key={metric.id}
                  className="p-2.5 rounded-lg bg-black/40 border border-zinc-800/80 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 font-medium text-[#efece4]">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        metric.status === 'optimal' 
                          ? 'bg-emerald-400' 
                          : metric.status === 'good' 
                          ? 'bg-sky-400' 
                          : metric.status === 'warning' 
                          ? 'bg-amber-400' 
                          : 'bg-zinc-600'
                      }`} />
                      {metric.label}
                    </div>
                    <p className="text-[10px] text-[#89909b] leading-tight">
                      {metric.description}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono font-bold text-[#dfc486]">
                      {metric.points}/{metric.maxPoints} pts
                    </div>
                    <div className="text-[10px] text-zinc-400 font-mono">
                      {metric.value}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Prescriptive Guidance to Improve Synthesis */}
          <div className="p-3 rounded-lg bg-[#dfc486]/5 border border-[#dfc486]/20 space-y-2">
            <div className="text-xs font-mono font-bold text-[#dfc486] flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5" />
              Optimization Recommendations
            </div>
            <ul className="space-y-1.5">
              {report.recommendations.map((rec, i) => (
                <li key={i} className="text-xs text-[#89909b] flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#dfc486] shrink-0 mt-0.5" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
