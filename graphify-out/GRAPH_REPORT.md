# Graph Report - multivoice-router  (2026-10-22)

## Corpus Check
- 140 files · ~412,772 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: .css 3, .example 1, (none) 1)

## Summary
- 886 nodes · 2195 edges · 36 communities (35 shown, 1 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bcdfeed0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App.tsx
- cn
- ExcaliburCommandCenter.tsx
- firestore.ts
- CamelotCarousel.tsx
- Persona
- AssimilationProtocol.tsx
- omnivoice-router.ts
- ErrorCategory
- fonoster.ts
- triageService
- package.json
- SoundscapeEngine
- dependencies
- policy.ts
- AutonomousRouterBar.tsx
- mistral-voxtral.ts
- simulator.ts
- NanoClawSupervisor
- components.json
- contracts.ts
- voice-gideon.test.ts
- registry.ts
- server.ts
- generate-voice-fixtures.mjs
- compilerOptions
- Contract schemas
- `[UKG_NANO: ⚜️ CAMELOT_CONTACT_CENTER_AMENDMENT_v1]`
- gideon.ts
- devDependencies
- `[UKG_NANO: ⚜️ COMMS_CONSOLE_ASPECT_v1]`
- scripts
- VOICE-004 — Gideon Verification
- PROVENANCE_LEDGER.md
- Security Specification - PersonaLive
- ukg-comms-cartridge-nano-v1.md

## God Nodes (most connected - your core abstractions)
1. `cn()` - 78 edges
2. `Persona` - 60 edges
3. `Button()` - 48 edges
4. `react` - 42 edges
5. `Badge()` - 39 edges
6. `lucide-react` - 33 edges
7. `App()` - 26 edges
8. `PersonaDialog()` - 22 edges
9. `VoiceStudio()` - 19 edges
10. `ragService` - 19 edges

## Surprising Connections (you probably didn't know these)
- `UKG_NANO packet mapping` --references--> `VoiceIntent`  [INFERRED]
  docs/cartridges/communications/voice-001-contracts-v1.md → src/cartridges/communications/contracts.ts
- `UKG_NANO packet mapping` --references--> `CallReceipt`  [INFERRED]
  docs/cartridges/communications/voice-001-contracts-v1.md → src/cartridges/communications/contracts.ts
- `UKG_NANO packet mapping` --references--> `PillBinding`  [INFERRED]
  docs/cartridges/communications/voice-001-contracts-v1.md → src/cartridges/communications/contracts.ts
- `Trust model` --references--> `sealInboundEvent()`  [INFERRED]
  docs/cartridges/communications/voice-005-fonoster.md → src/cartridges/communications/fonoster.ts
- `Tamper-evident receipt chain` --references--> `verifyReceiptChain()`  [INFERRED]
  docs/cartridges/communications/voice-004-gideon.md → src/cartridges/communications/gideon.ts

## Import Cycles
- None detected.

## Communities (36 total, 1 thin omitted)

### Community 0 - "App.tsx"
Cohesion: 0.08
Nodes (66): class-variance-authority, lucide-react, react, sonner, App(), ArtemisRunnerModal(), AssimilationProtocol(), AudioVisualizer() (+58 more)

### Community 1 - "cn"
Cohesion: 0.08
Nodes (46): @base-ui/react, motion, DiagnosticDialog(), DiagnosticDialogProps, LiveChatProps, DEFAULT_PERSONA, PersonaDialog(), SelfErrorTriageModal() (+38 more)

### Community 2 - "ExcaliburCommandCenter.tsx"
Cohesion: 0.10
Nodes (41): listCartridges(), CartridgePanel(), STATUS_STYLES, StatusBadge(), ExcaliburCommandCenter(), ExcaliburStatus, LoopbackEntry, ProbeResult (+33 more)

### Community 3 - "firestore.ts"
Cohesion: 0.07
Nodes (26): firebase, react-dom, AuthContext, AuthContextType, AuthProvider(), ErrorBoundary, app, auth (+18 more)

### Community 4 - "CamelotCarousel.tsx"
Cohesion: 0.10
Nodes (26): AutonomousRouterBar(), CamelotCarousel(), CamelotCarouselProps, numerals, CamelotKnightPicker(), CamelotKnightPickerProps, OrbitalFloorCanvas(), OrbitalFloorCanvasProps (+18 more)

### Community 5 - "Persona"
Cohesion: 0.10
Nodes (22): ArtemisRunnerModalProps, AssimilationProtocolProps, BlastDagModalProps, BulkTaggingStudioProps, PersonaBackdropProps, PersonaCardProps, PersonaDialogProps, PlayVoicePreviewButtonProps (+14 more)

### Community 6 - "AssimilationProtocol.tsx"
Cohesion: 0.12
Nodes (19): assimilationService, SUPERPOWER_SKILLS, VOICE_ASSIMILATION_AUDITS, VOICE_STUDIO_ENGINES, BifrostRouteTelemetry, BifrostSemanticCache, ColibriTierState, LLMHardwareProfile (+11 more)

### Community 7 - "omnivoice-router.ts"
Cohesion: 0.11
Nodes (26): MultivoiceSession, planCouncilSession(), planPodcastSession(), planSingleVoiceSession(), speaker(), VoiceTurn, DEFAULT_POLICY, estimatePaidCost() (+18 more)

### Community 8 - "ErrorCategory"
Cohesion: 0.10
Nodes (17): ErrorCategory, AsyncDeadlock, AudioBufferUnderflow, CollisionDuplicateKey, MemoryScarcity, RateLimitQuota, SyntaxAstFault, WebsocketDisconnect (+9 more)

### Community 9 - "fonoster.ts"
Cohesion: 0.12
Nodes (26): Mapping, Not in scope, Recon (Cyberdad247/fonoster @ 2123e049, 2026-10-04), Refuted claims, Trust model, VOICE-005 — Fonoster Adapter, vitest, canonicalJson() (+18 more)

### Community 10 - "triageService"
Cohesion: 0.13
Nodes (10): triageService, TriageSubscriber, FullTriageSystemState, NanoBotRustTelemetry, NanoClawGoTelemetry, SelfHealingRecipe, TriageCategory, TriageIncident (+2 more)

### Community 11 - "package.json"
Cohesion: 0.08
Nodes (23): name, private, type, version, autoprefixer, clsx, @fontsource-variable/geist, google-auth-library (+15 more)

### Community 12 - "SoundscapeEngine"
Cohesion: 0.12
Nodes (7): SoundscapeManagerProps, SOUNDSCAPE_PRESETS, SoundscapeEngine, SoundscapeMode, SoundscapePreset, soundscapeService, SoundscapeType

### Community 13 - "dependencies"
Cohesion: 0.08
Nodes (25): dependencies, @base-ui/react, class-variance-authority, clsx, cookie-session, dotenv, express, firebase (+17 more)

### Community 14 - "policy.ts"
Cohesion: 0.13
Nodes (20): ValidationResult, VoiceAction, bindApproval(), deny(), disclosureRequired(), evaluateIntentPolicy(), issueLease(), KNOWN_ACTIONS (+12 more)

### Community 15 - "AutonomousRouterBar.tsx"
Cohesion: 0.11
Nodes (13): AutonomousRouterBarProps, ARTEMIS_KEYWORDS, autonomousRouter, AutonomousRouterService, BLAST_DAG_KEYWORDS, DISMISS_KEYWORDS, IntentPreset, RouterDecision (+5 more)

### Community 16 - "mistral-voxtral.ts"
Cohesion: 0.13
Nodes (20): buildSpeechRequestBody(), EnvLike, FetchLike, getKnightMistralVoice(), isUnsupportedSpeech(), KNIGHT_MISTRAL_VOICES, KnightMistralVoice, mimeForFormat() (+12 more)

### Community 17 - "simulator.ts"
Cohesion: 0.14
Nodes (21): Determinism, Scenarios, VOICE-003 — Provider Simulator, What it does NOT do, What it proves, ProviderVoiceEventType, ReceiptOutcome, validateTurnLease() (+13 more)

### Community 18 - "NanoClawSupervisor"
Cohesion: 0.13
Nodes (6): ErrorPacket, IsolationContainer, NanoClawSupervisor, RecoveryAction, TelemetryEvent, NewNanoClawSupervisor()

### Community 19 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 20 - "contracts.ts"
Cohesion: 0.18
Nodes (15): RFC-8785, ConsentState, DisclosureState, eventDedupKey(), isDuplicateEvent(), isPillTaskAllowed(), PillBinding, requireFields() (+7 more)

### Community 21 - "voice-gideon.test.ts"
Cohesion: 0.24
Nodes (15): UKG_NANO packet mapping, CallEffectManifest, ConsentRecord, ProviderVoiceEvent, TurnLease, MappedEvent, GideonInput, ApprovalGrant (+7 more)

### Community 22 - "registry.ts"
Cohesion: 0.18
Nodes (9): COMMUNICATIONS_CARTRIDGE_MANIFEST, registerCartridge(), registry, CartridgeContractRef, CartridgeFeature, CartridgeManifest, CartridgeSource, CartridgeStatus (+1 more)

### Community 23 - "server.ts"
Cohesion: 0.17
Nodes (13): cookie-session, dotenv, express, @google/genai, googleapis, __dirname, __filename, getGenAI() (+5 more)

### Community 24 - "generate-voice-fixtures.mjs"
Cohesion: 0.14
Nodes (11): baseEvent, baseLease, baseManifest, canonicalJson(), expiredManifest, manifestWithDigest(), root, sha256Hex() (+3 more)

### Community 25 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+7 more)

### Community 26 - "Contract schemas"
Cohesion: 0.15
Nodes (12): 1. VoiceIntent, 2. CallEffectManifest, 3. ConsentRecord, 4. TurnLease, 5. ProviderVoiceEvent (normalized), 6. CallReceipt, 7. PillBinding (voice microVM management), Contract schemas (+4 more)

### Community 27 - "`[UKG_NANO: ⚜️ CAMELOT_CONTACT_CENTER_AMENDMENT_v1]`"
Cohesion: 0.17
Nodes (11): ALPHA — Preserve truth, Contact Center target (narrow first slice), Core invariants, DISTILL — Extract structure, Distiller acceptance test, OMEGA — Bound execution, Promotion gates, TOON runtime projection (+3 more)

### Community 28 - "gideon.ts"
Cohesion: 0.30
Nodes (11): CallReceipt, computeManifestDigest(), sha256Hex(), ChainLinkInput, check(), GideonCheck, GideonVerdict, gideonVerify() (+3 more)

### Community 29 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, autoprefixer, tailwindcss, tsx, @types/express, @types/node, @types/react, @types/react-dom (+3 more)

### Community 30 - "`[UKG_NANO: ⚜️ COMMS_CONSOLE_ASPECT_v1]`"
Cohesion: 0.22
Nodes (8): ALPHA — Preserve truth, DISTILL — Extract structure, Invariants (carried), OMEGA — Bound execution, The reforge: console aspect spec, TOON runtime projection, `[UKG_NANO: ⚜️ COMMS_CONSOLE_ASPECT_v1]`, What "implement" means from here (gated)

### Community 31 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, clean, dev, lint, preview, start, test

### Community 32 - "VOICE-004 — Gideon Verification"
Cohesion: 0.40
Nodes (4): Tamper-evident receipt chain, The independence rule, VOICE-004 — Gideon Verification, What Gideon does NOT do

### Community 33 - "PROVENANCE_LEDGER.md"
Cohesion: 0.40
Nodes (3): 1. Directed Acyclic Graph (DAG) Specification, 2. Cross-Agent State Verification, 3. UI Stage Artifact Manifest

### Community 34 - "Security Specification - PersonaLive"
Cohesion: 0.40
Nodes (4): Data Invariants, Security Specification - PersonaLive, Test Runner (Planned), The Dirty Dozen Payloads (Rejection Tests)

## Knowledge Gaps
- **25 isolated node(s):** `@fontsource-variable/geist`, `@types/cookie-session`, `google-auth-library`, `shadcn`, `tw-animate-css` (+20 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 326 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `fonoster.ts` to `ExcaliburCommandCenter.tsx`, `package.json`, `policy.ts`, `mistral-voxtral.ts`, `contracts.ts`, `voice-gideon.test.ts`?**
  _High betweenness centrality (0.279) - this node is a cross-community bridge._
- **What connects `@fontsource-variable/geist`, `@types/cookie-session`, `google-auth-library` to the rest of the system?**
  _25 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07960526315789473 - nodes in this community are weakly interconnected._
- **Why does `react` connect `App.tsx` to `cn`, `ExcaliburCommandCenter.tsx`, `firestore.ts`, `CamelotCarousel.tsx`, `AssimilationProtocol.tsx`, `package.json`, `SoundscapeEngine`, `AutonomousRouterBar.tsx`?**
  _High betweenness centrality (0.132) - this node is a cross-community bridge._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.08050655811849841 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `App.tsx` to `cn`, `ExcaliburCommandCenter.tsx`, `CamelotCarousel.tsx`, `AssimilationProtocol.tsx`, `package.json`, `SoundscapeEngine`, `AutonomousRouterBar.tsx`?**
  _High betweenness centrality (0.102) - this node is a cross-community bridge._
- **Should `ExcaliburCommandCenter.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0963265306122449 - nodes in this community are weakly interconnected._