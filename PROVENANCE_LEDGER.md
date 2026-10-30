# PROVENANCE_LEDGER.md
**Nexus ID**: OMEGA_TITAN_ANTI_GRAVITY_NEXUS  
**Context**: `@ctx|camelot-os.dev/ukg/v1000/anti_gravity_parallel_forge`  
**Type**: `@typ|Sovereign_MetaCompiler_Bootstrap`  
**Root**: `MERLIN_Ω` (System 2 Orchestrator)  
**Edge Ceiling**: `8GB_EDGE_CEILING` (Zero-copy `memfd_create` IPC verified)  
**Timestamp**: 2026-09-11T07:03:00Z  

---

## 1. Directed Acyclic Graph (DAG) Specification

```
[MERLIN_Ω: System 2 Orchestrator]
       │
       ├──> [B.L.A.S.T. Protocol Pipeline]
       │       ├── B_Blueprint (task plan.json, bounding contexts)
       │       ├── L_Link (mTLS MCP servers: FileSystem, GitHub, Figma-to-UI)
       │       ├── A_Architect (Z3-verified SOPs, AST tree-sitter patches)
       │       ├── S_Stylize (Luxury Minimalist Brutalism: Obsidian / Gold / Cyan)
       │       └── T_Trigger (Parallel WASM32-WASI test suites)
       │
       └──> [Parallel Knight Bio-Kinetic Swarm]
               ├── Sir_Codex (Backend / WASM32-WASI / Zero-Copy Bifrost IPC)
               ├── Sir_Boris (Frontend / 3D Kinetics / R3F & Spring Physics)
               └── Sir_Gideon (Verification / Iron Gate / Z3 SMT-LIB Audits)
```

---

## 2. Cross-Agent State Verification

| Agent ID | Domain | MicroVM State (CoW) | IPC Target | Verified |
| :--- | :--- | :--- | :--- | :---: |
| **MERLIN_Ω** | Root Orchestration | Master Context (0.00 MiB Δ) | `memfd_create` /dev/shm | [x] |
| **Sir_Codex** | WASM / Zero-Copy Backend | Forked (Δ ≤ 0.08 MiB) | Bifrost WebSockets / IPC | [x] |
| **Sir_Boris** | 3D Kinetics / UI Carousel | Forked (Δ ≤ 0.11 MiB) | GPU Render Pipeline / R3F | [x] |
| **Sir_Gideon** | Iron Gate Verification | Forked (Δ ≤ 0.04 MiB) | SMT-LIB Z3 Shadow Sandbox | [x] |

---

## 3. UI Stage Artifact Manifest
- **Hero Stage Visual**: `https://i.postimg.cc/HLbzLvC3/Chat-GPT-Image-Sep-11-2026-09-57-53-AM.png`
- **Visual Style**: Luxury Minimalist Brutalism (`#090a0f` Obsidian, `#f59e0b`/`#d97706` Gold, `#06b6d4`/`#22d3ee` Cyan)
- **Kinetic Engine**: `motion/react` spring physics, CSS 3D transforms (`preserve-3d`, depth perspective, focal illumination).
- **Audio Synthesis**: Native Web Audio API generative soundscapes (Laboratory, Coffee Shop, Neon Rain, Deep Space) with bidirectional conversation intensity dynamic volume ducking and reactive swell.
- **Security Check**: Non-breaking, zero security constraint mutation. Security rules untouched.

---

## 4. Landed Work — Provenance Entries (2026-10-22 → 2026-10-29)

Synced against live VPS truth at each landing; every entry names its verification.

| Date (EDT) | Entry | Artifact / Hash | Verified by |
| :--- | :--- | :--- | :--- |
| 2026-10-22 | Mistral Voxtral voice (Heimdall + Hermes) + Excalibur command center (`src/excalibur/`: registry, fail-closed consent gate, ⚔ tab, `/api/excalibur/*`) committed + pushed | `bcdfeed` on `Cyberdad247/Multivoice-router` main (`26c1575..bcdfeed`) | tsc clean; full suite 109/109 (16 Excalibur + 15 Voxtral tests) |
| 2026-10-22 | Multivoice-router server deployed to Hermes VPS (Watchtower service `multivoice-router`, :3000, boot_order 12) | git-archive of `bcdfeed`, sha256 verified on-box; source at `/opt/data/multivoice-router`; `.env` 0600 (Mistral key copied on-box) | On-box: mistral/status configured, `/api/excalibur/registry` 15 components, UI 200 "Knight Armor — The Voice Citadel" |
| 2026-10-22 | Graphify code graph (first graph seam): graphifyy 0.9.94, code pass only, 0 LLM tokens — 886 nodes / 2,195 edges / 36 communities from 140 files | committed + pushed as `ecc85ca` (`bcdfeed..ecc85ca`), 49 files incl. `graphify-out/` | `graphify explain evaluateCrossing` + BFS query return the real Excalibur gate graph; report built-from `bcdfeed` |
| 2026-10-26 | VPS router updated `bcdfeed` → `ecc85ca` | git-archive tarball sha256 `7700e1f598a1e21ede79da1c563093983c5190013c62125d4559c4b6d4a81dc4`, uploaded in 512KB parts to `/opt/data/multivoice-update/`; `.env` preserved, lockfile unchanged (npm ci skipped), vite build, Watchtower restart PID 981 → 431739 | On-box: :3000 health ok; `/api/excalibur/registry` serves the Graphify run note; status BoB probe 200; Bifrost :8180 200; RoundTable :8182 `/v1/models` 200; monitored redis/qdrant/openviking up. Rollback: tarball + `registry.ts.bak-bcdfeed` in `/opt/data/multivoice-update/` |
| 2026-10-29 | Live knight-roster verification (3 checks, all landed) | Live reads: `knights.json`, Watchtower :8099, knight-voice :8190 | 4 knights, all `model_url` :8182/v1 + nemotron-3.5-lightning:free, ATOM_URL :8182 agrees; voice spk 0/2/4/6, Heimdall engine `mistral`; knight-voice lists 4 knights + hermes, `mistral_configured: true` |
| 2026-10-29 | **Heimdall memory block granted** — the roster gap found the same day, closed | Notebook `notebook:ry5cupv8xm24le30j8d9`; backup `/opt/data/cloudbrain/handoff/knights.json.bak-heimdall-mem-20261029-234341`; seed note `note:4t7kexntj0g3vbexgrj5` | Memory block mirrors Gawain's shape (`recall_n` 5, `write` true, `write_triggers` ["chat"]); seed note full-body read-back ok (326 chars); runtime restarted PID 314016 → 339295, all 4 `loop start` at 23:44:16 UTC, all 4 heartbeats fresh |

**Open items carried by this ledger:** Watchtower `knights` state map still lists 3 knights (Heimdall tracked as bridge guardian — visibility gap, not liveness); Mnemosyne `duty` field null in knights.json (Watchtower carries her as chat duty); registry states still honestly `not-integrated` for CodeGraph + Understand-Anything, `adapter-stub` for Graphiti, `design-only` for MemCastle.

---

## 5. Hermes Control Plane — Provenance Entries (synced 2026-10-29)

Hermes (NousResearch hermes-agent, MIT) is the VPS control plane: all box operations ride its jobs / files / cron APIs. Full comparison: `docs/HERMES-CANONICAL-COMPARISON.md` (companion to §4's HTMX comparison).

| Date (EDT) | Entry | Evidence |
| :--- | :--- | :--- |
| 2026-10-05 | Hermes dashboard chat rewired to the VPS Bifrost gateway: provider `custom`, `base_url http://127.0.0.1:8180/v1` | Config backed up on-box (`config.yaml.bak-20261005`); Bifrost answered a live chat completion before the change; gateway restarted `state=running`, dashboard ok |
| 2026-10-22 → 10-26 | Router deploy + update (§4) executed entirely through the Hermes control surface | One-shot jobs created/triggered/deleted by exact name via API; files staged under `/opt/data/` (files API runs as `hermes`, cannot write `/root`) |
| 2026-10-26 | Deployment baseline recorded | Hermes **0.20.5**, gateway running; box load 0.00/0.08/0.08, RAM 4,168/7,941 MB used at baseline |
| 2026-10-27 → 10-28 | Revive chain proven around Hermes: host s6 resurrects the gateway (~20s kill test); reboot drill returns ALL SERVICES UP (7/7); Hermes Prime settled as a read-only MGV observer (60s host timer, 56,277 cycles, starts nothing) | Boot report on a real boot; Prime phial + state file read on the host |
| 2026-10-29 | Version position recorded (no upgrade scheduled — user's call) | Deployed **0.20.5** vs upstream **v0.22.5** (2026-10-22, repo HEAD `088f657`): two minor lines behind; upstream v0.22.2 fixed the gateway-after-reboot liveness class the local revive chain defends against |
