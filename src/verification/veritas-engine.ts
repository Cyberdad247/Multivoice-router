export interface VeritasInput {
  content: unknown;
  prd?: string;
  sources?: Array<{ id: string; title?: string; url?: string; excerpt?: string }>;
  requiresCitations?: boolean;
  stage?: 'forge_code' | 'veritas_audit' | 'octopus_tests' | 'final_response';
}

export interface VeritasFinding {
  severity: 'info' | 'warning' | 'error';
  code: string;
  message: string;
}

export interface VeritasOutput {
  ok: boolean;
  hallucinationRisk: 'low' | 'medium' | 'high';
  citationStatus: 'not_required' | 'missing' | 'partial' | 'satisfied';
  prdAlignment: 'unknown' | 'aligned' | 'possible_drift' | 'misaligned';
  aegisLoop: {
    forgeCode: boolean;
    veritasAudit: boolean;
    octopusTests: boolean;
  };
  findings: VeritasFinding[];
}

function textOf(input: unknown): string {
  if (typeof input === 'string') return input;
  try { return JSON.stringify(input); } catch { return String(input); }
}

function hasCitationMarkers(text: string) {
  return /(https?:\/\/|\[[0-9]+\]|cite|source|filecite|oaicite)/i.test(text);
}

function estimateHallucinationRisk(text: string, sourcesCount: number): VeritasOutput['hallucinationRisk'] {
  if (/latest|current|verify|research|statistic|price|law|medical|financial/i.test(text) && sourcesCount === 0) return 'high';
  if (/always|never|guarantee|proven|100%/i.test(text) && sourcesCount === 0) return 'medium';
  return 'low';
}

function checkPrdAlignment(text: string, prd?: string): VeritasOutput['prdAlignment'] {
  if (!prd) return 'unknown';
  const prdTerms = new Set(prd.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).slice(0, 80));
  const outTerms = new Set(text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
  let hits = 0;
  prdTerms.forEach(term => { if (outTerms.has(term)) hits += 1; });
  const ratio = hits / Math.max(1, prdTerms.size);
  if (ratio > 0.3) return 'aligned';
  if (ratio > 0.12) return 'possible_drift';
  return 'misaligned';
}

export function runVeritas(input: VeritasInput): VeritasOutput {
  const text = textOf(input.content);
  const sourcesCount = input.sources?.length || 0;
  const findings: VeritasFinding[] = [];

  const hallucinationRisk = estimateHallucinationRisk(text, sourcesCount);
  if (hallucinationRisk !== 'low') findings.push({ severity: hallucinationRisk === 'high' ? 'error' : 'warning', code: 'HALLUCINATION_RISK', message: `Hallucination risk is ${hallucinationRisk}.` });

  const requiresCitations = Boolean(input.requiresCitations || /latest|current|verify|research|source|cite|statistic|price|law|medical|financial/i.test(text));
  let citationStatus: VeritasOutput['citationStatus'] = 'not_required';
  if (requiresCitations) {
    if (sourcesCount === 0 && !hasCitationMarkers(text)) citationStatus = 'missing';
    else if (sourcesCount > 0 && !hasCitationMarkers(text)) citationStatus = 'partial';
    else citationStatus = 'satisfied';
  }
  if (citationStatus === 'missing') findings.push({ severity: 'error', code: 'CITATIONS_MISSING', message: 'Citations are required but missing.' });
  if (citationStatus === 'partial') findings.push({ severity: 'warning', code: 'CITATIONS_PARTIAL', message: 'Sources are present but citation markers are not explicit.' });

  const prdAlignment = checkPrdAlignment(text, input.prd);
  if (prdAlignment === 'misaligned') findings.push({ severity: 'error', code: 'PRD_MISALIGNMENT', message: 'Output appears misaligned with PRD.' });
  if (prdAlignment === 'possible_drift') findings.push({ severity: 'warning', code: 'PRD_DRIFT', message: 'Output may be drifting from PRD.' });

  const aegisLoop = {
    forgeCode: input.stage === 'forge_code' || input.stage === 'veritas_audit' || input.stage === 'octopus_tests' || input.stage === 'final_response',
    veritasAudit: true,
    octopusTests: input.stage === 'octopus_tests' || input.stage === 'final_response'
  };

  const ok = !findings.some(f => f.severity === 'error');

  return { ok, hallucinationRisk, citationStatus, prdAlignment, aegisLoop, findings };
}
