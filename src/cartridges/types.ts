/**
 * Cartridge system types.
 *
 * A cartridge is a bounded capability unit: it declares features, contracts,
 * and status, but never mints authority. The UI renders exclusively from
 * registered manifests — no cartridge is hardcoded into views.
 */

export type CartridgeStatus =
  | 'draft'
  | 'specified'
  | 'in_progress'
  | 'not_production_ready'
  | 'pilot'
  | 'production'
  | 'deprecated';

export type FeatureStatus =
  | 'specified'
  | 'decided'
  | 'in_progress'
  | 'blocked'
  | 'verified'
  | 'deprecated';

export interface CartridgeFeature {
  id: string;
  title: string;
  description: string;
  status: FeatureStatus;
  docsRef?: string;
}

export interface CartridgeContractRef {
  name: string;
  version: string;
  summary: string;
}

export interface CartridgeSource {
  repoUrl: string;
  docsPath?: string;
  upstreamUrl?: string;
}

export interface CartridgeManifest {
  /** Stable id, e.g. "camelot.communications" */
  id: string;
  name: string;
  version: string;
  description: string;
  status: CartridgeStatus;
  features: CartridgeFeature[];
  contracts: CartridgeContractRef[];
  invariants: string[];
  source: CartridgeSource;
}
