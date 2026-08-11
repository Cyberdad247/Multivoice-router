//! Configuration, resolved from the environment.
//!
//! Follows the same rule as services/kinetic-edge/turboquant.rs: never guess a
//! default for something security-relevant, and fail loudly when it is missing.

use std::env;

pub const DEVICE_ID_ENV: &str = "HEIMDALL_DEVICE_ID";
pub const SECRET_ENV: &str = "BIFROST_SIGNING_SECRET";
pub const BIND_ENV: &str = "HEIMDALL_BIND";
pub const BROKER_ENV: &str = "BIFROST_BROKER_URL";
pub const HEARTBEAT_ENV: &str = "HEIMDALL_HEARTBEAT_SECONDS";
pub const TRANSPORT_ENV: &str = "HEIMDALL_TRANSPORT";
pub const CONFIG_ROOT_ENV: &str = "HEIMDALL_CONFIG_ROOT";

pub const DEFAULT_CONFIG_ROOT: &str = "/var/lib/camelot/bifrost";
pub const DEFAULT_BIND: &str = "127.0.0.1:8777";
pub const DEFAULT_HEARTBEAT_SECONDS: u64 = 30;
pub const MIN_SECRET_LEN: usize = 16;

#[derive(Debug, Clone)]
pub struct Config {
    pub device_id: String,
    pub signing_secret: String,
    pub bind: String,
    pub broker_url: Option<String>,
    pub heartbeat_seconds: u64,
    /// Transport this node exposes. Constrains what any envelope can do here.
    pub transport: String,
    /// Every provisioned config is written beneath this directory, never outside it.
    pub config_root: std::path::PathBuf,
}

#[derive(Debug)]
pub enum ConfigError {
    Missing(&'static str),
    SecretTooShort { len: usize },
    BadNumber { var: &'static str, value: String },
}

impl std::fmt::Display for ConfigError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ConfigError::Missing(var) => write!(f, "missing required environment variable {var}"),
            ConfigError::SecretTooShort { len } => write!(
                f,
                "{SECRET_ENV} must be at least {MIN_SECRET_LEN} characters (got {len})"
            ),
            ConfigError::BadNumber { var, value } => write!(f, "{var} is not a number: '{value}'"),
        }
    }
}

impl std::error::Error for ConfigError {}

impl Config {
    pub fn from_env() -> Result<Self, ConfigError> {
        let device_id = env::var(DEVICE_ID_ENV).map_err(|_| ConfigError::Missing(DEVICE_ID_ENV))?;
        let signing_secret = env::var(SECRET_ENV).map_err(|_| ConfigError::Missing(SECRET_ENV))?;

        if signing_secret.len() < MIN_SECRET_LEN {
            return Err(ConfigError::SecretTooShort { len: signing_secret.len() });
        }

        let heartbeat_seconds = match env::var(HEARTBEAT_ENV) {
            Ok(raw) => raw
                .parse::<u64>()
                .map_err(|_| ConfigError::BadNumber { var: HEARTBEAT_ENV, value: raw })?,
            Err(_) => DEFAULT_HEARTBEAT_SECONDS,
        };

        Ok(Config {
            device_id,
            signing_secret,
            bind: env::var(BIND_ENV).unwrap_or_else(|_| DEFAULT_BIND.to_string()),
            broker_url: env::var(BROKER_ENV).ok().filter(|s| !s.is_empty()),
            heartbeat_seconds,
            transport: env::var(TRANSPORT_ENV).unwrap_or_else(|_| "rustdesk_control".to_string()),
            config_root: std::path::PathBuf::from(
                env::var(CONFIG_ROOT_ENV).unwrap_or_else(|_| DEFAULT_CONFIG_ROOT.to_string()),
            ),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn short_secret_is_rejected() {
        let err = ConfigError::SecretTooShort { len: 4 };
        assert!(err.to_string().contains("at least 16"));
    }

    #[test]
    fn missing_var_names_itself() {
        assert!(ConfigError::Missing(DEVICE_ID_ENV).to_string().contains("HEIMDALL_DEVICE_ID"));
    }
}
