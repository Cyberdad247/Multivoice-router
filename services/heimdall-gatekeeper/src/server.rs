//! The gatekeeper's local HTTP surface.
//!
//! Deliberately tiny and dependency-free: this listens on loopback (or a
//! tailnet address) and answers three questions. It is not a general web
//! server and should never be exposed to a public interface.
//!
//!   POST /v1/authorize  { envelope, action }  → is this action inside the envelope?
//!   POST /v1/revoke     { sessionId }         → refuse this session from now on
//!   GET  /v1/health                           → liveness + revocation count

use std::collections::HashSet;
use std::io::{BufRead, BufReader, Read, Write};
use std::net::{TcpListener, TcpStream};
use std::sync::{Arc, Mutex};

use serde::{Deserialize, Serialize};

use crate::config::Config;
use crate::provision::{apply_writes, validate_plan, ProvisioningPlan};
use crate::scope::{authorize_on_transport, ScopeDecision};
use crate::token::{verify, SessionEnvelope};

#[derive(Debug, Deserialize)]
struct AuthorizeRequest {
    envelope: SessionEnvelope,
    action: String,
}

#[derive(Debug, Deserialize)]
struct RevokeRequest {
    #[serde(rename = "sessionId")]
    session_id: String,
}

#[derive(Debug, Deserialize)]
struct ProvisionRequest {
    envelope: SessionEnvelope,
    plan: ProvisioningPlan,
    /// When true the plan is checked but nothing is written.
    #[serde(default)]
    dry_run: bool,
}

#[derive(Debug, Serialize)]
struct ProvisionResponse {
    ok: bool,
    decision: String,
    reason: String,
    #[serde(rename = "sessionId")]
    session_id: String,
    #[serde(rename = "filesWritten")]
    files_written: usize,
    targets: Vec<String>,
}

#[derive(Debug, Serialize)]
struct AuthorizeResponse {
    ok: bool,
    decision: String,
    reason: String,
    #[serde(rename = "sessionId")]
    session_id: String,
}

#[derive(Debug, Serialize)]
struct HealthResponse {
    ok: bool,
    service: &'static str,
    #[serde(rename = "deviceId")]
    device_id: String,
    transport: String,
    #[serde(rename = "revokedSessions")]
    revoked_sessions: usize,
}

/// Sessions this node refuses regardless of envelope validity. Revocation is
/// local and immediate — it does not wait for the envelope to expire.
#[derive(Default)]
pub struct RevocationList {
    revoked: HashSet<String>,
}

impl RevocationList {
    pub fn revoke(&mut self, session_id: &str) {
        self.revoked.insert(session_id.to_string());
    }

    pub fn is_revoked(&self, session_id: &str) -> bool {
        self.revoked.contains(session_id)
    }

    pub fn len(&self) -> usize {
        self.revoked.len()
    }

    /// Companion to `len`. Used by the tests; kept for API completeness.
    #[allow(dead_code)]
    pub fn is_empty(&self) -> bool {
        self.revoked.is_empty()
    }
}

pub fn serve(config: Config, revocations: Arc<Mutex<RevocationList>>) -> std::io::Result<()> {
    let listener = TcpListener::bind(&config.bind)?;
    eprintln!(
        "[heimdall] gatekeeper listening on {} for device '{}' over transport '{}'",
        config.bind, config.device_id, config.transport
    );

    for stream in listener.incoming() {
        match stream {
            Ok(stream) => {
                let config = config.clone();
                let revocations = Arc::clone(&revocations);
                std::thread::spawn(move || {
                    if let Err(err) = handle(stream, &config, revocations) {
                        eprintln!("[heimdall] connection error: {err}");
                    }
                });
            }
            Err(err) => eprintln!("[heimdall] accept failed: {err}"),
        }
    }

    Ok(())
}

fn handle(mut stream: TcpStream, config: &Config, revocations: Arc<Mutex<RevocationList>>) -> std::io::Result<()> {
    let mut reader = BufReader::new(stream.try_clone()?);

    let mut request_line = String::new();
    if reader.read_line(&mut request_line)? == 0 {
        return Ok(());
    }

    let mut parts = request_line.split_whitespace();
    let method = parts.next().unwrap_or("").to_string();
    let path = parts.next().unwrap_or("").to_string();

    // Consume headers, keeping only Content-Length.
    let mut content_length = 0usize;
    loop {
        let mut line = String::new();
        if reader.read_line(&mut line)? == 0 {
            break;
        }
        let trimmed = line.trim_end();
        if trimmed.is_empty() {
            break;
        }
        if let Some(value) = trimmed.strip_prefix("Content-Length:") {
            content_length = value.trim().parse().unwrap_or(0);
        } else if let Some(value) = trimmed.strip_prefix("content-length:") {
            content_length = value.trim().parse().unwrap_or(0);
        }
    }

    // Cap the body so a malformed Content-Length cannot exhaust memory.
    const MAX_BODY: usize = 64 * 1024;
    let mut body = vec![0u8; content_length.min(MAX_BODY)];
    if !body.is_empty() {
        reader.read_exact(&mut body)?;
    }

    let (status, payload) = route(&method, &path, &body, config, revocations);
    write_response(&mut stream, status, &payload)
}

fn route(
    method: &str,
    path: &str,
    body: &[u8],
    config: &Config,
    revocations: Arc<Mutex<RevocationList>>,
) -> (u16, String) {
    match (method, path) {
        ("GET", "/v1/health") => {
            let revoked = revocations.lock().map(|r| r.len()).unwrap_or(0);
            let response = HealthResponse {
                ok: true,
                service: "heimdall-gatekeeper",
                device_id: config.device_id.clone(),
                transport: config.transport.clone(),
                revoked_sessions: revoked,
            };
            (200, serde_json::to_string(&response).unwrap_or_default())
        }

        ("POST", "/v1/revoke") => match serde_json::from_slice::<RevokeRequest>(body) {
            Ok(request) => {
                if let Ok(mut list) = revocations.lock() {
                    list.revoke(&request.session_id);
                }
                eprintln!("[heimdall] revoked session {}", request.session_id);
                (200, format!(r#"{{"ok":true,"revoked":"{}"}}"#, request.session_id))
            }
            Err(err) => (400, error_json(&format!("malformed revoke request: {err}"))),
        },

        ("POST", "/v1/authorize") => match serde_json::from_slice::<AuthorizeRequest>(body) {
            Ok(request) => (200, authorize_response(request, config, revocations)),
            Err(err) => (400, error_json(&format!("malformed authorize request: {err}"))),
        },

        ("POST", "/v1/provision") => match serde_json::from_slice::<ProvisionRequest>(body) {
            Ok(request) => provision_response(request, config, revocations),
            Err(err) => (400, error_json(&format!("malformed provision request: {err}"))),
        },

        _ => (404, error_json("no such endpoint")),
    }
}

fn authorize_response(
    request: AuthorizeRequest,
    config: &Config,
    revocations: Arc<Mutex<RevocationList>>,
) -> String {
    let session_id = request.envelope.session_id.clone();

    // Revocation is checked before anything else: a revoked session is refused
    // even while its signature and window are still perfectly valid.
    if revocations.lock().map(|r| r.is_revoked(&session_id)).unwrap_or(false) {
        return deny(&session_id, "revoked", "session has been revoked on this node");
    }

    if let Err(err) = verify(&request.envelope, &config.signing_secret, &config.device_id, None) {
        return deny(&session_id, "envelope_rejected", &err.to_string());
    }

    // The envelope names a transport; this node also has one. Both must agree,
    // so an envelope minted for the streaming path cannot be replayed here.
    if request.envelope.transport != config.transport {
        return deny(
            &session_id,
            "transport_mismatch",
            &format!(
                "envelope is for transport '{}', this node serves '{}'",
                request.envelope.transport, config.transport
            ),
        );
    }

    match authorize_on_transport(&request.action, &config.transport, &request.envelope.scopes) {
        ScopeDecision::Allowed => {
            let response = AuthorizeResponse {
                ok: true,
                decision: "allowed".into(),
                reason: format!("action '{}' is within the session envelope", request.action),
                session_id,
            };
            serde_json::to_string(&response).unwrap_or_default()
        }
        other => deny(&session_id, "out_of_scope", &other.to_string()),
    }
}

/// Provisioning runs the same gauntlet as any other action: revocation first,
/// then envelope verification, then the plan's own validation against the
/// envelope's scopes and this node's transport.
fn provision_response(
    request: ProvisionRequest,
    config: &Config,
    revocations: Arc<Mutex<RevocationList>>,
) -> (u16, String) {
    let session_id = request.envelope.session_id.clone();

    let refuse = |decision: &str, reason: String| -> (u16, String) {
        let response = ProvisionResponse {
            ok: false,
            decision: decision.to_string(),
            reason,
            session_id: session_id.clone(),
            files_written: 0,
            targets: Vec::new(),
        };
        (403, serde_json::to_string(&response).unwrap_or_default())
    };

    if revocations.lock().map(|r| r.is_revoked(&session_id)).unwrap_or(false) {
        return refuse("revoked", "session has been revoked on this node".into());
    }

    if let Err(err) = verify(&request.envelope, &config.signing_secret, &config.device_id, None) {
        return refuse("envelope_rejected", err.to_string());
    }

    if request.envelope.transport != config.transport {
        return refuse(
            "transport_mismatch",
            format!(
                "envelope is for transport '{}', this node serves '{}'",
                request.envelope.transport, config.transport
            ),
        );
    }

    let writes = match validate_plan(&request.plan, &request.envelope, &config.config_root) {
        Ok(writes) => writes,
        Err(rejection) => return refuse("plan_rejected", rejection.to_string()),
    };

    let targets: Vec<String> = writes
        .iter()
        .map(|(path, _)| path.display().to_string())
        .collect();

    if request.dry_run {
        let response = ProvisionResponse {
            ok: true,
            decision: "dry_run".into(),
            reason: format!("{} file(s) would be written", writes.len()),
            session_id,
            files_written: 0,
            targets,
        };
        return (200, serde_json::to_string(&response).unwrap_or_default());
    }

    match apply_writes(&writes) {
        Ok(count) => {
            let response = ProvisionResponse {
                ok: true,
                decision: "provisioned".into(),
                reason: format!("wrote {count} config file(s)"),
                session_id,
                files_written: count,
                targets,
            };
            (200, serde_json::to_string(&response).unwrap_or_default())
        }
        Err(err) => refuse("write_failed", err.to_string()),
    }
}

fn deny(session_id: &str, decision: &str, reason: &str) -> String {
    let response = AuthorizeResponse {
        ok: false,
        decision: decision.to_string(),
        reason: reason.to_string(),
        session_id: session_id.to_string(),
    };
    serde_json::to_string(&response).unwrap_or_default()
}

fn error_json(message: &str) -> String {
    serde_json::json!({ "ok": false, "error": message }).to_string()
}

fn write_response(stream: &mut TcpStream, status: u16, payload: &str) -> std::io::Result<()> {
    let reason = match status {
        200 => "OK",
        400 => "Bad Request",
        404 => "Not Found",
        _ => "Internal Server Error",
    };

    write!(
        stream,
        "HTTP/1.1 {status} {reason}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{payload}",
        payload.len()
    )?;
    stream.flush()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn revocation_list_tracks_sessions() {
        let mut list = RevocationList::default();
        assert!(list.is_empty());
        list.revoke("bfs_1");
        assert!(list.is_revoked("bfs_1"));
        assert!(!list.is_revoked("bfs_2"));
        assert_eq!(list.len(), 1);
    }

    #[test]
    fn revoking_twice_is_idempotent() {
        let mut list = RevocationList::default();
        list.revoke("bfs_1");
        list.revoke("bfs_1");
        assert_eq!(list.len(), 1);
    }
}
