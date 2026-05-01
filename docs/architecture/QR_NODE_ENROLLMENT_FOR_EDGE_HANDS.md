# QR Node Enrollment for Edge Hands

Multivoice Router | Anya Interphase | PhoneClaw | Superpowers Chrome | RustDesk | Termux

## Verification Result

`superpowers-chrome` provides Chrome DevTools Protocol automation, Skill Mode, MCP Mode, dynamic port allocation, browser profiles, auto-capture, screenshots, markdown extraction, and DOM summaries.

The QR enrollment concept is not present in the inspected repo content. It should be implemented as a Camelot/Anya node enrollment layer above Superpowers Chrome, not as a core browser automation feature.

## Purpose

Use QR codes to enroll edge hands as trusted nodes in Anya/Camelot:

```text
PhoneClaw Android
Superpowers Chrome browser node
RustDesk desktop node
Termux CLI node
Modal/cloud worker node
```

## Node Enrollment Flow

```text
1. Anya Interphase generates enrollment token.
2. UI displays QR code.
3. Device/extension/worker scans QR or opens pairing URL.
4. Node sends enrollment request.
5. Camelot verifies token, expiry, nonce, and requested capability manifest.
6. Node is registered in device registry.
7. Node receives node_id and scoped worker secret.
8. Node starts heartbeat.
9. Sir Link may route commands to the node.
```

## QR Payload Shape

```json
{
  "type": "CAMELOT_NODE_ENROLLMENT",
  "version": "v1",
  "enrollment_url": "https://operator.example.com/api/edge/enroll",
  "token": "enroll_...",
  "expires_at": "2026-05-01T12:00:00Z",
  "requested_kind": "chrome_superpowers_worker",
  "org_id": "org_...",
  "operator_id": "user_...",
  "nonce": "random_nonce"
}
```

## Node Kinds

```text
phoneclaw_android_worker
chrome_superpowers_worker
rustdesk_desktop_worker
termux_cli_worker
modal_cloud_worker
```

## Superpowers Chrome Node

Superpowers Chrome should register as:

```text
kind: chrome_superpowers_worker
capabilities:
  - navigate
  - click
  - type_text
  - extract_dom
  - screenshot
  - markdown
  - invoke_webmcp_tool
  - auto_capture
```

It should report:

```text
chrome_host
chrome_port
profile_name
profile_meta_path
mcp_mode_enabled
headless_enabled
last_capture_ref
```

## PhoneClaw Node

PhoneClaw should register as:

```text
kind: phoneclaw_android_worker
capabilities:
  - tap
  - swipe
  - type_text
  - screenshot
  - open_app
  - read_screen_state
```

## RustDesk Node

RustDesk should register as:

```text
kind: rustdesk_desktop_worker
capabilities:
  - screenshot
  - open_app
  - open_url
  - hotkey
  - type_text
  - focus_window
```

## Security Requirements

- Enrollment tokens expire quickly.
- QR token is single-use.
- Node secret is scoped to one node.
- Capabilities are declared at enrollment and policy-bound.
- High-risk actions still require HITL approval.
- Device heartbeat is required.
- Lost nodes can be revoked.
- QR payload must not include long-term secrets.

## Anya UI Requirements

Add a Node Enrollment panel:

- Generate QR
- Select node kind
- Show expiry countdown
- Show pending enrollment
- Approve/reject new node
- View capabilities
- View heartbeat
- Revoke node

## Golden Rule

QR adds the node to the kingdom. It does not grant unlimited power. Every enrolled node still obeys Sir Link routing, AgentArmor, Antigravity, and HITL governance.
