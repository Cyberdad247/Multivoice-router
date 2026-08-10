//! Heartbeat emission.
//!
//! Heimdall denies crossings to any device whose gatekeeper has gone quiet
//! (see src/bifrost/device-registry.ts, HEARTBEAT_STALE_SECONDS). That makes
//! this loop a safety mechanism rather than telemetry: a node that stops
//! reporting is progressively locked out as its envelopes expire.

use std::io::{Read, Write};
use std::net::TcpStream;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use crate::config::Config;
use crate::server::RevocationList;
use crate::time::{format_rfc3339_utc, now_epoch_seconds};

pub fn spawn(config: Config, revocations: Arc<Mutex<RevocationList>>) {
    let Some(broker_url) = config.broker_url.clone() else {
        eprintln!("[heimdall] no {} set; heartbeats disabled (node will be treated as stale)", crate::config::BROKER_ENV);
        return;
    };

    std::thread::spawn(move || loop {
        let revoked = revocations.lock().map(|r| r.len()).unwrap_or(0);
        let payload = serde_json::json!({
            "deviceId": config.device_id,
            "transport": config.transport,
            "observedAt": format_rfc3339_utc(now_epoch_seconds()),
            "revokedSessions": revoked,
        })
        .to_string();

        match post(&broker_url, "/v1/heartbeat", &payload) {
            Ok(status) if (200..300).contains(&status) => {}
            Ok(status) => eprintln!("[heimdall] broker rejected heartbeat with HTTP {status}"),
            Err(err) => eprintln!("[heimdall] heartbeat failed: {err}"),
        }

        std::thread::sleep(Duration::from_secs(config.heartbeat_seconds));
    });
}

/// Minimal HTTP POST over the tailnet. No TLS: the mesh already provides
/// transport encryption and the broker is only ever addressed by its tailnet
/// name. Do not point this at a public host.
fn post(base_url: &str, path: &str, body: &str) -> std::io::Result<u16> {
    let trimmed = base_url.trim_end_matches('/');
    let authority = trimmed
        .strip_prefix("http://")
        .or_else(|| trimmed.strip_prefix("https://"))
        .unwrap_or(trimmed);

    let host_port = if authority.contains(':') {
        authority.to_string()
    } else {
        format!("{authority}:80")
    };

    let mut stream = TcpStream::connect(&host_port)?;
    stream.set_read_timeout(Some(Duration::from_secs(5)))?;
    stream.set_write_timeout(Some(Duration::from_secs(5)))?;

    let host = host_port.split(':').next().unwrap_or(&host_port);
    write!(
        stream,
        "POST {path} HTTP/1.1\r\nHost: {host}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.len()
    )?;
    stream.flush()?;

    let mut response = String::new();
    stream.read_to_string(&mut response)?;

    Ok(parse_status(&response).unwrap_or(0))
}

fn parse_status(response: &str) -> Option<u16> {
    response.lines().next()?.split_whitespace().nth(1)?.parse().ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_status_line() {
        assert_eq!(parse_status("HTTP/1.1 204 No Content\r\n\r\n"), Some(204));
        assert_eq!(parse_status("HTTP/1.1 500 Internal Server Error\r\n"), Some(500));
    }

    #[test]
    fn tolerates_garbage_response() {
        assert_eq!(parse_status(""), None);
        assert_eq!(parse_status("not http"), None);
    }
}
