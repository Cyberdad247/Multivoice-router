import type { CartridgeManifest, CartridgeFeature } from './types';

const registry = new Map<string, CartridgeManifest>();

export function registerCartridge(manifest: CartridgeManifest): void {
  if (registry.has(manifest.id)) {
    throw new Error(`Cartridge already registered: ${manifest.id}`);
  }
  registry.set(manifest.id, manifest);
}

export function getCartridge(id: string): CartridgeManifest | undefined {
  return registry.get(id);
}

export function listCartridges(): CartridgeManifest[] {
  return [...registry.values()];
}

export function getCartridgeFeatures(id: string): CartridgeFeature[] {
  return registry.get(id)?.features ?? [];
}

/** All features across all cartridges, tagged with their cartridge id. */
export function listAllFeatures(): Array<CartridgeFeature & { cartridgeId: string }> {
  return [...registry.values()].flatMap((c) =>
    c.features.map((f) => ({ ...f, cartridgeId: c.id })),
  );
}
