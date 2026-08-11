/**
 * Bifrost Bridge — public surface.
 *
 * Sir Heimdall (L2, order: sentinels) guards every crossing. See
 * docs/architecture/BIFROST_HEIMDALL_ARCH_GUARDIAN.md for the full design and
 * the node-side daemons in services/heimdall-gatekeeper (Rust) and
 * services/bifrost-broker (Go).
 */

export * from './types';
export * from './transport-registry';
export * from './device-registry';
export * from './session-token';
export * from './gjallarhorn';
export * from './heimdall-guardian';
export * from './bifrost-session';
export * from './autonomous-supervisor';
export * from './bifrost-runtime';

// Per-node desktop provisioning
export * from './desktop/stream-profile';
export * from './desktop/transport-configs';
export * from './desktop/node-provisioner';

// Monitoring
export * from './observability/session-journal';
export * from './observability/node-telemetry';

// Camelot Defense Redteam
export * from './redteam/redteam-probes';
export * from './redteam/redteam-runner';

// Private CI/CD over the bridge
export * from './cicd/pipeline-schema';
export * from './cicd/pipeline-authorization';
export * from './cicd/pipeline-runtime';
