export type CandidateStrategy = 'local_first' | 'cloud_swarm' | 'hybrid';

export interface StrategyCandidate {
  name: CandidateStrategy;
  notes: string[];
  score: number;
}

export function scoreStrategy(intent: string, targetNode: string, temperature: number): StrategyCandidate[] {
  const isDesktopOrCli = ['termux', 'rustdesk'].includes(targetNode);
  const isBrowser = targetNode === 'superpowers_chrome';
  const isAndroid = targetNode === 'phoneclaw';

  const localScore = (isDesktopOrCli || isAndroid ? 0.72 : 0.45) + (temperature < 0.5 ? 0.12 : 0);
  const cloudScore = (/research|analyze|generate|summarize/i.test(intent) ? 0.72 : 0.42) + (temperature > 1 ? 0.12 : 0);
  const hybridScore = (isBrowser ? 0.78 : 0.64) + (temperature >= 0.6 && temperature <= 1 ? 0.1 : 0);

  return [
    { name: 'local_first', score: localScore, notes: ['prefer edge/local action when feasible'] },
    { name: 'cloud_swarm', score: cloudScore, notes: ['prefer Modal/cloud workers for heavy reasoning or batch jobs'] },
    { name: 'hybrid', score: hybridScore, notes: ['split planning and execution across cloud + edge'] },
  ].sort((a, b) => b.score - a.score);
}
