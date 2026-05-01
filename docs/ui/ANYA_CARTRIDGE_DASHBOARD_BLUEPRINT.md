# Anya Cartridge Dashboard Blueprint

Multivoice Router + Project Crusade UI + Camelot-OS

## Correct Goal

Each Camelot cartridge gets its own Anya UI dashboard. A cartridge is a quest package, so its dashboard is the quest command center.

```text
Anya UI
  -> loads active cartridge
  -> mounts cartridge-specific dashboard
  -> displays tools, Knights, telemetry, approvals, logs, memory refs, edge actions
```

## Why Project Crusade Fits

`v0-project-crusade` is a Next 16 / React 19 / Radix / Tailwind / Recharts interface shell. Its landing page is composed from modular components such as `AnimatedGrid`, `Header`, `Hero`, `Services`, `Process`, `Stats`, `CTA`, and `Footer`, which means its visual system can be reused as the Anya operator cockpit shell. The package includes Radix primitives, cmdk, Recharts, and other dashboard-friendly dependencies.

## UI Architecture

```text
Project Crusade Shell
  -> Anya Edge Console
    -> CartridgeDashboardHost
      -> Dashboard Manifest Registry
        -> ANT Dashboard
        -> BEAVER Dashboard
        -> SPIDER Dashboard
        -> OCTOPUS Dashboard
        -> future custom cartridge dashboards
```

## Core Concepts

### 1. Cartridge UI Manifest

Each cartridge exports UI metadata:

- title
- mode
- lead Knight
- glyph
- panels
- actions
- telemetry widgets
- approval needs
- edge worker targets

### 2. Dashboard Host

The host receives the active cartridge ID or mode and renders the matching dashboard.

### 3. Shared Event Bus

Dashboards subscribe to events:

- command queued
- route selected
- worker started
- worker completed
- approval required
- memory written
- ledger event created
- error/degraded state

### 4. Edge Worker Action Panel

Each dashboard can invoke safe actions for:

- PhoneClaw Android
- Superpowers Chrome
- RustDesk desktop
- Termux CLI

### 5. HITL Overlay

Any dangerous action launches approval UI before execution.

## Dashboard Types

### ANT Dashboard

Lead Knight: Lady Apis

Panels:

- Research query
- Source list
- Fit/gap table
- Citation confidence
- UKG findings

Primary workers:

- Chrome/Superpowers
- Cloud research worker

### BEAVER Dashboard

Lead Knight: Sir Forge

Panels:

- Blueprint
- Task DAG
- Patch preview
- Build/test status
- Antigravity envelope

Primary workers:

- Termux CLI
- RustDesk desktop
- Local runtime

### SPIDER Dashboard

Lead Knight: Sir Link

Panels:

- Tool manifests
- WebMCP discovery
- API handshake status
- Route map
- Retry/dead-letter queue

Primary workers:

- Chrome/Superpowers
- Aether router

### OCTOPUS Dashboard

Lead Knight: Sir Debug

Panels:

- Incident timeline
- Logs
- Repro steps
- Root-cause notes
- Recovery patch

Primary workers:

- Termux CLI
- RustDesk desktop
- Rotel telemetry

## Implementation Path

```text
1. Add cartridge dashboard manifests.
2. Add dashboard event bus.
3. Add dashboard host component.
4. Add starter dashboards.
5. Mount host in Anya UI shell.
6. Connect dashboard actions to EdgeCommand schema.
7. Stream command queue and approval state into dashboard.
```

## Golden Rule

Anya is the edge interface. Every cartridge gets a dashboard, but every dashboard obeys Camelot governance.
