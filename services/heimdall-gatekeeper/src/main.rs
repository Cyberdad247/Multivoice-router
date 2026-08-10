//! Heimdall Gatekeeper — the node-side half of the Bifrost Bridge.
//!
//! Runs on the machine being reached. Its job is narrow and defensive:
//!
//!   1. Verify session envelopes locally, without asking the control plane.
//!   2. Refuse any action outside the envelope's granted scopes.
//!   3. Refuse anything the node's own transport cannot carry, even if the
//!      envelope says otherwise.
//!   4. Heartbeat, so the control plane can tell a live node from a silent one.
//!   5. Honour local revocation immediately.
//!
//! It deliberately does *not* decide policy. Heimdall's TypeScript half
//! (src/bifrost/heimdall-guardian.ts) rules on whether a crossing is permitted;
//! this daemon only enforces a ruling that was already made and signed.
//!
//! Usage:
//!   HEIMDALL_DEVICE_ID=desktop_primary \
//!   BIFROST_SIGNING_SECRET=<shared secret> \
//!   HEIMDALL_TRANSPORT=rustdesk_control \
//!   BIFROST_BROKER_URL=http://bifrost-broker.tailnet.ts.net:8080 \
//!   cargo run --release

mod config;
mod heartbeat;
mod scope;
mod server;
mod time;
mod token;

use std::process::ExitCode;
use std::sync::{Arc, Mutex};

use config::Config;
use server::RevocationList;

fn main() -> ExitCode {
    let config = match Config::from_env() {
        Ok(config) => config,
        Err(err) => {
            eprintln!("[heimdall] configuration error: {err}");
            eprintln!("[heimdall] refusing to start. The bridge fails closed.");
            return ExitCode::from(2);
        }
    };

    eprintln!("[heimdall] Arch-Guardian of the Bifrost Bridge");
    eprintln!("[heimdall] device   : {}", config.device_id);
    eprintln!("[heimdall] transport: {}", config.transport);
    eprintln!(
        "[heimdall] broker   : {}",
        config.broker_url.as_deref().unwrap_or("(none — heartbeats disabled)")
    );

    let revocations = Arc::new(Mutex::new(RevocationList::default()));

    heartbeat::spawn(config.clone(), Arc::clone(&revocations));

    match server::serve(config, revocations) {
        Ok(()) => ExitCode::SUCCESS,
        Err(err) => {
            eprintln!("[heimdall] listener failed: {err}");
            ExitCode::FAILURE
        }
    }
}
