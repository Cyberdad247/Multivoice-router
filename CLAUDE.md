# CLAUDE.md

Guidance for AI assistants working in this repository.

## What this project is

**Multivoice Router** (package name `multivoice-router`, product name "PersonaLive") is the
voice, persona, and input-compiler layer — designated **L7 / Anya_Ω** — of a larger
architecture the docs call **Camelot-OS**.

Two things live side by side here, and it matters which one you are touching:

1. **A working React + Vite app.** A live multi-persona voice chat UI backed by the Gemini
   Multimodal Live API, with Firebase auth/Firestore persistence and an Express server
   (`server.ts`) that proxies Google OAuth, Google Drive/Docs, Tailscale, and edge-node
   endpoints. This part runs, builds, and is exercised by the smoke test.
2. **A governed-execution runtime spec, partly implemented.** Everything under `src/anya`,
   `src/merlin`, `src/engines`, `src/runtime`, `src/provenance`, `src/security`,
   `src/execution`, `src/memory`, and most of `docs/` describes and scaffolds a pipeline that
   turns speech into signed, policy-checked, human-approvable commands dispatched to edge
   devices. Much of this is **pure TypeScript with no I/O** — registries, schemas, contracts,
   and heuristic engines that return plain objects. Several engines are explicit stubs.

Do not assume a module in group 2 is wired into the running app. Most are reachable only from
the CLI entrypoints or from `runCamelotRuntime`. Check the import graph before claiming a
change affects user-visible behavior.

## Commands

```bash
npm install              # required; node_modules is not committed
npm run dev              # tsx server.ts — Express + Vite middleware on :3000
npm run build            # vite build → dist/
npm run preview          # serve the built dist/
npm run typecheck        # tsc --noEmit  (alias: npm run lint — same command)
npm test                 # tsx src/tests/smoke.test.ts — assertion script, not a test runner
npm run clean            # rm -rf dist

npm run camelot:run -- "//PLAN build a safe patch"   # drive the full runtime once
npm run camelot:worker:dry -- "screenshot desktop"   # in-memory queue + dry-run edge worker
npm run camelot:approve -- <approvalId> approved <resolvedBy>   # scaffold only, see below
npm run camelot:bifrost -- --help                    # drive one Bifrost crossing
```

The Bifrost subsystem also has Rust and Go services with their own toolchains:

```bash
cd services/heimdall-gatekeeper && cargo test    # 24 tests
cd services/bifrost-broker && go vet ./... && go test ./...
```

There is no test framework, no ESLint, and no Prettier. `npm run lint` is just `tsc --noEmit`.
`npm test` is a `node:assert/strict` script that throws on the first failure; add new cases by
appending assertions to `src/tests/smoke.test.ts` and keep the final `console.log` success line.

CI (`.github/workflows/camelot-ci.yml`) runs typecheck, test, and build on Node 20 for pushes
and PRs against `main`. Note `npm ci` there has `continue-on-error: true`, so a dependency
failure shows up as confusing downstream errors rather than a clean install failure.

### Known state of the checks

`npm run typecheck` currently reports **exactly one pre-existing error**:

```
components/GenesisTerminal.tsx(4,32): error TS2307: Cannot find module 'next/font/google'
```

This is not something you introduced. `components/GenesisTerminal.tsx` (repo root, *not*
`src/components/`) is an orphaned Next.js-style component: it is imported by nothing, it sits
outside the `@/ → ./src` alias, and it depends on `next/font/google`, which is not a dependency
of this Vite project. Leave it alone unless the task is specifically about it. If you touch it,
know that `tsc` exits 0 despite printing the error, so a green CI run does not mean the error is
gone — read the output.

Everything else typechecks, `npm test` passes, and `npm run build` succeeds (with a
>500 kB chunk-size warning, which is expected and unaddressed).

## Environment

Copy `.env.example` to `.env.local` (all `.env*` files are gitignored except the example).

- `GEMINI_API_KEY` — required for voice. Injected into the client bundle by `vite.config.ts`
  via `define: { 'process.env.GEMINI_API_KEY': ... }`, so it **ships to the browser**. Keep that
  in mind before adding more secrets to that `define` block.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `SESSION_SECRET` — server-side OAuth for the
  Drive/Docs "cloud brain" features.
- `TAILSCALE_API_KEY` / `TAILSCALE_TAILNET` — optional; `/api/tailscale/devices` returns a 400
  with a descriptive error when unset, and the UI handles that.
- `CAMELOT_SIGNING_SECRET` — required by `npm run camelot:run`; HMAC key for DAG signing.
- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` — only needed for `SupabaseCommandQueue`.
- Firebase config is **not** an env var. It is committed in `firebase-applet-config.json` and
  imported directly by `src/lib/firebase.ts`.

`vite.config.ts` disables HMR when `DISABLE_HMR=true` (used by AI Studio). The comment there
asks not to modify the file-watching setup; respect it.

## Layout

```
server.ts                  Express API + Vite dev middleware (or static dist in production)
index.html                 Vite entry → src/main.tsx
src/
  main.tsx                 ErrorBoundary → AuthProvider → App
  App.tsx                  ~600-line single-page UI; persona list, tabs, Tailscale panel
  components/              App components + components/ui/* (shadcn, "base-nova" style)
  hooks/use-gemini-live.ts Gemini Live session: mic capture, audio playback, transcript
  constants/personas.ts    Seed personas (Nova, Elara, Jax, ...)
  types/                   Persona, Source, TailscaleDevice, diagnostics
  lib/                     firebase.ts, firestore.ts, audio-utils.ts, utils.ts (cn)

  bifrost/                 Sir Heimdall: transport/device registries, guardian, Gjallarhorn
                           alarms, session lifecycle, autonomous supervisor, crossing runtime
  runtime/                 camelot-runtime.ts (the pipeline), command queue adapters, worker contract
  anya/                    APEE input compiler, Titan prompt schema, ledger
  merlin/                  VIDENEPTUS reasoning, scoring, knight forge
  engines/                 9-engine type system, typed registry, stub implementations
  router/                  intent-router (keyword → intent), edge-router (intent → HTTP endpoint)
  policy/                  keyword risk/block lists → approval decisions
  security/                AgentArmor prompt-dependency-graph enforcement
  execution/               ANTIGRAVITY execution envelope and limits
  provenance/              HMAC DAG signing, attestation, ledger events
  memory/                  OUROBOROS, UKG TOON crystals, NotebookLM bridge contracts
  agents/, cartridges/     Knight registry/roster, bio-kinetic cartridge definitions
  voice/, audio/, vision/  Voice routing/budget, LYRICUS, AURORA config
  cli/                     camelot-run, camelot-worker-dry, camelot-approve
  tests/smoke.test.ts      the entire test suite

components/GenesisTerminal.tsx   orphaned; see "Known state of the checks"
config/personas/                 example knight persona override JSON
services/                        rustdesk-edge-agent (TS), kinetic-edge/turboquant.rs (Rust, standalone),
                                 heimdall-gatekeeper (Rust crate), bifrost-broker (Go module)
supabase/migrations/             camelot_commands / camelot_approvals / camelot_devices schema
docs/                            ~35 architecture and spec documents
firestore.rules, security_spec.md
```

## The runtime pipeline

`src/runtime/camelot-runtime.ts` is the spine. `runCamelotRuntime({ input, signingSecret, context, approved })`
runs these stages in order and **returns early with `ok: false` and a `stage` label** on failure:

1. **UKG hydration** — if the input matches a hydration command, merge a TOON memory crystal into context.
2. **Cartridge detection** — `//MODE ANT|BEAVER|SPIDER|OCTOPUS|ALCHEMIST` mounts a bio-kinetic cartridge.
3. **APEE** (`runAnyaCompiler`) — Triple-QFT cleanup, intent extraction, Titan Prompt. Can return an
   `interrupt` for clarification → stage `APEE_INTERRUPT`.
4. **AgentArmor** — builds a prompt-dependency graph and blocks low-integrity sources reaching
   dangerous sinks → stage `AGENTARMOR`.
5. **VIDENEPTUS** — reasoning plan.
6. **DAG signing + attestation** — HMAC-SHA256 over a canonicalized DAG.
7. **VERITAS** — truth audit; only fatal when `riskLevel === 'high'` → stage `VERITAS`.
8. **AETHER** — tool/edge routing.
9. **ANTIGRAVITY** — execution envelope. Blocks or demands approval → stage `HITL_GATE`.
10. **OUROBOROS + ledger event** — always written, on both the gate path and success.

Sinks are classified by **string matching over the serialized route** (`classifySink`), and the
intent router and policy engine likewise work on **keyword lists over lowercased text**. This is
deliberate scaffolding, not a bug to fix incidentally, but it means the guardrails are shallow —
never describe them as robust security.

Risk vocabulary is split across two type systems that do not map onto each other automatically:
`IntentRoute.riskLevel` is `'low' | 'medium' | 'high'`, while `CamelotCommandRecord.riskClass` is
`L0_OBSERVE` … `L5_FORBIDDEN`. Keep them straight.

## The Bifrost Bridge

`src/bifrost/` is a second, parallel pipeline governing *remote access to physical machines*,
guarded by **Sir Heimdall**. `runBifrostCrossing` stages are: `RESOLVE_DEVICE` → `GJALLARHORN`
(alarms) → `HEIMDALL_DENIED` (the guardian) → ANTIGRAVITY → `HITL_GATE` → sign → attest, with
the same early-return-on-failure discipline as `camelot-runtime.ts`.

Three invariants hold it together, and changes must preserve them:

- **Heimdall narrows; ANTIGRAVITY still decides.** An `ALLOW` verdict is permission to *ask*
  the execution gate. `bifrost-runtime.ts` calls `runAntigravity` on every surviving crossing.
- **The bridge is the tailnet.** Transports marked `requiresTailnet` are denied when the
  device has no mesh address. There is no direct fallback.
- **The supervisor may close the bridge autonomously, never widen it.** Failover is emitted as
  `propose_failover` with `requiresReauthorization: true`.

The session envelope's canonical signed form is duplicated in three languages
(`src/bifrost/session-token.ts`, `services/heimdall-gatekeeper/src/token.rs`,
`services/bifrost-broker/internal/token/token.go`) and pinned by a **shared test vector**
asserted in all three suites. If you change the canonical string, scope normalization, or the
timestamp format, you must change all three or the tests fail — which is the point.

Full design and the honest scope of what is implemented:
`docs/architecture/BIFROST_HEIMDALL_ARCH_GUARDIAN.md`.

## Conventions

- **TypeScript, ESM, `.ts`/`.tsx` only.** `"type": "module"`, `moduleResolution: "bundler"`,
  `noEmit: true`. `tsx` runs TypeScript directly for the server and CLIs — there is no build step
  for server-side code.
- **Imports:** app code under `src/` uses the `@/` alias (configured in both `tsconfig.json` and
  `vite.config.ts`). Existing files in `src/` are inconsistent and often use relative paths;
  match the file you are editing rather than converting it.
- **Strict mode is off.** `strict` is not set in `tsconfig.json`, and the codebase leans on
  `any` freely (`server.ts` casts `req as any` for session access). Do not add a repo-wide
  strictness flag as a side effect of another task.
- **Engine modules are pure functions returning plain objects.** `runVeritas`, `runAether`,
  `runAntigravity`, `runOuroboros`, etc. take one input object and return one result object with
  an `ok` field. Follow that shape when adding an engine.
- **Registries are exported const arrays plus lookup helpers** (`CAMELOT_CORE_ENGINES`,
  `STANDARD_KNIGHTS`, `CARTRIDGES`, `PERSONAS`). Adding an entry means appending to the array and
  keeping the discriminated-union id type in sync.
- **UI:** React 19, function components, Tailwind v4, shadcn-style primitives in
  `src/components/ui/`, `lucide-react` icons, `motion/react` for animation, `sonner` for toasts,
  `cn()` from `src/lib/utils.ts` for class merging.
- **Tailwind v4 is configured CSS-first** in `src/index.css` via `@theme` and `@import "tailwindcss"`.
  The root `tailwind.config.ts` scans `pages/`, `components/`, and `app/` — directories that
  mostly do not exist here — and is effectively vestigial for the Vite app. Add design tokens to
  `src/index.css`, not to `tailwind.config.ts`.
- **Docs are `SCREAMING_SNAKE_CASE.md`** under a topical `docs/<area>/` subdirectory. Source
  files are `kebab-case.ts`; React components are `PascalCase.tsx`.

## Things that will mislead you

- **The command queue has two implementations.** `InMemoryCommandQueue` (used by the CLIs and the
  smoke test) and `SupabaseCommandQueue` (real, but nothing in the app instantiates it). The
  Supabase migration in `supabase/migrations/` has never been applied by this repo's tooling.
- **`npm run camelot:approve` is a scaffold.** It constructs an `InMemoryCommandQueue`, never uses
  it, and prints `ok: false` with a note to wire it to Supabase. It does not approve anything.
- **`server.ts` approvals are in-process.** `pendingApprovals` is a module-level `Map`; every
  restart drops them, and multiple instances do not share state.
- **`src/engines/index.ts` registers all nine engines as stubs** that echo their input. The real
  logic lives in the domain directories (`src/merlin/`, `src/verification/`, …) and is called
  directly by `camelot-runtime.ts`, bypassing the registry. Two parallel abstractions describe the
  same nine engines: `src/engines/types.ts` (runtime interface) and
  `src/engines/core-engine-registry.ts` (documentation metadata).
- **`docs/` describes intent, not implemented reality.** `docs/production/PRODUCTION_READINESS_CHECKLIST.md`
  is the honest map — its unchecked boxes are accurate. Treat other architecture docs as design
  targets and verify against source before relying on them.
- **`firebase-applet-config.json` contains a live-looking Firebase web config**, including an API
  key, committed to the repo. Firebase web API keys are not secrets by design, but do not add
  genuinely sensitive values to that file or to any other committed JSON.
- **`metadata.json` requests microphone permission** for the AI Studio applet host; it is not a
  build input.
- **The Bifrost is a control plane, not a driver.** Nothing in `src/bifrost/` or
  `services/heimdall-gatekeeper/` launches or configures Sunshine, Moonlight, RustDesk, the
  Tauri agent, or Sonar. The gatekeeper *authorizes* actions; nothing yet performs them.
  `BIFROST_DEVICES` is a seed array, not a queried tailnet, and is not joined to the existing
  `/api/tailscale/devices` endpoint.
- **Bifrost server state is in-process**, exactly like `pendingApprovals`. A restart drops
  heartbeats and sessions. This fails *safe* — devices then look stale and Heimdall denies
  crossings — but multi-instance deployments need `services/bifrost-broker`.

## Safety posture

This project's entire premise is governed execution: policy gates, approval requirements, and
provenance signing sit between intent and action. When changing anything in `src/policy/`,
`src/security/`, `src/execution/`, `src/provenance/`, or the approval paths in `server.ts`, the
default is to preserve or tighten the gate. Do not remove an approval requirement, widen a risk
classification downward, or bypass `runAntigravity` to make something work end to end.
`security_spec.md` and `firestore.rules` encode the data-ownership invariants for personas and
transcripts — keep them consistent with each other.

## Git

- Work on feature branches; the default branch is `main` and CI runs against it.
- Commit messages follow Conventional Commits loosely (`feat(ui):`, `docs(readme):`), though many
  older commits are plain imperative sentences. Match the recent style.
- Never commit `.env*` (except `.env.example`), `node_modules/`, or `dist/`.
- Before pushing: `npm run typecheck && npm test && npm run build`, and confirm the only
  typecheck error is the pre-existing `GenesisTerminal.tsx` one.
