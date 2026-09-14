import React from 'react';
import { QualityTier } from '../lib/cloning-quality';

export interface RadialQualityScoreProps {
  score: number; // 0 - 100
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  strokeWidth?: number;
  showLabel?: boolean;
  color?: string;
  glow?: boolean;
  tier?: QualityTier;
  className?: string;
  labelClassName?: string;
  tooltipText?: string;
}

const SIZE_MAP = {
  xs: 24,
  sm: 32,
  md: 44,
  lg: 64,
  xl: 84
};

const STROKE_MAP = {
  xs: 2.5,
  sm: 3,
  md: 4,
  lg: 5,
  xl: 6
};

export const RadialQualityScore: React.FC<RadialQualityScoreProps> = ({
  score,
  size = 'sm',
  strokeWidth,
  showLabel = true,
  color,
  glow = true,
  tier,
  className = '',
  labelClassName = '',
  tooltipText
}) => {
  const pixelSize = typeof size === 'number' ? size : SIZE_MAP[size] || 32;
  const calculatedStroke = strokeWidth ?? (typeof size === 'string' ? STROKE_MAP[size] || 3 : 3);

  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));
  
  // Center and radius
  const center = pixelSize / 2;
  const radius = Math.max(2, center - calculatedStroke / 2 - 1);
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  // Auto-determine color if not explicitly provided
  let strokeColor = color;
  let shadowGlow = 'none';

  if (!strokeColor) {
    if (clampedScore >= 88) {
      strokeColor = '#dfc486'; // Sovereign Gold
      shadowGlow = glow ? 'drop-shadow(0 0 4px rgba(223, 196, 134, 0.4))' : 'none';
    } else if (clampedScore >= 72) {
      strokeColor = '#10b981'; // Emerald
      shadowGlow = glow ? 'drop-shadow(0 0 4px rgba(16, 185, 129, 0.4))' : 'none';
    } else if (clampedScore >= 50) {
      strokeColor = '#38bdf8'; // Sky Cyan
      shadowGlow = glow ? 'drop-shadow(0 0 4px rgba(56, 189, 248, 0.4))' : 'none';
    } else if (clampedScore >= 25) {
      strokeColor = '#f59e0b'; // Amber
      shadowGlow = glow ? 'drop-shadow(0 0 3px rgba(245, 158, 11, 0.4))' : 'none';
    } else {
      strokeColor = '#ef4444'; // Red
      shadowGlow = glow ? 'drop-shadow(0 0 3px rgba(239, 68, 68, 0.3))' : 'none';
    }
  }

  // Label font size
  const fontSize = pixelSize >= 64 ? 'text-sm' : pixelSize >= 44 ? 'text-[11px]' : pixelSize >= 30 ? 'text-[9px]' : 'text-[7px]';

  return (
    <div 
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: pixelSize, height: pixelSize }}
      title={tooltipText || `Cloning Quality: ${clampedScore}% (${tier || 'Fidelity'})`}
      role="progressbar"
      aria-valuenow={clampedScore}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Cloning quality: ${clampedScore}%`}
    >
      <svg
        width={pixelSize}
        height={pixelSize}
        viewBox={`0 0 ${pixelSize} ${pixelSize}`}
        className="transform -rotate-90 overflow-visible"
        style={{ filter: shadowGlow }}
      >
        {/* Track Circle (Background) */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke="#1f2937"
          strokeWidth={calculatedStroke}
          strokeOpacity={0.6}
        />

        {/* Progress Arc (Foreground) */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke={strokeColor}
          strokeWidth={calculatedStroke}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>

      {/* Central Percentage Value (if enabled and size permits) */}
      {showLabel && pixelSize >= 26 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span 
            className={`font-mono font-bold leading-none tracking-tighter ${fontSize} ${labelClassName}`}
            style={{ color: strokeColor }}
          >
            {clampedScore}
            {pixelSize >= 44 && <span className="text-[70%] opacity-80">%</span>}
          </span>
        </div>
      )}
    </div>
  );
};
