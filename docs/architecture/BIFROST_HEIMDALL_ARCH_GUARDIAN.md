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

## Per-node desktop provisioning

`src/bifrost/desktop/` turns a granted envelope into the concrete configuration each upstream
tool needs. Two properties matter more than the rest:

**Every capability flag is derived from the granted scopes, never from operator preference.**
If `input_inject` was not granted, the RustDesk config sets `enable-keyboard = false`, the
Sunshine config sets `keyboard = disabled`, and the Moonlight client is launched with
`--no-keyboard`. The node gatekeeper would refuse the action anyway — but a session should not
be *configured* with a capability it was never granted.

**A plan is declarative, never a command string.** `buildProvisioningPlan` emits steps drawn
from four verbs (`write_config`, `start_transport`, `stop_transport`, `apply_stream_profile`)
with relative targets. Nothing in a crossing request reaches a shell.

### The dynamic stream profile

`negotiateStreamProfile` picks codec, resolution, frame rate and bitrate from the node's
reported encoder capability, the granted fidelity, and measured link telemetry. The bitrate
model is anchored on Moonlight's published default — 1080p60 H.264 at ~20 Mbps — expressed as
bits per pixel per second, so every other rung falls out of the same curve:

| Codec | bits/pixel/s | 1080p60 | 4K60 |
|---|---|---|---|
| H.264 | 0.160 | ~19.9 Mbps | ~79.6 Mbps |
| HEVC | 0.104 | ~12.9 Mbps | ~51.8 Mbps |
| AV1 | 0.080 | ~10.0 Mbps | ~39.8 Mbps |

`adaptStreamProfile` runs one step per telemetry sample and is deliberately **asymmetric**: it
degrades on a single congested sample, and recovers only after three consecutive clean ones.
Dropping quality is cheap and reversible; oscillating is neither. Frame rate is shed before
resolution, because it is the less visually costly loss.

Without a reported encoder, provisioning falls back to `CONSERVATIVE_CAPABILITY` (1080p60,
H.264, software) and says so in the plan's warnings.

## Monitoring

`src/bifrost/observability/` holds two separate concerns that are easy to conflate:

**The session journal** is hash-chained. Each entry carries the SHA-256 of the previous one, so
editing or removing an entry breaks the chain from that point forward, and `verifyJournalChain`
locates the break. This is an *integrity* mechanism, not a secrecy one — an attacker who can
rewrite the whole file can also recompute the chain, which is why the head hash should be
anchored into the provenance ledger.

The chain is verified independently by the Go broker (`services/bifrost-broker/internal/journal`),
which recomputes every hash rather than trusting what it was sent, and refuses a batch whole
rather than storing a partially-valid one. Detail objects are canonicalized with recursively
sorted keys so both languages produce identical hashes; that canonicalization is pinned by a
shared vector, like the session envelope.

**Node telemetry** drives three things that are kept apart: stream adaptation, health scoring
for failover, and security alarms. The security rule that matters is `scope_drift` — a node
reporting an active scope its envelope never granted means enforcement has failed somewhere,
and that halts the bridge rather than merely degrading it.

## Camelot Defense Redteam

`src/bifrost/redteam/` runs adversarial analysis **of your own configuration**. Every probe
reads config and derives consequences; nothing touches a remote host or tests a credential, so
it is safe to run continuously against production.

| Probe | Category | Asks |
|---|---|---|
| `blast_radius` | blast_radius | If one envelope were minted for this device, what would the holder be able to do? |
| `shared_secret` | blast_radius | How many nodes does a single leaked secret unlock? |
| `off_mesh_device` | exposure | Is an enrolled device reachable outside the tailnet? |
| `sensor_coverage` | observability | Can Gjallarhorn actually see the devices that matter most? |
| `stale_gatekeeper` | observability | Which enrolled nodes are not reporting? |
| `policy_drift` | policy_drift | Does a device permit a fidelity whose scopes it entirely denies? |
| `transport_fanout` | policy_drift | Does a device list transports it cannot use? |
| `session_hygiene` | session_hygiene | Is anything still live that should have been closed? |
| `journal_integrity` | integrity | Has the session journal been edited? |

The most useful output is the per-device blast radius: the maximal scope set someone would hold
if a single envelope were minted for that device. That is the consequence of a leaked signing
secret, stated per node rather than in the abstract.

Critical findings become **halting** Gjallarhorn alarms. A broken journal chain or a session
running past its envelope means an invariant has already failed, and the bridge should close
rather than wait for someone to read a report. High findings become warnings, which escalate
new crossings to requiring approval.

```bash
npm run camelot:redteam -- --simulate-heartbeat        # text report
npm run camelot:redteam -- --json --min high           # machine-readable
npm run camelot:redteam -- --list                      # probe registry
# exit 0 clean · 1 findings · 2 critical (halt recommended)
```

## Private CI/CD for clients

`src/bifrost/cicd/` runs client pipelines on client nodes, through the bridge.

**Every stage opens its own crossing.** A pipeline does not get one long-lived session holding
the union of every scope it will ever need. A build stage gets `shell_exec`; the publish stage
that follows gets `file_push`; neither holds the other's.

**Tenant isolation fails closed.** A stage targeting a device whose `tenantId` does not match
the pipeline's is refused — and so is a stage targeting a device with *no* `tenantId` at all.
House devices are never reachable from a client pipeline.

### Hash-pinned pre-authorization

CI is useless if a human must approve every run, and dangerous if nobody approves anything. The
resolution: a human approves a **definition**, not a run.

`authorizePipeline` produces a signed grant carrying the pipeline's hash, a scope ceiling, a
device allowlist, a runs-per-hour limit and an expiry. Runs of that exact definition then
proceed unattended. Change one command, add one step, retarget one device — the hash changes,
the grant no longer matches, and the pipeline is back in front of a human:

```
Grant rejected: Pipeline definition has changed since it was approved.
Approved 4dbf91d28996…, now aaf73bc8a498…. Re-approval required.
```

A grant cannot be issued that is narrower on paper than in effect: `authorizePipeline` refuses
when the pipeline needs scopes beyond its own ceiling or targets devices outside its allowlist.

This is the only place in the bridge where something at L4 runs without a per-action human
decision, and it is deliberately the narrowest hole that is still useful: a specific frozen
definition, on named devices, at a bounded rate, until a stated date. Heimdall and Gjallarhorn
still rule on every stage, so a stale node or a sounding alarm stops the run regardless of the
grant.

```bash
npm run camelot:pipeline -- validate  --pipeline config/pipelines/acme-build.example.json
npm run camelot:pipeline -- authorize --pipeline <file> --by operator --days 30 > grant.json
npm run camelot:pipeline -- plan      --pipeline <file> --grant grant.json
npm run camelot:pipeline -- run       --pipeline <file> --grant grant.json
```

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
| POST | `/api/bifrost/provision` | Build a provisioning (or teardown) plan for a session |
| POST | `/api/bifrost/telemetry` | Ingest node telemetry; returns health and alarms |
| GET | `/api/bifrost/journal` | Journal entries, optionally `?tenant=` scoped |
| GET | `/api/bifrost/journal/verify` | Verify the hash chain (409 when broken) |
| POST | `/api/bifrost/redteam` | Run the posture audit |
| POST | `/api/bifrost/pipelines/authorize` | Issue a hash-pinned pipeline grant |
| POST | `/api/bifrost/pipelines/plan` | Plan a run without executing it |
| POST | `/api/bifrost/pipelines/run` | Execute a run under a grant |

`POST /api/bifrost/crossing` **ignores `approved` in the request body.** Approval is only
possible via the separate approve endpoint, so a caller cannot self-approve an L4 crossing.

## What is real, and what is not

**Real, exercised by tests:** the guardian's decision logic, the scope/fidelity/risk lattice,
the alarm rules, the session state machine, the supervisor reducer, envelope signing and
cross-language verification, the Rust gatekeeper's enforcement, the Go broker's registry and
revocation fan-out, and the Express endpoints.

**Not real yet:**

- **Config is written; processes are not started.** The gatekeeper validates a provisioning
  plan and writes the Sunshine/RustDesk/agent config files under its config root. It does
  *not* launch or stop the transport — `start_transport` and `stop_transport` are validated
  and recorded, and a supervisor unit is expected to act on the written config. Launching a
  process is the one step that genuinely needs local operator policy, and a half-built version
  would be worse than none.
- Stream telemetry is consumed but not produced: nothing yet samples RTT, loss or encoder
  stats from a running Sunshine or RustDesk session and posts it to `/api/bifrost/telemetry`.
- The Redteam audits configuration only. It does not scan the network, probe ports, or test
  whether a node's own authentication actually holds.
- Pipeline steps are planned, gated and journaled, but the runner that executes a step's
  command on the node does not exist yet — `executePipelineRun` opens the crossing for each
  stage and stops there.
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
