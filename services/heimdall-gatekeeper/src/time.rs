//! Minimal RFC3339 handling.
//!
//! The Bifrost canonical form pins timestamps to `YYYY-MM-DDTHH:MM:SSZ` — UTC,
//! second precision, no offset, no fractional part. That is narrow enough to
//! parse directly, which keeps this daemon free of a date-time dependency.

use std::time::{SystemTime, UNIX_EPOCH};

/// Days from 1970-01-01 to the given civil date (Howard Hinnant's algorithm).
fn days_from_civil(y: i64, m: i64, d: i64) -> i64 {
    let y = if m <= 2 { y - 1 } else { y };
    let era = if y >= 0 { y } else { y - 399 } / 400;
    let yoe = y - era * 400; // [0, 399]
    let mp = (m + 9) % 12; // March = 0
    let doy = (153 * mp + 2) / 5 + d - 1; // [0, 365]
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy; // [0, 146096]
    era * 146097 + doe - 719468
}

/// Parse `YYYY-MM-DDTHH:MM:SSZ` into epoch seconds.
pub fn parse_rfc3339_utc(s: &str) -> Result<i64, String> {
    let b = s.as_bytes();
    if b.len() != 20 || b[4] != b'-' || b[7] != b'-' || b[10] != b'T' || b[13] != b':' || b[16] != b':' || b[19] != b'Z'
    {
        return Err(format!("Timestamp '{s}' is not YYYY-MM-DDTHH:MM:SSZ."));
    }

    let num = |from: usize, to: usize| -> Result<i64, String> {
        s[from..to]
            .parse::<i64>()
            .map_err(|_| format!("Non-numeric field in timestamp '{s}'."))
    };

    let (year, month, day) = (num(0, 4)?, num(5, 7)?, num(8, 10)?);
    let (hour, minute, second) = (num(11, 13)?, num(14, 16)?, num(17, 19)?);

    if !(1..=12).contains(&month) || !(1..=31).contains(&day) {
        return Err(format!("Out-of-range date in '{s}'."));
    }
    if hour > 23 || minute > 59 || second > 60 {
        return Err(format!("Out-of-range time in '{s}'."));
    }

    Ok(days_from_civil(year, month, day) * 86_400 + hour * 3_600 + minute * 60 + second)
}

pub fn now_epoch_seconds() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

/// Render epoch seconds back to the canonical form, for heartbeat payloads.
pub fn format_rfc3339_utc(epoch: i64) -> String {
    let days = epoch.div_euclid(86_400);
    let secs_of_day = epoch.rem_euclid(86_400);

    // Inverse of days_from_civil.
    let z = days + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1_460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };

    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z",
        y,
        m,
        d,
        secs_of_day / 3_600,
        (secs_of_day % 3_600) / 60,
        secs_of_day % 60
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_epoch_zero() {
        assert_eq!(parse_rfc3339_utc("1970-01-01T00:00:00Z").unwrap(), 0);
    }

    #[test]
    fn parses_known_instant() {
        // 2026-08-10T12:00:00Z — matches the shared cross-language test vector.
        assert_eq!(parse_rfc3339_utc("2026-08-10T12:00:00Z").unwrap(), 1_786_363_200);
    }

    #[test]
    fn round_trips() {
        for ts in ["1970-01-01T00:00:00Z", "2026-08-10T12:15:00Z", "2000-02-29T23:59:59Z"] {
            let epoch = parse_rfc3339_utc(ts).unwrap();
            assert_eq!(format_rfc3339_utc(epoch), ts);
        }
    }

    #[test]
    fn rejects_malformed() {
        assert!(parse_rfc3339_utc("2026-08-10T12:00:00.500Z").is_err());
        assert!(parse_rfc3339_utc("2026-08-10 12:00:00Z").is_err());
        assert!(parse_rfc3339_utc("not-a-time").is_err());
        assert!(parse_rfc3339_utc("2026-13-10T12:00:00Z").is_err());
    }
}
