# Camelot Bio-Kinetic Cartridge System

Camelot-OS | Governed Quest Package and Swarm Harmony Architecture

The Bio-Kinetic Cartridge system replaces monolithic prompts with modular, quest-scoped governance packages. A cartridge does not permanently define how a Knight thinks. Instead, it mounts a coordinated team of Knights, active tools, constraints, artifacts, and execution laws for a specific quest.

## Mental Models vs Cartridges

```text
Mental Models = forged mind
Cartridges    = quest harmony
```

### Mental Models

Mental models are Knight-internal cognition. Merlin applies MMAP during the Genesis schematic phase so GENESIS can forge selected models into the Knight's SkillGraph4, especially S3 Contextual Architecture.

Mental models answer:

```text
How does this Knight inherently think?
```

### Cartridges

Cartridges are mounted task packages. They assemble the right Knights, tools, constraints, and artifacts for a quest.

Cartridges answer:

```text
Which Knights, tools, laws, and artifacts are needed for this quest?
```

## Placement in Camelot

Most efficient layer:

```text
L7 Anya / Multivoice Router
  -> detects cartridge trigger
  -> mounts quest package
  -> compiles Titan Prompt under cartridge constraints
```

Secondary layers:

- Merlin reads cartridge personnel and artifact requirements.
- GENESIS uses cartridge needs only when creating/evolving missing Knights.
- AETHER reads cartridge tool permissions.
- ANTIGRAVITY enforces cartridge-specific execution limits.
- OUROBOROS logs cartridge mounts, artifacts, and result traces as provenance events.

## Directory Structure

```text
.camelot/
  cartridges/
    ant_vortex.md
    beaver_tectonic.md
    spider_silk.md
    octopus_lazarus.md
    alchemist_midas.md
    engineer_cartridge_v400.md
    template.md
```

## Universal Cartridge Template

```markdown
---
name: [CARTRIDGE_NAME]
mode_icon: [EMOJI]
trigger: [CLI_COMMAND]
quest_type: [RESEARCH | ENGINEERING | INTEGRATION | DEBUG | STRATEGY]
---

# Ω_CARTRIDGE: [MODE_NAME]

[QUEST_DIRECTIVE]: [One-sentence task purpose]

## PERSONNEL MOUNTED

- [Knight 1] as [Role]
- [Knight 2] as [Role]

## ACTIVE TOOLCHAIN

- [Tool 1]
- [Tool 2]

## COGNITIVE SETTINGS

- Temperature: [0.2 for code | 0.8 for creative]
- Reasoning: [ReAct | ToT | GoT | HTN]
- Output Format: [JSON | Markdown | Symbolect]

## TITANIUM LAWS

1. [Constraint]
2. [Constraint]

## EXECUTION ARTIFACTS

- blueprint.md
- task.md
- verification.md
- rollback.md
```

## Example: ENGINEER_CARTRIDGE_v400

Use for local coding quests and infrastructure execution.

```text
Personnel Mounted:
- Sir Alex_Ω: Overseer / resource guard
- Sir Link: Connectivity and protocol sync
- Anya_Ω: Compilation and Titan Prompt shaping
- Merlin_Ω: Architecture and task DAG
- Sir Forge: Code construction
- Sir Gideon: Verification and Crucible QA

Constraints:
- Enforce 8GB RAM maximum / Titanium Law of T1
- Use Antigravity for all writes
- Use Veritas/Gideon before completion
- Use rollback plan for risky changes

Execution Artifacts:
- blueprint.md: structural schematic
- task.md: HTN execution DAG
- verification.md: Gideon QA checklist
- rollback.md: recovery path
```

## Core Cartridges

### ANT Mode: Vortex Datalink

Use for research, scraping, and data foraging.

```text
Mounted Lead: Lady Apis
Mode: ANT / Foraging
Quest Directive: Forage the signal. Ignore the noise. Store the Truth.
Tools: Firecrawl, Perplexity, GraphRAG
Laws:
- No hallucination. Missing data returns NULL.
- Every claim requires a source ID.
- Prefer raw data tables over summaries.
Artifacts:
- research_brief.md
- sources.json
- fit_gap.md
- ukg_findings.jsonld
```

### BEAVER Mode: Tectonic Plate

Use for heavy coding, infrastructure, and construction.

```text
Mounted Lead: Sir Forge
Mode: BEAVER / Construction
Quest Directive: One brick at a time. Structure creates freedom.
Tools: Cribo, Antigravity, Docker
Laws:
- Write plan.md before code.
- Prefer Rust/Go binaries for file operations.
- Build inside venv, container, or sandbox.
Artifacts:
- blueprint.md
- task.md
- patch_plan.md
- verification.md
```

### SPIDER Mode: Silk Weaver

Use for API integrations, webhooks, and system connection.

```text
Mounted Lead: Sir Link
Mode: SPIDER / Integration
Quest Directive: Connect the nodes. Secure the payload. Verify the handshake.
Tools: Saltare, curl/Postman, Zod, WebMCP
Laws:
- Validate all payloads.
- Webhooks must be idempotent.
- Use retries with exponential backoff.
Artifacts:
- integration_map.md
- schema_contracts.json
- handshake_tests.md
```

### OCTOPUS Mode: Lazarus Pit

Use for debugging and recursive self-healing.

```text
Mounted Lead: Sir Debug
Mode: OCTOPUS / Repair
Quest Directive: Isolate, reproduce, resolve.
Tools: Rotel, Miri, git bisect
Laws:
- Never delete logs during debugging.
- Fix root cause, not symptoms.
- Analyze multiple failure vectors.
Artifacts:
- incident_report.md
- repro_steps.md
- root_cause.md
- recovery_patch.md
```

## Mode Switching Protocol

Command:

```text
//MODE [NAME]
```

System action:

```text
mount selected cartridge
assemble personnel
bind allowed tools
apply quest laws
generate execution artifacts
compile future Titan Prompts under cartridge constraints
```

Example acknowledgement:

```text
[🦫 CARTRIDGE LOADED: TECTONIC PLATE ONLINE]
```

## Golden Rule

A cartridge is not a Knight's brain. A cartridge is the quest framework that unites Knights into one governed swarm for a specific mission.
