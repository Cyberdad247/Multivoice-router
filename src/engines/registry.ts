import { CamelotEngine, EngineId } from './types';

const registry = new Map<EngineId, CamelotEngine>();

export function registerEngine(engine: CamelotEngine) {
  registry.set(engine.id, engine);
}

export function getEngine(id: EngineId): CamelotEngine | undefined {
  return registry.get(id);
}

export function listEngines(): CamelotEngine[] {
  return Array.from(registry.values());
}
