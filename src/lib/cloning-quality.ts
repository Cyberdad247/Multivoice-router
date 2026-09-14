import { Persona, Source } from '../types/persona';
import { VoiceSample } from '../types/voice-sample';

export type QualityTier = 'Master Sovereign' | 'High Fidelity' | 'Moderate' | 'Developing' | 'Calibrating';

export interface CloningQualityMetric {
  id: string;
  label: string;
  value: string;
  points: number;
  maxPoints: number;
  description: string;
  status: 'optimal' | 'good' | 'warning' | 'empty';
}

export interface CloningQualityReport {
  score: number; // 0 - 100%
  tier: QualityTier;
  tierColor: string; // Hex color for ring & badge
  glowColor: string;
  
  // Component scores
  sourceScore: number; // 0 - 50 points from uploaded sources (files, urls, text volume)
  acousticScore: number; // 0 - 50 points from audio vault samples & duration
  
  // Statistical counts
  totalSourcesCount: number;
  fileSourcesCount: number;
  urlSourcesCount: number;
  totalTextLength: number;
  estimatedTokens: number;
  
  audioSamplesCount: number;
  hasBaseReference: boolean;
  totalAudioDurationSeconds: number;
  
  // Detailed diagnostic metrics
  metrics: CloningQualityMetric[];
  
  // Prescriptive guidance to increase fidelity
  recommendations: string[];
}

/**
 * Calculates the synthesis fidelity and cloning quality score based on uploaded sources,
 * transcripts, and acoustic reference samples for a given persona.
 */
export function calculateCloningQuality(
  persona: Persona,
  samples: VoiceSample[] = []
): CloningQualityReport {
  const sources: Source[] = persona.sources || [];
  const personaSamples: VoiceSample[] = samples.filter(s => s.personaId === persona.id);

  // 1. CALCULATE UPLOADED SOURCES COMPONENT (Max 50 points)
  // Sources provide linguistic vocabulary, phonetic cadences, and domain grounding
  let sourcePoints = 0;
  const fileSources = sources.filter(s => s.type === 'file');
  const urlSources = sources.filter(s => s.type === 'url');
  
  const totalTextLength = sources.reduce((acc, s) => {
    return acc + (s.content ? s.content.length : 0);
  }, 0);
  const estimatedTokens = Math.round(totalTextLength / 4);

  // Source count points (up to 30 pts)
  // 1st source: 15 pts, 2nd source: 10 pts, 3rd+: 5 pts each (max 30 pts)
  if (sources.length === 1) sourcePoints += 15;
  else if (sources.length === 2) sourcePoints += 25;
  else if (sources.length >= 3) sourcePoints += Math.min(30, 25 + (sources.length - 2) * 2.5);

  // Token density & text volume (up to 15 pts)
  if (totalTextLength > 2000) sourcePoints += 15;
  else if (totalTextLength > 800) sourcePoints += 11;
  else if (totalTextLength > 200) sourcePoints += 7;
  else if (totalTextLength > 0) sourcePoints += 3;

  // Multi-source diversity (up to 5 pts)
  if (fileSources.length > 0 && urlSources.length > 0) {
    sourcePoints += 5;
  } else if (fileSources.length >= 2 || urlSources.length >= 2) {
    sourcePoints += 3;
  }

  const normalizedSourceScore = Math.min(50, Math.round(sourcePoints));

  // 2. CALCULATE ACOUSTIC SAMPLE COMPONENT (Max 50 points)
  // Audio samples provide timbre, formant structure, and pitch contour
  let acousticPoints = 0;
  const hasBaseReference = !!(
    persona.baseVoiceSampleUrl || 
    persona.baseVoiceSampleId || 
    personaSamples.some(s => s.isBaseReference)
  );

  const totalAudioDuration = personaSamples.reduce((acc, s) => acc + (s.duration || 0), 0);

  // Audio sample count points (up to 25 pts)
  if (personaSamples.length === 1) acousticPoints += 15;
  else if (personaSamples.length === 2) acousticPoints += 20;
  else if (personaSamples.length >= 3) acousticPoints += 25;

  // Base Reference anchor (up to 15 pts)
  if (hasBaseReference) {
    acousticPoints += 15;
  }

  // Audio duration depth (up to 10 pts)
  if (totalAudioDuration >= 45) acousticPoints += 10;
  else if (totalAudioDuration >= 20) acousticPoints += 7;
  else if (totalAudioDuration >= 5) acousticPoints += 4;
  else if (personaSamples.length > 0) acousticPoints += 2;

  // Baseline calibration from preset synthesis engine (if defined)
  if (persona.synthesisEngine && acousticPoints === 0 && normalizedSourceScore === 0) {
    acousticPoints = 8; // Nominal starting baseline
  }

  const normalizedAcousticScore = Math.min(50, Math.round(acousticPoints));

  // 3. OVERALL SYNTHESIS FIDELITY SCORE (0 - 100)
  const totalScore = Math.min(100, Math.max(0, normalizedSourceScore + normalizedAcousticScore));

  // 4. TIERS & COLOR METRICS
  let tier: QualityTier = 'Calibrating';
  let tierColor = '#ef4444'; // Red
  let glowColor = 'rgba(239, 68, 68, 0.2)';

  if (totalScore >= 88) {
    tier = 'Master Sovereign';
    tierColor = '#dfc486'; // Sovereign Gold
    glowColor = 'rgba(223, 196, 134, 0.25)';
  } else if (totalScore >= 72) {
    tier = 'High Fidelity';
    tierColor = '#10b981'; // Emerald
    glowColor = 'rgba(16, 185, 129, 0.25)';
  } else if (totalScore >= 50) {
    tier = 'Moderate';
    tierColor = '#38bdf8'; // Sky Cyan
    glowColor = 'rgba(56, 189, 248, 0.25)';
  } else if (totalScore >= 25) {
    tier = 'Developing';
    tierColor = '#f59e0b'; // Amber
    glowColor = 'rgba(245, 158, 11, 0.25)';
  }

  // 5. METRICS BREAKDOWN
  const metrics: CloningQualityMetric[] = [
    {
      id: 'source-count',
      label: 'Reference Sources',
      value: `${sources.length} document${sources.length === 1 ? '' : 's'}`,
      points: Math.min(30, sources.length * 10),
      maxPoints: 30,
      description: 'Uploaded PDFs, text manuscripts, and URLs providing lexical grounding.',
      status: sources.length >= 2 ? 'optimal' : sources.length === 1 ? 'good' : 'warning'
    },
    {
      id: 'source-volume',
      label: 'Grounding Text Depth',
      value: `${estimatedTokens.toLocaleString()} tokens (${totalTextLength.toLocaleString()} chars)`,
      points: totalTextLength > 2000 ? 15 : totalTextLength > 800 ? 11 : totalTextLength > 200 ? 7 : 0,
      maxPoints: 15,
      description: 'Linguistic volume used to align pronunciation patterns and phrasing.',
      status: totalTextLength > 1000 ? 'optimal' : totalTextLength > 200 ? 'good' : 'warning'
    },
    {
      id: 'acoustic-samples',
      label: 'Acoustic Vault Clips',
      value: `${personaSamples.length} audio clip${personaSamples.length === 1 ? '' : 's'}`,
      points: Math.min(25, personaSamples.length * 10),
      maxPoints: 25,
      description: 'Stored audio recordings establishing vocal timbre and formant peaks.',
      status: personaSamples.length >= 2 ? 'optimal' : personaSamples.length === 1 ? 'good' : 'empty'
    },
    {
      id: 'base-reference',
      label: 'Primary Base Timbre',
      value: hasBaseReference ? 'Active & Calibrated' : 'Not Designated',
      points: hasBaseReference ? 15 : 0,
      maxPoints: 15,
      description: 'Definitive acoustic anchor used as seed reference for speech synthesis.',
      status: hasBaseReference ? 'optimal' : 'warning'
    },
    {
      id: 'audio-duration',
      label: 'Acoustic Training Length',
      value: `${Math.round(totalAudioDuration)}s recorded`,
      points: totalAudioDuration >= 45 ? 10 : totalAudioDuration >= 20 ? 7 : totalAudioDuration >= 5 ? 4 : 0,
      maxPoints: 10,
      description: 'Total length of high-fidelity 24kHz/48kHz vocal reference audio.',
      status: totalAudioDuration >= 30 ? 'optimal' : totalAudioDuration >= 10 ? 'good' : 'empty'
    }
  ];

  // 6. RECOMMENDATIONS TO REACH MAXIMUM FIDELITY
  const recommendations: string[] = [];
  if (sources.length === 0) {
    recommendations.push('Upload at least one reference document, monologue script, or lore manuscript (+15-25% score).');
  } else if (totalTextLength < 800) {
    recommendations.push('Add more speech transcripts or dialogue lines to surpass 800 characters (+4-8% score).');
  }

  if (personaSamples.length === 0) {
    recommendations.push('Record or import a short 10-30s vocal snippet in the Live Recorder tab (+20% score).');
  } else if (!hasBaseReference) {
    recommendations.push('Designate one of your vault samples as the "Primary Base Reference" (+15% score).');
  } else if (totalAudioDuration < 30) {
    recommendations.push('Add an additional audio snippet to reach >30s of total acoustic reference (+6% score).');
  }

  if (recommendations.length === 0) {
    recommendations.push('Optimal synthesis fidelity achieved! Ready for real-time low-latency voice streaming.');
  }

  return {
    score: totalScore,
    tier,
    tierColor,
    glowColor,
    sourceScore: normalizedSourceScore,
    acousticScore: normalizedAcousticScore,
    totalSourcesCount: sources.length,
    fileSourcesCount: fileSources.length,
    urlSourcesCount: urlSources.length,
    totalTextLength,
    estimatedTokens,
    audioSamplesCount: personaSamples.length,
    hasBaseReference,
    totalAudioDurationSeconds: totalAudioDuration,
    metrics,
    recommendations
  };
}
