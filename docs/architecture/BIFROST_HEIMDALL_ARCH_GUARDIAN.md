# Bifrost Bridge — Sir Heimdall, Arch-Guardian

Status: **implemented and tested**, with the caveats in "What is real" below.

The Bifrost is the governed remote-access surface of Camelot-OS: the set of transports that
let a Camelot operator reach a physical machine. **Sir Heimdall** (L2, order `sentinels`,
engine binding `BIFROST`) is the Arch-Guardian who decides who crosses, at what fidelity,
carrying which scopes, for how long.

```text
Operator / Knight
  → Crossing request
  → GJALLARHORN     is the bridge safe right now?
  → HEIMDALL        narrow fidelity + scopes, classify risk, clamp TTL
  → ANTIGRAVITY     the runtime's existing execution gate, unchanged
  → HITL gate       human approval for anything L3 and above
  → Signed session envelope (HMAC-SHA256)
  → Node gatekeeper verifies locally and enforces scope
  → OUROBOROS memory + provenance ledger event
```

## The three laws of this bridge

1. **The bridge is the tailnet.** Every transport except the sensors is marked
   `requiresTailnet`. A device with no mesh address is denied outright. There is no direct
   fallback path.
2. **Narrow, never widen.** Fidelity and scopes are intersected against the transport ceiling
   and the device ceiling. A request can only ever come back smaller than it went in.
3. **Heimdall does not replace ANTIGRAVITY.** A verdict of `ALLOW` is permission to *ask* the
   runtime's execution gate, never to bypass it. `bifrost-runtime.ts` calls `runAntigravity`
   on every crossing that survives the guardian.

## Transports

| Transport | Upstream | Role | Max fidelity | Carriable scopes |
|---|---|---|---|---|
| `tailscale_mesh` | Tailscale | The bridge itself; WireGuard mesh everything rides inside | `observe` | `network_observe` |
| `sunshine_moonlight` | [Sunshine](https://github.com/LizardByte/Sunshine) + [Moonlight](https://github.com/moonlight-stream/moonlight-qt) | Hardware-encoded low-latency desktop streaming | `interact` | `screen_view`, `audio_out`, `input_inject` |
| `rustdesk_control` | RustDesk | Broad remote control including transfer | `control` | `screen_view`, `input_inject`, `clipboard_read`, `clipboard_write`, `file_pull`, `file_push` |
| `tauri_agent` | [claude-rust-desktop](https://github.com/lorryjovens-hub/claude-rust-desktop) | Structured agent surface: MCP tools, terminal, file explorer | `control` | `process_list`, `file_pull`, `shell_exec` |
| `sonar_sensor` | [Sonar](https://github.com/Sonar-team/Sonar_desktop_app) | Heimdall's eyes and ears; packet capture → flow matrices | `observe` | `network_observe` |

Two ceilings are deliberate and worth stating plainly:

- **Sunshine/Moonlight is capped below `control`.** It is the fastest path and the most
  tempting one to over-grant. It carries pixels, audio and input — never files, never a shell.
  A session that genuinely needs transfer must be opened separately on `rustdesk_control`,
  which is L4 and therefore always needs a human.
- **Sonar is read-only by construction.** It feeds Gjallarhorn and is never a failover target
  for an interactive session.

## The fidelity ladder and scope risk

Fidelity is strictly ordered — `observe` < `view` < `interact` < `control` — and each scope
declares the minimum rung it may ride on, plus the risk it carries:

| Scope | Min fidelity | Risk | Human approval |
|---|---|---|---|
| `network_observe`, `process_list` | `observe` | `L0_OBSERVE` | no |
| `screen_view`, `audio_out` | `view` | `L1_DRAFT` | no |
| `input_inject`, `clipboard_read` | `interact` | `L3_GUARDED_WRITE` | **yes** |
| `clipboard_write`, `file_pull`, `file_push`, `shell_exec` | `control` | `L4_HIGH_RISK` | **yes** |

Session risk is the maximum across granted scopes. TTL and idle timeout are clamped by that
risk class — an L4 session cannot live longer than 300 seconds or idle beyond 60, no matter
what the operator asks for.

## Gjallarhorn

The horn consumes Sonar flow observations, gatekeeper heartbeats and live session state.
Critical alarms **halt** the bridge: new crossings are denied and affected sessions are
revoked. Warnings escalate an otherwise-allowed crossing to requiring approval.

| Rule | Severity | Meaning |
|---|---|---|
| `off_tailnet_peer` | critical | Traffic with a peer outside `100.0.0.0/8`. The bridge is not the only path in. |
| `forbidden_protocol` | critical | VNC/RDP/SMB/FTP/telnet/plain-HTTP observed — a remote-access path exists outside the Bifrost. |
| `unexpected_protocol` | warning | Protocol not on the expected list. |
| `no_heartbeat` / `stale_heartbeat` | critical | A node with a live session cannot report. It cannot be trusted to enforce an envelope. |
| `session_overrun` | critical | A session is still live past `notAfter`. |
| `idle_timeout` | warning | Session idle beyond its envelope's tolerance. |
| `session_fanout` | critical | More than two concurrent sessions on one device. |

A critical alarm that **cannot be attributed to a device** — an unauthorized peer Sonar
cannot map to a node — revokes *every* live session, not just the ones that can be named.
Compromise of the bridge is treated as compromise of everything on it.

## Autonomy, and its limit

`tickBifrostSupervisor` is a pure reducer: given devices, sessions and observations it returns
the next session set plus a list of actions. It runs the loop autonomously.

**What is autonomous:** expiry, revocation, idle reaping, degradation on transport failure,
and selecting a failover transport.

**What is not:** opening or widening a crossing. Failover is emitted as
`propose_failover` with `requiresReauthorization: true`, because a new transport means a new
envelope, which means Heimdall rules again — and if the new transport's scopes are L3+, a
human rules again too.

> The supervisor can always close the bridge on its own. It can never widen it without a human.

## The session envelope

A crossing that passes every gate mints an HMAC-SHA256 envelope the node verifies **locally**,
without calling the control plane. A gatekeeper that has lost contact therefore fails closed
as its envelopes expire, rather than failing open.

The canonical signed form is a flat pipe-delimited string — chosen specifically so three
languages can rebuild it byte-for-byte without agreeing on a JSON canonicalization scheme:

```text
bifrost-v1|sessionId|deviceId|transport|fidelity|scopes|riskClass|notBefore|notAfter|maxIdleSeconds|issuedBy
```

`scopes` is lowercase, de-duplicated, lexicographically sorted, comma-joined. Timestamps are
RFC3339 UTC at **second** precision — Rust's and Go's default formatting agree there and
JavaScript's `toISOString()` does not, so the TypeScript side truncates deliberately.

Three implementations are pinned to one shared test vector. If any drifts, its suite fails:

| Implementation | File | Test |
|---|---|---|
| TypeScript | `src/bifrost/session-token.ts` | `src/tests/smoke.test.ts` |
| Rust | `services/heimdall-gatekeeper/src/token.rs` | `cargo test` |
| Go | `services/bifrost-broker/internal/token/token.go` | `go test ./...` |

## Node-side enforcement

`services/heimdall-gatekeeper` (Rust) runs on the machine being reached and enforces four
things the control plane cannot:

1. The envelope's signature and validity window, verified locally.
2. The action is within the envelope's granted scopes — unknown actions are refused, never
   allowed through as "unclassified".
3. The transport the node serves matches the envelope's, so an envelope minted for the
   streaming path cannot be replayed against the file-transfer path.
4. Local revocation, checked *before* signature validity, so a revoked session is refused
   while its signature is still perfectly good.

`services/bifrost-broker` (Go) is the control-plane counterpart: it records node liveness,
re-verifies and stores issued envelopes, and fans revocations out to nodes. It holds no policy
of its own. It stamps heartbeats with **server** time — a node claiming a future timestamp
cannot extend its own liveness.

## Running it

```bash
# One crossing through the full pipeline
npm run camelot:bifrost -- --device desktop_primary --transport sunshine_moonlight \
  --fidelity view --scopes screen_view,audio_out --purpose "watch the build" --simulate-heartbeat

# Node daemon
cd services/heimdall-gatekeeper
HEIMDALL_DEVICE_ID=desktop_primary BIFROST_SIGNING_SECRET=<secret> \
HEIMDALL_TRANSPORT=rustdesk_control cargo run --release

# Broker
cd services/bifrost-broker
BIFROST_SIGNING_SECRET=<secret> BIFROST_BROKER_TOKEN=<token> go run ./cmd/bifrost-broker
```

HTTP surface on the app server (`server.ts`):

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/bifrost/transports` | Transport registry with ceilings |
| GET | `/api/bifrost/devices` | Devices with heartbeat freshness |
| POST | `/api/bifrost/heartbeat` | Node gatekeeper check-in |
| POST | `/api/bifrost/crossing` | Request a crossing (never self-approving) |
| GET | `/api/bifrost/crossing/pending` | Crossings parked at the HITL gate |
| POST | `/api/bifrost/crossing/approve` | Resolve a parked crossing |
| GET | `/api/bifrost/sessions` | Live sessions |
| POST | `/api/bifrost/sessions/revoke` | Revoke a session |
| POST | `/api/bifrost/supervisor/tick` | Run one autonomous supervisor tick |

`POST /api/bifrost/crossing` **ignores `approved` in the request body.** Approval is only
possible via the separate approve endpoint, so a caller cannot self-approve an L4 crossing.

## What is real, and what is not

**Real, exercised by tests:** the guardian's decision logic, the scope/fidelity/risk lattice,
the alarm rules, the session state machine, the supervisor reducer, envelope signing and
cross-language verification, the Rust gatekeeper's enforcement, the Go broker's registry and
revocation fan-out, and the Express endpoints.

**Not real yet — this is a control plane, not a driver:**

- Nothing here launches or configures Sunshine, Moonlight, RustDesk, the Tauri agent, or
  Sonar. The gatekeeper authorizes actions; wiring an authorized action to an actual process
  is unimplemented.
- `BIFROST_DEVICES` is a seed array in `device-registry.ts`, not a queried tailnet. The
  existing `/api/tailscale/devices` endpoint is not yet joined to it.
- Sonar flow matrices are consumed through `normalizeSonarFlows`, but nothing exports them
  from Sonar automatically.
- Server-side Bifrost state is in-process, exactly like `pendingApprovals`. Restarting drops
  heartbeats and sessions. That fails safe — devices look stale and crossings are denied —
  but it means multi-instance deployments need the Go broker.
- The shared signing secret is symmetric. Any node holding it can mint envelopes for itself.
  Per-node keys or asymmetric signing is the obvious next step.

The guardrails are real logic, but they are **policy over a keyword and lattice model**, in
the same spirit as the rest of this repo's gates. They are not a substitute for the upstream
tools' own authentication.
