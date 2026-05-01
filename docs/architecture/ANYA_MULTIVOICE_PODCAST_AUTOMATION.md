# Anya Multivoice, Podcast, and Automation Architecture

Multivoice Router | Anya Edge UI | LYRICUS | Camelot-OS

## Purpose

Anya is not limited to a single assistant voice. The voice layer should support multiple speaking modes:

```text
Single Voice Mode  -> one active persona speaks
Council Mode       -> several Knights respond in structured sequence
Podcast Mode       -> multi-speaker briefing or discussion
Automation Mode    -> triggered voice briefings, alerts, approvals, and reports
```

## Correct Role in the System

```text
Anya UI           = edge voice interface
Multivoice Router = speaker/persona routing layer
LYRICUS           = voice/audio rendering engine
Merlin            = episode/briefing structure
Sir Sonus         = sonic director
Ouroboros         = memory and transcript storage
HITL Gateway      = approval before risky automations
```

## Voice Modes

### 1. Single Voice Mode

Use when the user wants a direct assistant response.

Example:

```text
User: "Anya, open the ANT dashboard."
Speaker: Anya_Ω
```

### 2. Council Mode

Use when a decision needs multiple expert views.

Example:

```text
Anya: frames the request
Merlin: explains architecture
Sir Alex: ranks ROI
Gideon: flags risks
Anya: summarizes next action
```

### 3. Podcast Mode

Use when the user wants an audio briefing, show, or long-form synthesis.

Example:

```text
Title: Morning Camelot Briefing
Host: Anya_Ω
Guest 1: Merlin_Ω
Guest 2: Sir Alex
Guest 3: Lady Apis
Auditor: Gideon
Narrator/Sonic Director: Sir Sonus
```

### 4. Automation Mode

Use when voice output should be triggered by events or schedules.

Examples:

- daily business briefing
- command queue status
- approval-needed alert
- completed worker report
- failed build alert
- SEO/GEO campaign summary
- podcast episode generated from daily memory

## Voice Persona Registry

Every speaker needs:

- speaker id
- Knight/persona binding
- voice engine
- voice style
- speaking rules
- allowed modes
- safety restrictions

## Podcast Session Flow

```text
Trigger
  -> collect topic/context
  -> Merlin builds episode outline
  -> assign speakers
  -> generate dialogue turns
  -> Veritas checks factual claims
  -> LYRICUS renders voice segments
  -> assemble audio/transcript
  -> store in Ouroboros
  -> show in Anya UI
```

## Automation Flow

```text
Event or Schedule
  -> automation policy check
  -> gather data
  -> choose voice mode
  -> generate briefing/podcast/script
  -> if safe: speak/render/send
  -> if risky: request HITL approval
  -> ledger + memory write
```

## Automation Triggers

```text
schedule.daily
schedule.weekly
event.command_failed
event.command_completed
event.approval_required
event.worker_offline
event.memory_snapshot_created
event.campaign_report_ready
event.dashboard_opened
manual.user_command
```

## UI Requirements

Anya UI should include:

- voice selector
- council mode toggle
- podcast mode button
- automation rules panel
- speaker timeline
- transcript viewer
- render/download audio
- approval alert voice notifications
- memory-linked episode archive

## Safety Requirements

Autonomous voice is allowed for:

- read-only summaries
- status reports
- memory briefings
- podcast drafts
- private local playback

HITL is required for:

- sending audio externally
- publishing podcast episodes
- messaging other people
- using cloned/third-party voices
- paid generation APIs
- claims without source verification

## Golden Rule

Voices are not decoration. Voices are routed persona interfaces with memory, policy, and provenance.
