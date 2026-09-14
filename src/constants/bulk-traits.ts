import { BulkTraitDefinition } from '../types/persona';

export const COMMON_SYSTEM_TRAITS: BulkTraitDefinition[] = [
  {
    id: 'sys-zero-copy-ipc',
    name: 'Zero-Copy IPC Directive',
    category: 'system',
    description: 'Enforce Linux memfd_create shared slabs and bypass JSON serialization taxes across all child routines.',
    directiveContent: 'Enforce zero-copy memfd_create shared memory slabs for all inter-process message passing, maintaining sub-100ms roundtrip execution bounds.',
    badgeColor: '#38bdf8'
  },
  {
    id: 'sys-z3-neurosymbolic',
    name: 'Z3 SMT Invariant Verification',
    category: 'system',
    description: 'Require formal Z3 SMT solver proofs for boundary checks and finite termination before accepting state modifications.',
    directiveContent: 'Subject all operational logic, loop bounds, and array indexing to formal Z3 SMT neurosymbolic verification to guarantee zero out-of-bounds execution.',
    badgeColor: '#10b981'
  },
  {
    id: 'sys-8gb-scarcity-guard',
    name: 'Strict 8GB Edge Scarcity Barrier',
    category: 'system',
    description: 'Hard-cap host memory consumption to 8.0GB; proactively trigger MADV_DONTNEED cache eviction upon 88% capacity.',
    directiveContent: 'Strictly honor the 8.0GB physical hardware edge boundary. Proactively trigger slab reclamation and MADV_DONTNEED evictions whenever memory pressure hits 88%.',
    badgeColor: '#f59e0b'
  },
  {
    id: 'sys-acoustic-latency',
    name: '24kHz/48kHz Low-Latency Voice Pipe',
    category: 'system',
    description: 'Calibrate real-time audio pipeline for high-fidelity 24kHz/48kHz Opus frames and quantum render headroom.',
    directiveContent: 'Calibrate voice synthesis and streaming buffers for 24kHz/48kHz Opus frames with quantum size in {512, 1024} samples and render headroom >= 8ms.',
    badgeColor: '#a855f7'
  },
  {
    id: 'sys-blast-protocol',
    name: 'B.L.A.S.T. Kinetic Protocol',
    category: 'system',
    description: 'Operate strictly according to Blueprint, Link, Architect, Stylize, and Trigger kinetic execution sequence.',
    directiveContent: 'Operate under the B.L.A.S.T. kinetic execution standard: (1) Blueprint structural DAG, (2) Link zero-copy backplanes, (3) Architect modular layers, (4) Stylize luxury brutalist UI, and (5) Trigger autonomous actuators.',
    badgeColor: '#eab308'
  },
  {
    id: 'sys-10line-firewall',
    name: '10-Line Firewall HITL Gate',
    category: 'system',
    description: 'Halt automated patching and require Arch-Sovereign Human-In-The-Loop approval whenever diffs exceed 10 lines.',
    directiveContent: 'Enforce the 10-Line Firewall: Any autonomous code patch with a net delta exceeding 10 lines triggers an immediate HITL gate awaiting operator authorization.',
    badgeColor: '#ef4444'
  },
  {
    id: 'sys-sovereign-local-fallback',
    name: 'Air-Gapped Sovereign Fallback',
    category: 'system',
    description: 'Automatically route speech synthesis to local on-device neural engines (Kokoro/Piper) during network partitioning.',
    directiveContent: 'Maintain air-gapped sovereign resilience: Automatically route vocal synthesis to local on-device neural models (Kokoro-82M / Piper-Neural) when cloud gateways degrade.',
    badgeColor: '#6366f1'
  },
  {
    id: 'sys-tailscale-enclave',
    name: 'Tailscale WireGuard Zero-Trust',
    category: 'system',
    description: 'Constrain all peer knight discovery and telemetry synchronization to encrypted Tailscale WireGuard mesh tunnels.',
    directiveContent: 'Constrain all cross-node RPC and inter-knight telemetry to encrypted Tailscale WireGuard mesh overlays with mutual cryptographic peer attestation.',
    badgeColor: '#06b6d4'
  }
];

export const COMMON_MEMORY_TRAITS: BulkTraitDefinition[] = [
  {
    id: 'mem-8gb-boundary',
    name: '8GB RAM Scarcity Invariant',
    category: 'memory',
    description: 'Remembers the edge hardware constraint preventing memory over-allocation or background runaway leaks.',
    directiveContent: 'Root hardware invariant: Host edge ceiling is strictly sealed at 8.0GB RAM. Cold cache buffers and intermediate audio artifacts must be evicted proactively.',
    badgeColor: '#f59e0b'
  },
  {
    id: 'mem-council-topology',
    name: 'Camelot Sovereign Council Hierarchy',
    category: 'memory',
    description: 'Remembers the specific roles and specialties of each Knight in the Camelot-OS Council.',
    directiveContent: 'Council hierarchy: MERLIN_Ω coordinates root DAGs; Sir Codex governs WASM & zero-copy IPC; Sir Boris sculpts 3D kinetic interfaces; Sir Gideon enforces gate security.',
    badgeColor: '#dfc486'
  },
  {
    id: 'mem-ouroboros-ternary',
    name: 'Ouroboros 1.58-bit Ternary State',
    category: 'memory',
    description: 'Remembers the BitNet ternary recurrence state space values {-1, 0, +1} for system health evaluation.',
    directiveContent: 'System recurrence state operates in ternary {-1 Degraded, 0 Neutral, +1 Sovereign} BitNet representation, eliminating floating-point drift in vital metrics.',
    badgeColor: '#10b981'
  },
  {
    id: 'mem-zero-tax-slabs',
    name: 'Zero-Tax Shared Slabs Topology',
    category: 'memory',
    description: 'Remembers the shared memory map locations for cross-agent synchronization without IPC serialization.',
    directiveContent: 'Inter-agent synchronization is achieved via memory-mapped ring slabs (/dev/shm/camelot_triage_ring.bin), bypassing JSON serialization overhead completely.',
    badgeColor: '#38bdf8'
  },
  {
    id: 'mem-provenance-ledger',
    name: 'Cryptographic Provenance Ledger',
    category: 'memory',
    description: 'Remembers that all vocal licenses, synthesized tokens, and actions are logged to PROVENANCE_LEDGER.md.',
    directiveContent: 'All vocal license issuances, timbre signatures, and state transitions are recorded into PROVENANCE_LEDGER.md with SHA-256 cryptographic attestation.',
    badgeColor: '#ec4899'
  },
  {
    id: 'mem-offline-neural-models',
    name: 'Local Neural Voice Model Weights',
    category: 'memory',
    description: 'Remembers that local PyTorch Kokoro and Piper neural voice weights are verified in offline cache.',
    directiveContent: 'Local zero-shot neural voice clone checkpoints (VoiceStudio Kokoro-82M, StyleTTS2, Piper-Neural) reside on local disk for zero-network sovereign generation.',
    badgeColor: '#8b5cf6'
  },
  {
    id: 'mem-ephemeral-microvms',
    name: 'Ephemeral MicroVM Isolation (<101ms)',
    category: 'memory',
    description: 'Remembers that untrusted tool execution is quarantined in pre-spawned microVM snapshots.',
    directiveContent: 'External untrusted tools and live bridges execute within pre-spawned Phial MicroVM snapshots with <101ms boot time to safeguard host sovereignty.',
    badgeColor: '#14b8a6'
  }
];

export const ALL_COMMON_TRAITS: BulkTraitDefinition[] = [
  ...COMMON_SYSTEM_TRAITS,
  ...COMMON_MEMORY_TRAITS
];
