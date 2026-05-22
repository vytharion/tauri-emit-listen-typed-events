//! Event payloads exchanged between the Rust backend and the TypeScript
//! frontend. Lesson 4 widens coverage: the codegen bridge now also
//! handles command request/response, plus a fail variant so error
//! handling is part of the same type story.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ScanId(pub u64);

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct PeerRecord {
    pub id: String,
    pub address: String,
    pub latency_ms: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub enum AppEvent {
    ScanStarted { scan_id: ScanId },
    PeerDiscovered { scan_id: ScanId, peer: PeerRecord },
    ScanFinished { scan_id: ScanId, total_peers: u32 },
    ScanFailed { scan_id: ScanId, reason: String },
}

/// Request payload for the `start_scan` Tauri command. Same crate, same
/// derive macro — the frontend `invoke()` call site picks up the
/// generated `StartScanRequest` type and TypeScript refuses to compile
/// if the caller forgets a required field.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct StartScanRequest {
    pub cidr: String,
    pub timeout_ms: u32,
}

/// Response payload for the `start_scan` command. Tauri's `invoke`
/// returns a JSON value; routing it through `StartScanResponse` lets the
/// TS callsite destructure with full typing.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct StartScanResponse {
    pub scan_id: ScanId,
    pub estimated_peers: u32,
}

pub const APP_EVENT_CHANNEL: &str = "app://event";

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn round_trips_through_serde_json() {
        let original = AppEvent::PeerDiscovered {
            scan_id: ScanId(7),
            peer: PeerRecord {
                id: "abc".into(),
                address: "10.0.0.1:8000".into(),
                latency_ms: 12,
            },
        };
        let wire = serde_json::to_string(&original).unwrap();
        let back: AppEvent = serde_json::from_str(&wire).unwrap();
        assert!(matches!(back, AppEvent::PeerDiscovered { .. }));
    }

    #[test]
    fn scan_failed_serialises_with_reason() {
        let original = AppEvent::ScanFailed {
            scan_id: ScanId(3),
            reason: "subnet too large".into(),
        };
        let wire = serde_json::to_string(&original).unwrap();
        assert!(wire.contains("ScanFailed"));
        assert!(wire.contains("subnet too large"));
    }
}
