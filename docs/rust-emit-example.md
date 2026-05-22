# Emitting `AppEvent` from the Rust side

The `events` crate stays Tauri-free on purpose — it is a pure data crate
the codegen can reach without dragging the GTK / WebView stack into the
ts-rs export pass. Inside your actual `src-tauri/` crate, depend on
`events = { path = "../crates/events" }` and emit like this:

```rust
use events::{AppEvent, PeerRecord, ScanId, APP_EVENT_CHANNEL};
use tauri::{AppHandle, Emitter};

#[tauri::command]
pub async fn start_scan(app: AppHandle) -> Result<(), String> {
    let scan_id = ScanId(rand::random());
    app.emit(APP_EVENT_CHANNEL, AppEvent::ScanStarted { scan_id })
        .map_err(|e| e.to_string())?;

    // ... actual scan logic ...
    let peer = PeerRecord {
        id: "abc".into(),
        address: "10.0.0.1:8000".into(),
        latency_ms: 12,
    };
    app.emit(
        APP_EVENT_CHANNEL,
        AppEvent::PeerDiscovered { scan_id, peer },
    ).map_err(|e| e.to_string())?;

    Ok(())
}
```

Two things to notice:

1. The channel name `APP_EVENT_CHANNEL` is imported from the same crate
   the TypeScript side imports types from. Rename it in `lib.rs` and
   both sides break at compile-time — no silent runtime mismatch.
2. `app.emit(...)` takes `&impl Serialize`, so `AppEvent`'s `Serialize`
   derive is what makes this call legal. ts-rs runs on the same struct,
   so the wire shape and the TS payload type are derived from the same
   source.
