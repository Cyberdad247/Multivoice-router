//! Provisioning plan validation and application.
//!
//! The control plane sends a declarative plan; this module decides whether the
//! node will carry it out. It re-derives every constraint locally rather than
//! trusting the plan, because a plan arrives over the network and the envelope
//! is the only thing that was signed.
//!
//! Four independent checks, all of which must pass:
//!
//!   1. The verb is one of four known verbs.
//!   2. The target is on the allowlist **for the envelope's transport** — not
//!      merely a safe-looking path. An attacker who controls the plan cannot
//!      name a file we did not already intend to write.
//!   3. The path, after normalization, still resolves inside the config root.
//!   4. The step's implied scope is present in the signed envelope.
//!
//! Check 2 is what makes check 3 belt-and-braces rather than load-bearing.

use std::collections::HashSet;
use std::path::{Component, Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::token::SessionEnvelope;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProvisioningStep {
    pub verb: String,
    pub target: String,
    #[serde(default)]
    pub content: Option<String>,
    #[serde(default)]
    pub transport: Option<String>,
    #[serde(default)]
    pub rationale: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProvisioningPlan {
    #[serde(rename = "sessionId")]
    pub session_id: String,
    #[serde(rename = "deviceId")]
    pub device_id: String,
    pub transport: String,
    pub steps: Vec<ProvisioningStep>,
}

#[derive(Debug, PartialEq, Eq)]
pub enum PlanRejection {
    UnknownVerb(String),
    TargetNotAllowed { target: String, transport: String },
    UnsafePath(String),
    MissingScope { verb: String, required: String },
    TransportMismatch { plan: String, envelope: String },
    SessionMismatch { plan: String, envelope: String },
    MissingContent(String),
    ContentTooLarge { target: String, bytes: usize },
}

impl std::fmt::Display for PlanRejection {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PlanRejection::UnknownVerb(v) => write!(f, "unknown provisioning verb '{v}'"),
            PlanRejection::TargetNotAllowed { target, transport } => {
                write!(f, "target '{target}' is not on the allowlist for transport '{transport}'")
            }
            PlanRejection::UnsafePath(p) => write!(f, "target '{p}' escapes the config root"),
            PlanRejection::MissingScope { verb, required } => {
                write!(f, "verb '{verb}' requires scope '{required}', which this session was not granted")
            }
            PlanRejection::TransportMismatch { plan, envelope } => {
                write!(f, "plan targets transport '{plan}' but the envelope authorizes '{envelope}'")
            }
            PlanRejection::SessionMismatch { plan, envelope } => {
                write!(f, "plan is for session '{plan}' but the envelope is '{envelope}'")
            }
            PlanRejection::MissingContent(t) => write!(f, "write_config step for '{t}' has no content"),
            PlanRejection::ContentTooLarge { target, bytes } => {
                write!(f, "config '{target}' is {bytes} bytes, over the limit")
            }
        }
    }
}

pub const MAX_CONFIG_BYTES: usize = 64 * 1024;

/// Config file names this node will ever write, per transport.
fn allowed_targets(transport: &str) -> &'static [&'static str] {
    match transport {
        "sunshine_moonlight" => &["sunshine.conf", "stream-profile.json", "sunshine"],
        "rustdesk_control" => &["rustdesk.toml", "rustdesk"],
        "tauri_agent" => &["camelot-agent.json", "camelot-agent"],
        "sonar_sensor" => &["sonar.toml", "sonar"],
        _ => &[],
    }
}

/// Scope each verb costs. `write_config` is covered by the target allowlist.
fn required_scope(verb: &str) -> Option<&'static str> {
    match verb {
        "apply_stream_profile" => Some("screen_view"),
        _ => None,
    }
}

const KNOWN_VERBS: [&str; 4] = ["write_config", "start_transport", "stop_transport", "apply_stream_profile"];

/// Resolve a relative target inside the root, refusing anything that escapes.
///
/// Rejects absolute paths, `..`, and root/prefix components outright rather
/// than trying to canonicalize — the file need not exist yet, so
/// `fs::canonicalize` is not available to us here.
pub fn resolve_target(root: &Path, target: &str) -> Result<PathBuf, PlanRejection> {
    if target.is_empty() || target.len() > 128 || target.contains('\0') {
        return Err(PlanRejection::UnsafePath(target.to_string()));
    }

    let candidate = Path::new(target);
    let mut resolved = root.to_path_buf();

    for component in candidate.components() {
        match component {
            Component::Normal(part) => resolved.push(part),
            // Anything else can leave the root.
            Component::ParentDir | Component::RootDir | Component::Prefix(_) => {
                return Err(PlanRejection::UnsafePath(target.to_string()));
            }
            Component::CurDir => {}
        }
    }

    if !resolved.starts_with(root) {
        return Err(PlanRejection::UnsafePath(target.to_string()));
    }

    Ok(resolved)
}

/// Validate a plan against the signed envelope. Returns the resolved writes.
pub fn validate_plan(
    plan: &ProvisioningPlan,
    envelope: &SessionEnvelope,
    root: &Path,
) -> Result<Vec<(PathBuf, String)>, PlanRejection> {
    if plan.session_id != envelope.session_id {
        return Err(PlanRejection::SessionMismatch {
            plan: plan.session_id.clone(),
            envelope: envelope.session_id.clone(),
        });
    }
    if plan.transport != envelope.transport {
        return Err(PlanRejection::TransportMismatch {
            plan: plan.transport.clone(),
            envelope: envelope.transport.clone(),
        });
    }

    let granted: HashSet<String> = envelope.scopes.iter().map(|s| s.to_lowercase()).collect();
    let allowed = allowed_targets(&envelope.transport);
    let mut writes = Vec::new();

    for step in &plan.steps {
        if !KNOWN_VERBS.contains(&step.verb.as_str()) {
            return Err(PlanRejection::UnknownVerb(step.verb.clone()));
        }

        if !allowed.contains(&step.target.as_str()) {
            return Err(PlanRejection::TargetNotAllowed {
                target: step.target.clone(),
                transport: envelope.transport.clone(),
            });
        }

        if let Some(scope) = required_scope(&step.verb) {
            if !granted.contains(scope) {
                return Err(PlanRejection::MissingScope {
                    verb: step.verb.clone(),
                    required: scope.to_string(),
                });
            }
        }

        if step.verb == "write_config" || step.verb == "apply_stream_profile" {
            let content = step
                .content
                .as_ref()
                .ok_or_else(|| PlanRejection::MissingContent(step.target.clone()))?;

            if content.len() > MAX_CONFIG_BYTES {
                return Err(PlanRejection::ContentTooLarge {
                    target: step.target.clone(),
                    bytes: content.len(),
                });
            }

            let path = resolve_target(root, &step.target)?;
            writes.push((path, content.clone()));
        }
    }

    Ok(writes)
}

/// Apply a validated plan by writing its config files.
///
/// Transport start/stop is intentionally *not* implemented here: launching a
/// process is the one step that genuinely needs local operator policy, and a
/// half-built version of it would be worse than none. The plan is validated and
/// the configs are written; a supervisor unit reads them.
pub fn apply_writes(writes: &[(PathBuf, String)]) -> std::io::Result<usize> {
    for (path, content) in writes {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        std::fs::write(path, content)?;
    }
    Ok(writes.len())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn envelope(transport: &str, scopes: &[&str]) -> SessionEnvelope {
        SessionEnvelope {
            session_id: "bfs_1".into(),
            device_id: "desktop_primary".into(),
            transport: transport.into(),
            fidelity: "view".into(),
            scopes: scopes.iter().map(|s| s.to_string()).collect(),
            risk_class: "L1_DRAFT".into(),
            issued_by: "sir_heimdall".into(),
            not_before: "2026-08-10T12:00:00Z".into(),
            not_after: "2026-08-10T12:15:00Z".into(),
            max_idle_seconds: 600,
            signature: "unused-in-these-tests".into(),
        }
    }

    fn step(verb: &str, target: &str, content: Option<&str>) -> ProvisioningStep {
        ProvisioningStep {
            verb: verb.into(),
            target: target.into(),
            content: content.map(|c| c.into()),
            transport: None,
            rationale: String::new(),
        }
    }

    fn plan(transport: &str, steps: Vec<ProvisioningStep>) -> ProvisioningPlan {
        ProvisioningPlan {
            session_id: "bfs_1".into(),
            device_id: "desktop_primary".into(),
            transport: transport.into(),
            steps,
        }
    }

    #[test]
    fn accepts_a_well_formed_sunshine_plan() {
        let root = PathBuf::from("/var/lib/camelot");
        let p = plan(
            "sunshine_moonlight",
            vec![
                step("write_config", "sunshine.conf", Some("fps = 60")),
                step("apply_stream_profile", "stream-profile.json", Some("{}")),
                step("start_transport", "sunshine", None),
            ],
        );

        let writes = validate_plan(&p, &envelope("sunshine_moonlight", &["screen_view"]), &root).unwrap();
        assert_eq!(writes.len(), 2);
        assert_eq!(writes[0].0, root.join("sunshine.conf"));
    }

    #[test]
    fn rejects_path_traversal() {
        let root = PathBuf::from("/var/lib/camelot");
        assert!(matches!(
            resolve_target(&root, "../../etc/shadow"),
            Err(PlanRejection::UnsafePath(_))
        ));
        assert!(matches!(resolve_target(&root, "/etc/passwd"), Err(PlanRejection::UnsafePath(_))));
        assert!(matches!(resolve_target(&root, "a/../../b"), Err(PlanRejection::UnsafePath(_))));
    }

    #[test]
    fn rejects_target_outside_the_transport_allowlist() {
        let root = PathBuf::from("/var/lib/camelot");
        // A plausible-looking, perfectly relative filename we never intend to write.
        let p = plan("sunshine_moonlight", vec![step("write_config", "authorized_keys", Some("ssh-rsa ..."))]);

        assert_eq!(
            validate_plan(&p, &envelope("sunshine_moonlight", &["screen_view"]), &root),
            Err(PlanRejection::TargetNotAllowed {
                target: "authorized_keys".into(),
                transport: "sunshine_moonlight".into()
            })
        );
    }

    #[test]
    fn rejects_config_belonging_to_another_transport() {
        let root = PathBuf::from("/var/lib/camelot");
        // rustdesk.toml is allowlisted, but not for the streaming transport.
        let p = plan("sunshine_moonlight", vec![step("write_config", "rustdesk.toml", Some("x = 1"))]);
        assert!(matches!(
            validate_plan(&p, &envelope("sunshine_moonlight", &["screen_view"]), &root),
            Err(PlanRejection::TargetNotAllowed { .. })
        ));
    }

    #[test]
    fn rejects_unknown_verb() {
        let root = PathBuf::from("/var/lib/camelot");
        let p = plan("rustdesk_control", vec![step("exec_shell", "rustdesk", None)]);
        assert_eq!(
            validate_plan(&p, &envelope("rustdesk_control", &["screen_view"]), &root),
            Err(PlanRejection::UnknownVerb("exec_shell".into()))
        );
    }

    #[test]
    fn rejects_stream_profile_without_screen_view() {
        let root = PathBuf::from("/var/lib/camelot");
        let p = plan("sunshine_moonlight", vec![step("apply_stream_profile", "stream-profile.json", Some("{}"))]);
        assert_eq!(
            validate_plan(&p, &envelope("sunshine_moonlight", &["audio_out"]), &root),
            Err(PlanRejection::MissingScope { verb: "apply_stream_profile".into(), required: "screen_view".into() })
        );
    }

    #[test]
    fn rejects_transport_mismatch() {
        let root = PathBuf::from("/var/lib/camelot");
        let p = plan("rustdesk_control", vec![step("start_transport", "rustdesk", None)]);
        assert!(matches!(
            validate_plan(&p, &envelope("sunshine_moonlight", &["screen_view"]), &root),
            Err(PlanRejection::TransportMismatch { .. })
        ));
    }

    #[test]
    fn rejects_plan_for_another_session() {
        let root = PathBuf::from("/var/lib/camelot");
        let mut p = plan("rustdesk_control", vec![]);
        p.session_id = "bfs_other".into();
        assert!(matches!(
            validate_plan(&p, &envelope("rustdesk_control", &["screen_view"]), &root),
            Err(PlanRejection::SessionMismatch { .. })
        ));
    }

    #[test]
    fn rejects_oversized_config() {
        let root = PathBuf::from("/var/lib/camelot");
        let huge = "x".repeat(MAX_CONFIG_BYTES + 1);
        let p = plan("rustdesk_control", vec![step("write_config", "rustdesk.toml", Some(&huge))]);
        assert!(matches!(
            validate_plan(&p, &envelope("rustdesk_control", &["screen_view"]), &root),
            Err(PlanRejection::ContentTooLarge { .. })
        ));
    }

    #[test]
    fn unknown_transport_allows_nothing() {
        assert!(allowed_targets("something_new").is_empty());
    }
}
