//! Scope enforcement.
//!
//! A verified envelope proves *what was authorized*. This module answers the
//! separate question of whether the action now being attempted falls inside
//! that authorization.
//!
//! The mapping is intentionally total and closed: an action with no known scope
//! is refused rather than allowed through as "unclassified".

use std::collections::HashSet;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ScopeDecision {
    Allowed,
    /// The action is known but the envelope does not carry its scope.
    MissingScope { action: String, required: String },
    /// The action is not in the gatekeeper's vocabulary at all.
    UnknownAction { action: String },
}

impl std::fmt::Display for ScopeDecision {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ScopeDecision::Allowed => write!(f, "allowed"),
            ScopeDecision::MissingScope { action, required } => {
                write!(f, "action '{action}' requires scope '{required}', which this session was not granted")
            }
            ScopeDecision::UnknownAction { action } => {
                write!(f, "action '{action}' is not recognized; refusing by default")
            }
        }
    }
}

/// Every action this daemon will ever perform, and the scope it costs.
pub fn required_scope(action: &str) -> Option<&'static str> {
    Some(match action {
        // observe
        "list_processes" | "process_list" => "process_list",
        "network_stats" | "flow_matrix" => "network_observe",
        // view
        "screenshot" | "start_stream" | "stop_stream" => "screen_view",
        "audio_stream" => "audio_out",
        // interact
        "type_text" | "hotkey" | "mouse_move" | "mouse_click" => "input_inject",
        "clipboard_read" => "clipboard_read",
        // control
        "clipboard_write" => "clipboard_write",
        "file_pull" | "download_file" => "file_pull",
        "file_push" | "upload_file" => "file_push",
        "shell_command" | "shell_exec" => "shell_exec",
        _ => return None,
    })
}

pub fn authorize(action: &str, granted_scopes: &[String]) -> ScopeDecision {
    let required = match required_scope(action) {
        Some(scope) => scope,
        None => return ScopeDecision::UnknownAction { action: action.to_string() },
    };

    let granted: HashSet<String> = granted_scopes.iter().map(|s| s.to_lowercase()).collect();

    if granted.contains(required) {
        ScopeDecision::Allowed
    } else {
        ScopeDecision::MissingScope { action: action.to_string(), required: required.to_string() }
    }
}

/// Transports are capped independently of scopes, so a compromised broker
/// cannot mint an envelope that, say, moves files over the streaming path.
pub fn transport_permits(transport: &str, scope: &str) -> bool {
    match transport {
        "sunshine_moonlight" => matches!(scope, "screen_view" | "audio_out" | "input_inject"),
        "rustdesk_control" => matches!(
            scope,
            "screen_view" | "input_inject" | "clipboard_read" | "clipboard_write" | "file_pull" | "file_push"
        ),
        "tauri_agent" => matches!(scope, "process_list" | "file_pull" | "shell_exec"),
        "sonar_sensor" | "tailscale_mesh" => matches!(scope, "network_observe"),
        _ => false,
    }
}

/// Full check: the action must be in scope *and* the transport must be able to
/// carry that scope. Both sides are enforced locally.
pub fn authorize_on_transport(action: &str, transport: &str, granted_scopes: &[String]) -> ScopeDecision {
    match authorize(action, granted_scopes) {
        ScopeDecision::Allowed => {
            let required = required_scope(action).unwrap_or("");
            if transport_permits(transport, required) {
                ScopeDecision::Allowed
            } else {
                ScopeDecision::MissingScope {
                    action: action.to_string(),
                    required: format!("{required} (not carriable over {transport})"),
                }
            }
        }
        other => other,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn scopes(list: &[&str]) -> Vec<String> {
        list.iter().map(|s| s.to_string()).collect()
    }

    #[test]
    fn allows_screenshot_with_screen_view() {
        assert_eq!(authorize("screenshot", &scopes(&["screen_view"])), ScopeDecision::Allowed);
    }

    #[test]
    fn refuses_shell_without_scope() {
        assert_eq!(
            authorize("shell_command", &scopes(&["screen_view", "input_inject"])),
            ScopeDecision::MissingScope { action: "shell_command".into(), required: "shell_exec".into() }
        );
    }

    #[test]
    fn refuses_unknown_action_by_default() {
        assert_eq!(
            authorize("format_disk", &scopes(&["shell_exec", "file_push"])),
            ScopeDecision::UnknownAction { action: "format_disk".into() }
        );
    }

    #[test]
    fn streaming_transport_cannot_move_files() {
        // Even if an envelope somehow carried file_push, Sunshine may not do it.
        assert!(matches!(
            authorize_on_transport("file_push", "sunshine_moonlight", &scopes(&["file_push"])),
            ScopeDecision::MissingScope { .. }
        ));
        assert_eq!(
            authorize_on_transport("file_push", "rustdesk_control", &scopes(&["file_push"])),
            ScopeDecision::Allowed
        );
    }

    #[test]
    fn sensor_transport_is_read_only() {
        assert!(transport_permits("sonar_sensor", "network_observe"));
        assert!(!transport_permits("sonar_sensor", "input_inject"));
        assert!(!transport_permits("sonar_sensor", "shell_exec"));
    }

    #[test]
    fn unknown_transport_permits_nothing() {
        assert!(!transport_permits("something_new", "screen_view"));
    }
}
