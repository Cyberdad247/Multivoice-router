//! Bifrost session envelope verification.
//!
//! The node verifies its own authorization. It does not call the broker to ask
//! whether a session is valid — it rebuilds the canonical string, checks the
//! HMAC against the shared secret, then checks the validity window. A gatekeeper
//! that has lost contact with the control plane therefore fails closed as
//! existing envelopes expire, rather than failing open.
//!
//! CANONICAL FORM — keep in lockstep with:
//!   src/bifrost/session-token.ts
//!   services/bifrost-broker/internal/token/token.go
//!
//!   bifrost-v1|sessionId|deviceId|transport|fidelity|scopes|riskClass|notBefore|notAfter|maxIdleSeconds|issuedBy

use hmac::{Hmac, KeyInit, Mac};
use serde::{Deserialize, Serialize};
use sha2::Sha256;

use crate::time::{now_epoch_seconds, parse_rfc3339_utc};

pub const TOKEN_VERSION: &str = "bifrost-v1";

type HmacSha256 = Hmac<Sha256>;

/// The envelope as it arrives over the wire from the broker.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionEnvelope {
    #[serde(rename = "sessionId")]
    pub session_id: String,
    #[serde(rename = "deviceId")]
    pub device_id: String,
    pub transport: String,
    pub fidelity: String,
    pub scopes: Vec<String>,
    #[serde(rename = "riskClass")]
    pub risk_class: String,
    #[serde(rename = "issuedBy")]
    pub issued_by: String,
    #[serde(rename = "notBefore")]
    pub not_before: String,
    #[serde(rename = "notAfter")]
    pub not_after: String,
    #[serde(rename = "maxIdleSeconds")]
    pub max_idle_seconds: i64,
    pub signature: String,
}

#[derive(Debug, PartialEq, Eq)]
pub enum VerifyError {
    SignatureMismatch,
    NotYetValid { not_before: String },
    Expired { not_after: String },
    MalformedTimestamp(String),
    WrongDevice { expected: String, found: String },
}

impl std::fmt::Display for VerifyError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            VerifyError::SignatureMismatch => write!(f, "signature mismatch"),
            VerifyError::NotYetValid { not_before } => write!(f, "session not valid until {not_before}"),
            VerifyError::Expired { not_after } => write!(f, "session expired at {not_after}"),
            VerifyError::MalformedTimestamp(m) => write!(f, "malformed timestamp: {m}"),
            VerifyError::WrongDevice { expected, found } => {
                write!(f, "envelope is for device {found}, this node is {expected}")
            }
        }
    }
}

/// Lowercase, de-duplicate, sort, comma-join — identical to the TypeScript side.
pub fn normalize_scopes(scopes: &[String]) -> String {
    let mut normalized: Vec<String> = scopes.iter().map(|s| s.to_lowercase()).collect();
    normalized.sort();
    normalized.dedup();
    normalized.join(",")
}

pub fn build_canonical(envelope: &SessionEnvelope) -> String {
    [
        TOKEN_VERSION,
        &envelope.session_id,
        &envelope.device_id,
        &envelope.transport,
        &envelope.fidelity,
        &normalize_scopes(&envelope.scopes),
        &envelope.risk_class,
        &envelope.not_before,
        &envelope.not_after,
        &envelope.max_idle_seconds.to_string(),
        &envelope.issued_by,
    ]
    .join("|")
}

pub fn sign_canonical(canonical: &str, secret: &str) -> String {
    let mut mac = HmacSha256::new_from_slice(secret.as_bytes()).expect("HMAC accepts any key length");
    mac.update(canonical.as_bytes());
    hex::encode(mac.finalize().into_bytes())
}

/// Verify signature, then the validity window, then device binding.
///
/// Order matters: an expired envelope with a valid signature and an envelope
/// with a forged signature must both fail, and we never want to report *why*
/// beyond what the operator needs, so the signature check comes first.
pub fn verify(
    envelope: &SessionEnvelope,
    secret: &str,
    this_device_id: &str,
    now_epoch: Option<i64>,
) -> Result<(), VerifyError> {
    let canonical = build_canonical(envelope);
    let expected = sign_canonical(&canonical, secret);

    // Constant-time comparison over the hex digests.
    if !constant_time_eq(expected.as_bytes(), envelope.signature.as_bytes()) {
        return Err(VerifyError::SignatureMismatch);
    }

    let not_before = parse_rfc3339_utc(&envelope.not_before).map_err(VerifyError::MalformedTimestamp)?;
    let not_after = parse_rfc3339_utc(&envelope.not_after).map_err(VerifyError::MalformedTimestamp)?;
    let now = now_epoch.unwrap_or_else(now_epoch_seconds);

    if now < not_before {
        return Err(VerifyError::NotYetValid { not_before: envelope.not_before.clone() });
    }
    if now >= not_after {
        return Err(VerifyError::Expired { not_after: envelope.not_after.clone() });
    }

    if envelope.device_id != this_device_id {
        return Err(VerifyError::WrongDevice {
            expected: this_device_id.to_string(),
            found: envelope.device_id.clone(),
        });
    }

    Ok(())
}

fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    let mut diff = 0u8;
    for (x, y) in a.iter().zip(b.iter()) {
        diff |= x ^ y;
    }
    diff == 0
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Shared cross-language vector. The same secret, claims and signature are
    /// asserted in src/tests/smoke.test.ts and in the Go broker's token test.
    /// If any one of the three implementations drifts, this fails.
    const VECTOR_SECRET: &str = "bifrost-test-secret-0123456789";
    const VECTOR_CANONICAL: &str = "bifrost-v1|bfs_vector_001|desktop_primary|sunshine_moonlight|view|audio_out,screen_view|L1_DRAFT|2026-08-10T12:00:00Z|2026-08-10T12:15:00Z|600|sir_heimdall";
    const VECTOR_SIGNATURE: &str = "c20468d38da3a647f72f20de5c4c4a1468376cb563c01551c40a29f3aa853981";

    fn vector_envelope() -> SessionEnvelope {
        SessionEnvelope {
            session_id: "bfs_vector_001".into(),
            device_id: "desktop_primary".into(),
            transport: "sunshine_moonlight".into(),
            fidelity: "view".into(),
            // Deliberately unsorted: normalization must fix the order.
            scopes: vec!["screen_view".into(), "audio_out".into()],
            risk_class: "L1_DRAFT".into(),
            issued_by: "sir_heimdall".into(),
            not_before: "2026-08-10T12:00:00Z".into(),
            not_after: "2026-08-10T12:15:00Z".into(),
            max_idle_seconds: 600,
            signature: VECTOR_SIGNATURE.into(),
        }
    }

    #[test]
    fn canonical_matches_typescript() {
        assert_eq!(build_canonical(&vector_envelope()), VECTOR_CANONICAL);
    }

    #[test]
    fn signature_matches_typescript() {
        assert_eq!(sign_canonical(VECTOR_CANONICAL, VECTOR_SECRET), VECTOR_SIGNATURE);
    }

    #[test]
    fn accepts_valid_envelope_inside_window() {
        let inside = parse_rfc3339_utc("2026-08-10T12:05:00Z").unwrap();
        assert!(verify(&vector_envelope(), VECTOR_SECRET, "desktop_primary", Some(inside)).is_ok());
    }

    #[test]
    fn rejects_expired_envelope() {
        let after = parse_rfc3339_utc("2026-08-10T12:20:00Z").unwrap();
        assert_eq!(
            verify(&vector_envelope(), VECTOR_SECRET, "desktop_primary", Some(after)),
            Err(VerifyError::Expired { not_after: "2026-08-10T12:15:00Z".into() })
        );
    }

    #[test]
    fn rejects_envelope_before_window() {
        let before = parse_rfc3339_utc("2026-08-10T11:59:00Z").unwrap();
        assert_eq!(
            verify(&vector_envelope(), VECTOR_SECRET, "desktop_primary", Some(before)),
            Err(VerifyError::NotYetValid { not_before: "2026-08-10T12:00:00Z".into() })
        );
    }

    #[test]
    fn rejects_wrong_secret() {
        let inside = parse_rfc3339_utc("2026-08-10T12:05:00Z").unwrap();
        assert_eq!(
            verify(&vector_envelope(), "a-different-secret-entirely", "desktop_primary", Some(inside)),
            Err(VerifyError::SignatureMismatch)
        );
    }

    #[test]
    fn rejects_scope_escalation() {
        // Adding a scope changes the canonical string, so the signature no longer matches.
        let mut tampered = vector_envelope();
        tampered.scopes.push("shell_exec".into());
        let inside = parse_rfc3339_utc("2026-08-10T12:05:00Z").unwrap();
        assert_eq!(
            verify(&tampered, VECTOR_SECRET, "desktop_primary", Some(inside)),
            Err(VerifyError::SignatureMismatch)
        );
    }

    #[test]
    fn rejects_envelope_for_another_device() {
        let inside = parse_rfc3339_utc("2026-08-10T12:05:00Z").unwrap();
        let result = verify(&vector_envelope(), VECTOR_SECRET, "gpu_workstation", Some(inside));
        assert!(matches!(result, Err(VerifyError::WrongDevice { .. })));
    }
}
