# Anya Interphase Assimilation Audit

Source: `Cyberdad247/anya-interphase`  
Target: `Cyberdad247/Multivoice-router` + Project Crusade / Anya UI layer

## Verdict

`anya-interphase` should be assimilated as the primary **Anya Edge Cockpit** inspiration layer.

It is more directly aligned with the intended product than a generic landing page shell because it already contains:

- voice orb / listening state,
- sovereign cockpit layout,
- mobile responsive sidebar,
- terminal console via xterm,
- visual stream panel / OmniEye,
- swarm telemetry panel,
- archive, system, governance, telephony, omni-route, and Hive IDE tabs,
- PWA-ready dependency stack,
- LiveKit dependency stack for realtime voice/video potential.

## What It Is

```text
anya-interphase
= Anya edge cockpit shell
+ voice interface
+ remote visual bridge
+ swarm telemetry
+ sovereign console
+ PWA/mobile shell
```

## What It Should Become

```text
Anya Interphase
  -> visual cockpit shell
  -> dynamic cartridge dashboards
  -> multivoice/council/podcast controls
  -> PhoneClaw panel
  -> Superpowers Chrome panel
  -> RustDesk/OmniEye panel
  -> Termux/Hive console
  -> HITL approval queue
  -> Camelot runtime event stream
```

## Source Repo Observations

### Package Stack

The source uses Vite, React 19, Tailwind, Framer Motion, LiveKit, xterm, lucide-react, and Vite PWA. This is ideal for an installable edge cockpit and realtime voice/console interface.

### App Shell

The app mounts:

- `MatrixBackground`
- `SovereignHeader`
- `OmniEye`
- `SwarmMatrix`
- `SovereignConsole`
- `FactionHub`
- `ResearchArchives`
- `SystemHub`
- `QuestLog`

It uses tabs:

```text
bridge
faction
archives
hive
governance
telephony
omni
system
```

These tabs map cleanly to Anya/Camelot modules.

### Sovereign Console

`SovereignConsole` uses xterm and currently prints boot/status lines such as Bifrost identity, Tailscale tunnel active, and a Camelot prompt. This should become the operator command console for guarded commands.

### OmniEye

`OmniEye` is a visual stream shell with quality controls, visual siphon toggle, and Tailscale handshake messaging. This maps directly to RustDesk / Chrome Remote Desktop / PhoneClaw visual state.

### SwarmMatrix

`SwarmMatrix` shows agent species and an Auto-Forge repair action. This should be wired to command queue, worker status, and cartridge event bus instead of local mock state.

## Assimilation Strategy

Do not blindly copy the whole repo into Multivoice-router.

Use a two-layer strategy:

```text
Layer A: anya-interphase remains UI cockpit repo or package.
Layer B: Multivoice-router provides runtime contracts, events, voice routing, cartridge dashboards, and edge commands.
```

## Recommended Monorepo Layout

```text
apps/anya-interphase
  Vite PWA cockpit from anya-interphase

packages/camelot-runtime
  runtime, queue, workers, provenance, memory

packages/anya-ui-contracts
  cartridge manifests, edge action schema, voice profiles, event bus
```

If staying in separate repos:

```text
anya-interphase imports contracts from Multivoice-router package/export
Multivoice-router exposes API/WebSocket/SSE for runtime events
```

## Panel Mapping

| Anya Interphase Tab | Assimilated Role |
|---|---|
| bridge | Main Anya command center, OmniEye, SwarmMatrix, QuestLog |
| faction | Knight roster, persona/voice profiles, council mode |
| archives | Ouroboros memory, UKG snapshots, research archive |
| hive | Hive IDE / Termux / xterm / patch console |
| governance | HITL approvals, Veritas, Gideon, Antigravity |
| telephony | voice modes, multivoice, LiveKit, podcast automation |
| omni | OmniRoute + OmniVoice route/cost monitoring |
| system | devices, Tailscale, workers, health, metrics |

## Required Runtime Connections

The UI should subscribe to:

- cartridge dashboard events,
- command queue events,
- edge worker heartbeats,
- approval requests,
- voice session state,
- OmniVoice render receipts,
- memory refs,
- ledger events.

## Assimilation Priorities

### Phase 1: UI Contracts

- Import cartridge dashboard manifests.
- Import edge action schema.
- Import voice profile registry.
- Import OmniVoice router receipts.
- Import event bus types.

### Phase 2: Dashboard Wiring

- Replace mock SwarmMatrix data with command/worker telemetry.
- Replace OmniEye mock with edge visual stream refs.
- Replace SovereignConsole static boot text with runtime command transport.
- Add CartridgeDashboardHost to bridge tab.

### Phase 3: Voice Layer

- Use LiveKit for realtime voice rooms where available.
- Use browser/device/local TTS fallback through OmniVoice.
- Add Council and Podcast mode panels.

### Phase 4: Edge Control

- PhoneClaw Android card.
- Superpowers Chrome card.
- RustDesk desktop card.
- Termux/Hive console card.

## Safety Requirements

- UI must not send `approved: true` directly into runtime.
- Approval must resolve through approval records.
- Shell/delete/publish/message/payment must always show HITL modal.
- OmniVoice paid lanes must require explicit approval.
- Edge actions must use typed `EdgeCommand` objects.

## Golden Rule

Anya Interphase is the cockpit. Multivoice Router is the routing throat. Camelot is the governed brain. PhoneClaw, Superpowers Chrome, RustDesk, and Termux are the hands.
