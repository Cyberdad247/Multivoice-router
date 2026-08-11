# Bifrost Broker (Go)

The control-plane half of the Bifrost Bridge. Sits between the TypeScript guardian (which
rules on crossings) and the Rust gatekeepers (which enforce those rulings on each node).

It holds **no policy of its own**. It records node liveness, re-verifies and stores issued
session envelopes, and fans revocations out to nodes.

## Why liveness matters

Heimdall refuses to open a crossing to a device whose gatekeeper has gone quiet. A broker that
stops hearing from a node therefore causes the bridge to close to that node — that is the
intended failure mode, not a bug.

The broker stamps heartbeats with **server** time and keeps the node's self-reported
`observedAt` only for diagnostics. A node with a wrong clock, or a replayed heartbeat, cannot
claim to be alive. `StaleAfter` here (90s) must stay in step with `HEARTBEAT_STALE_SECONDS`
in `src/bifrost/device-registry.ts`.

## Configuration

| Variable | Required | Default | Meaning |
|---|---|---|---|
| `BIFROST_SIGNING_SECRET` | yes | — | Shared HMAC secret, minimum 16 characters. |
| `BIFROST_BROKER_TOKEN` | yes | — | Shared token for `X-Bifrost-Token`. Every write endpoint requires it. |
| `BIFROST_BROKER_BIND` | no | `:8080` | Listen address. Bind to a tailnet address. |
| `BIFROST_NODE_ENDPOINTS` | no | — | `deviceId=url,deviceId=url` map used for revocation fan-out. |

Node endpoints are registered explicitly. The broker never guesses a URL from a device name —
an unmapped device simply cannot be pushed a revocation, and its session expires on its own
schedule instead.

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/v1/health` | none | Device and session counts |
| POST | `/v1/heartbeat` | token | Gatekeeper check-in |
| GET | `/v1/devices` | token | Device liveness |
| POST | `/v1/sessions` | token | Record an issued envelope (re-verified before storing) |
| GET | `/v1/sessions` | token | List known sessions |
| POST | `/v1/sessions/revoke` | token | Revoke and fan out to the node |

A session the broker cannot verify is **not stored** — it must not later be asked to revoke a
session it never validated.

Revocation stands in the broker's own registry even when the node is unreachable; the caller
gets the fan-out error in `notifyError`, and the envelope still expires on schedule.

## Running

```bash
BIFROST_SIGNING_SECRET=<shared secret> \
BIFROST_BROKER_TOKEN=<control-plane token> \
BIFROST_NODE_ENDPOINTS=desktop_primary=http://desktop-primary.tailnet.ts.net:8777 \
go run ./cmd/bifrost-broker

go vet ./... && go test ./...
```

A background sweep every 30 seconds revokes envelopes that have aged out and pushes the
revocation to the node. Nodes already refuse expired envelopes on their own; the sweep closes
the window where a node is still streaming because nothing told it to stop.

## Not implemented

Persistence — the registry is in memory, so a restart drops liveness and session state. That
fails safe (devices look stale, crossings are denied) but means a restart interrupts live
sessions. Backing it with the existing `supabase/migrations` schema is the natural next step.
