//! Event payloads exchanged between the Rust backend and the TypeScript
//! frontend. Lesson 1 keeps things deliberately untyped on the TS side —
//! see lesson 2 for the codegen bridge.

use serde::{Deserialize, Serialize};

/// Identifier for an in-flight peer scan. Newtype so it cannot be confused
/// with arbitrary `u64`s elsewhere in the codebase.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct ScanId(pub u64);

/// One peer discovered during a network scan.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PeerRecord {
    pub id: String,
    pub address: String,
    pub latency_ms: u32,
}

/// Every event the backend can push to the frontend. Externally tagged so
/// `serde_json` round-trips it as `{"PeerDiscovered": {...}}` etc.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AppEvent {
    ScanStarted { scan_id: ScanId },
    PeerDiscovered { scan_id: ScanId, peer: PeerRecord },
    ScanFinished { scan_id: ScanId, total_peers: u32 },
}

/// Canonical channel name. Centralise the string so the Tauri `emit_all`
/// call site and the TS `listen` call site cannot drift apart silently.
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
}
