import { buildHydrationPrompt, loadHiveCamelotSnapshot, UkgToonSnapshot } from './ukg-toon-loader';

export interface HydratedCrystalContext {
  snapshotId: string;
  target: string;
  status: string;
  hydrationPrompt: string;
  systemLaw: {
    tenantSafe: boolean;
    reviewGated: boolean;
    ledgerLogged: boolean;
    localFirst: boolean;
    clientNoKernel: boolean;
  };
  activeChain: string[];
  hydrationRefs: string[];
  mountedAt: string;
}

export function hydrateUkgCrystal(snapshot: UkgToonSnapshot = loadHiveCamelotSnapshot()): HydratedCrystalContext {
  return {
    snapshotId: snapshot.id,
    target: snapshot.target,
    status: snapshot.status,
    hydrationPrompt: buildHydrationPrompt(snapshot),
    systemLaw: {
      tenantSafe: true,
      reviewGated: true,
      ledgerLogged: true,
      localFirst: true,
      clientNoKernel: true,
    },
    activeChain: ['ANYA', 'ALEX', 'MERLIN', 'LINK', 'WORKERS', 'GATES', 'LUKAS'],
    hydrationRefs: snapshot.hydrationRefs,
    mountedAt: new Date().toISOString(),
  };
}

export function detectHydrationCommand(input: string): boolean {
  return /\/\/HYDRATE|hydrate\s+the\s+crystal|hydrate\s+ukg/i.test(input);
}

export function applyHydratedCrystalToContext(context: Record<string, unknown>, hydrated = hydrateUkgCrystal()) {
  return {
    ...context,
    ukgCrystal: hydrated,
    systemLaw: hydrated.systemLaw,
    activeChain: hydrated.activeChain,
    hydrationRefs: hydrated.hydrationRefs,
    hydratedCrystalId: hydrated.snapshotId,
  };
}
