# Heimdall Gatekeeper (Rust)

The node-side half of the Bifrost Bridge. Runs on the machine being reached.

Its job is narrow and defensive. It does **not** decide policy — Heimdall's TypeScript half
(`src/bifrost/heimdall-guardian.ts`) rules on whether a crossing is permitted. This daemon
enforces a ruling that was already made and signed.

## What it enforces

1. **Envelope verification, locally.** Signature first, then the validity window. It never
   asks the control plane whether a session is valid, so a gatekeeper that has lost contact
   fails closed as envelopes expire rather than failing open.
2. **Scope containment.** An action outside the envelope's granted scopes is refused. An
   action the daemon does not recognize is refused too — there is no "unclassified, allow".
3. **Transport binding.** The envelope's transport must match the one this node serves, so an
   envelope minted for the streaming path cannot be replayed against the transfer path.
4. **Local revocation**, checked *before* signature validity: a revoked session is refused
   while its signature is still perfectly good.

## Configuration

All via environment. Missing or weak values are fatal — the bridge fails closed.

| Variable | Required | Default | Meaning |
|---|---|---|---|
| `HEIMDALL_DEVICE_ID` | yes | — | This node's device id. Envelopes for other devices are rejected. |
| `BIFROST_SIGNING_SECRET` | yes | — | Shared HMAC secret. Minimum 16 characters. |
| `HEIMDALL_TRANSPORT` | no | `rustdesk_control` | Transport this node exposes. |
| `HEIMDALL_BIND` | no | `127.0.0.1:8777` | Listen address. Loopback or a tailnet address only. |
| `BIFROST_BROKER_URL` | no | — | Broker to heartbeat. Without it, heartbeats are disabled and the control plane treats this node as stale. |
| `HEIMDALL_HEARTBEAT_SECONDS` | no | `30` | Heartbeat interval. Must stay well under the control plane's 90s staleness window. |

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/v1/health` | Liveness, device id, transport, revocation count |
| POST | `/v1/authorize` | `{ envelope, action }` → is this action inside the envelope? |
| POST | `/v1/revoke` | `{ sessionId }` → refuse this session from now on |

## Running

```bash
HEIMDALL_DEVICE_ID=desktop_primary \
BIFROST_SIGNING_SECRET=<shared secret> \
HEIMDALL_TRANSPORT=rustdesk_control \
BIFROST_BROKER_URL=http://bifrost-broker.tailnet.ts.net:8080 \
cargo run --release

cargo test   # 24 tests, including the cross-language signing vector
```

## Not implemented

This daemon authorizes actions; it does not perform them. Wiring an authorized action to an
actual Sunshine/RustDesk/Tauri process is the next piece of work. The HTTP listener is
deliberately minimal and must never be exposed on a public interface.
