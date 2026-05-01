# Anya Edge Assistant Integration Blueprint

Multivoice Router | PhoneClaw | Superpowers Chrome | RustDesk | Camelot-OS

## Correct Product Definition

This project is not primarily the full Camelot-OS kernel. It is the edge-based Anya voice assistant interface that connects user intent to phone, browser, desktop, and Camelot governance.

```text
Multivoice Router
= voice/persona interface + intent router

PhoneClaw
= Android edge hand

Superpowers Chrome
= browser/WebMCP/CDP hand

RustDesk
= desktop remote hand

Camelot-OS
= governance, memory, routing, HITL, provenance

Project Crusade frontend
= user-facing dashboard/interface shell
```

## Target User Experience

User speaks:

```text
"Anya, open Chrome on my desktop, research this page, then send the summary to my phone."
```

System flow:

```text
Voice Input
  -> Multivoice Router
  -> Anya Edge Interface
  -> Camelot policy / HITL gate
  -> Sir Link route selection
  -> Chrome / RustDesk / PhoneClaw execution
  -> Veritas result check
  -> Ouroboros memory event
  -> Project Crusade UI status update
```

## Core Runtime Topology

```text
[L7 Edge Interface]
Multivoice Router + Anya voice/persona layer

[L6 Governance]
Camelot HITL, AgentArmor, Antigravity, Veritas

[L5 Orchestration]
Sir Link routes work to device workers

[L4 Memory]
Ouroboros, UKG, NotebookLM/OpenNotebook/Appwrite refs

[L3 Reasoning]
Merlin/Videneptus plans multi-step actions

[L2 Edge Hands]
PhoneClaw, Superpowers Chrome, RustDesk, Termux

[L1 Mesh]
Tailscale, local network, Vercel/Modal/cloud brain
```

## Integration Targets

### 1. PhoneClaw

Role:

```text
Android UI automation and phone enrollment hand.
```

Primary capabilities:

- tap
- swipe
- type text
- screenshot
- open app
- read screen state
- device heartbeat
- phone-to-phone enrollment

High-risk actions requiring HITL:

- send message
- delete item
- change permission
- purchase
- account mutation

### 2. Superpowers Chrome

Role:

```text
Browser-native automation hand.
```

Primary capabilities:

- inspect active tab
- navigate URL
- click/type
- extract DOM
- use WebMCP when available
- use Chrome DevTools Protocol fallback
- screenshot + Aurora fallback

Priority ladder:

```text
WebMCP > CDP/extension API > DOM extraction > screenshot/Aurora > manual takeover
```

### 3. RustDesk

Role:

```text
Desktop remote-control bridge similar to PhoneClaw + Chrome Remote Desktop.
```

Primary capabilities:

- screenshot desktop
- open app
- open URL
- hotkey
- type text
- focus window
- basic remote action relay

High-risk actions requiring HITL:

- shell command
- credential entry
- file deletion
- system settings mutation
- remote unattended control outside allowlist

### 4. Multivoice Router

Role:

```text
Voice/persona command router.
```

Primary capabilities:

- wake/listen/respond
- route by persona voice
- switch Anya/Merlin/Lukas style
- transcribe intent
- dispatch to Camelot runtime
- speak result back to user

### 5. Project Crusade Frontend

Role:

```text
Dashboard and operator cockpit.
```

Expected panels:

- voice orb
- active devices
- command queue
- approvals
- edge actions timeline
- browser/phone/desktop status
- memory snapshot
- current persona

## Correct Command Flow

```text
Voice/Chat Input
  -> Anya Edge Intent Compiler
  -> Command Router
  -> Risk Policy
  -> HITL if needed
  -> Worker Route
  -> Edge Worker Executes
  -> Result returned
  -> Voice/UI response
  -> Memory/Ledger write
```

## Worker Types

```text
phoneclaw_android_worker
chrome_superpowers_worker
rustdesk_desktop_worker
termux_cli_worker
modal_cloud_worker
```

## Device Enrollment

Preferred enrollment model:

```text
Tap phone-to-phone
  -> exchange enrollment token
  -> register device in command queue
  -> bind Tailscale identity
  -> declare capability manifest
  -> heartbeat starts
```

## Safety Model

Autonomous allowed:

- read screen
- screenshot
- open page/app
- navigate browser
- extract data
- prepare draft
- summarize results

HITL required:

- send message
- publish/post
- buy/pay
- delete
- shell command
- credential handling
- account mutation
- system setting change

## Data Contracts

### EdgeCommand

```json
{
  "command_id": "cmd_123",
  "target_worker": "chrome_superpowers_worker",
  "action": "navigate",
  "payload": { "url": "https://example.com" },
  "risk_class": "L2_SAFE_EXECUTE",
  "requires_approval": false
}
```

### EdgeResult

```json
{
  "command_id": "cmd_123",
  "worker": "chrome_superpowers_worker",
  "ok": true,
  "summary": "Opened page and extracted title.",
  "artifacts": ["screenshot://..."],
  "memory_refs": ["ukg:..."]
}
```

## Golden Rule

Anya is the edge interface. Camelot is the governed brain. PhoneClaw, Superpowers Chrome, and RustDesk are the hands.
