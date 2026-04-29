//! turboquant.rs
//!
//! Camelot-OS Kinetic Edge utility for resolving low-bit model weight paths.
//!
//! Golden rule:
//! - Do not hardcode local absolute paths.
//! - Resolve all Camelot model artifacts through CAMELOT_OS_HOME.
//! - Fail loudly when required paths are missing.
//!
//! Intended use:
//! - BitNet / b1.58 local swarm experiments
//! - TurboQuant weight lookup
//! - Rotel / Sir Boris local worker bootstrapping

use std::env;
use std::fmt;
use std::path::{Path, PathBuf};

pub const CAMELOT_OS_HOME_ENV: &str = "CAMELOT_OS_HOME";
pub const DEFAULT_WEIGHTS_DIR: &str = "weights";
pub const DEFAULT_BITNET_DIR: &str = "bitnet";
pub const DEFAULT_TURBOQUANT_DIR: &str = "turboquant";

#[derive(Debug, Clone)]
pub struct TurboQuantPaths {
    pub camelot_home: PathBuf,
    pub weights_root: PathBuf,
    pub bitnet_root: PathBuf,
    pub turboquant_root: PathBuf,
}

#[derive(Debug)]
pub enum TurboQuantPathError {
    MissingCamelotHome,
    CamelotHomeDoesNotExist(PathBuf),
    PathDoesNotExist(PathBuf),
}

impl fmt::Display for TurboQuantPathError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            TurboQuantPathError::MissingCamelotHome => write!(
                f,
                "CAMELOT_OS_HOME is not set. Export it to your Camelot root directory."
            ),
            TurboQuantPathError::CamelotHomeDoesNotExist(path) => {
                write!(f, "CAMELOT_OS_HOME does not exist: {}", path.display())
            }
            TurboQuantPathError::PathDoesNotExist(path) => {
                write!(f, "Resolved path does not exist: {}", path.display())
            }
        }
    }
}

impl std::error::Error for TurboQuantPathError {}

pub fn camelot_home() -> Result<PathBuf, TurboQuantPathError> {
    let raw = env::var(CAMELOT_OS_HOME_ENV).map_err(|_| TurboQuantPathError::MissingCamelotHome)?;
    let path = PathBuf::from(raw);

    if !path.exists() {
        return Err(TurboQuantPathError::CamelotHomeDoesNotExist(path));
    }

    Ok(path)
}

pub fn resolve_turboquant_paths() -> Result<TurboQuantPaths, TurboQuantPathError> {
    let home = camelot_home()?;
    let weights_root = home.join(DEFAULT_WEIGHTS_DIR);
    let bitnet_root = weights_root.join(DEFAULT_BITNET_DIR);
    let turboquant_root = weights_root.join(DEFAULT_TURBOQUANT_DIR);

    Ok(TurboQuantPaths {
        camelot_home: home,
        weights_root,
        bitnet_root,
        turboquant_root,
    })
}

pub fn resolve_weight_path<S: AsRef<str>>(relative_model_path: S) -> Result<PathBuf, TurboQuantPathError> {
    let paths = resolve_turboquant_paths()?;
    let candidate = paths.weights_root.join(relative_model_path.as_ref());

    if !candidate.exists() {
        return Err(TurboQuantPathError::PathDoesNotExist(candidate));
    }

    Ok(candidate)
}

pub fn resolve_bitnet_weight<S: AsRef<str>>(model_name_or_file: S) -> Result<PathBuf, TurboQuantPathError> {
    let paths = resolve_turboquant_paths()?;
    let candidate = paths.bitnet_root.join(model_name_or_file.as_ref());

    if !candidate.exists() {
        return Err(TurboQuantPathError::PathDoesNotExist(candidate));
    }

    Ok(candidate)
}

pub fn resolve_turboquant_artifact<S: AsRef<str>>(artifact_name: S) -> Result<PathBuf, TurboQuantPathError> {
    let paths = resolve_turboquant_paths()?;
    let candidate = paths.turboquant_root.join(artifact_name.as_ref());

    if !candidate.exists() {
        return Err(TurboQuantPathError::PathDoesNotExist(candidate));
    }

    Ok(candidate)
}

pub fn ensure_dir(path: &Path) -> std::io::Result<()> {
    if !path.exists() {
        std::fs::create_dir_all(path)?;
    }
    Ok(())
}

pub fn bootstrap_turboquant_dirs() -> Result<TurboQuantPaths, Box<dyn std::error::Error>> {
    let paths = resolve_turboquant_paths()?;
    ensure_dir(&paths.weights_root)?;
    ensure_dir(&paths.bitnet_root)?;
    ensure_dir(&paths.turboquant_root)?;
    Ok(paths)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn constants_are_stable() {
        assert_eq!(CAMELOT_OS_HOME_ENV, "CAMELOT_OS_HOME");
        assert_eq!(DEFAULT_WEIGHTS_DIR, "weights");
        assert_eq!(DEFAULT_BITNET_DIR, "bitnet");
        assert_eq!(DEFAULT_TURBOQUANT_DIR, "turboquant");
    }
}
