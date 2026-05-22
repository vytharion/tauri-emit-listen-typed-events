// How a consumer wires the typed listener. Run `bun install` once in
// `app/` to fetch `@tauri-apps/api`, then `bun run typecheck` to confirm
// the bindings light up correctly.

import { onAppEvent, onAppEventVariant } from "./listen";

export async function attachScanLogger(): Promise<() => void> {
  const unlisten = await onAppEvent((event) => {
    // TypeScript narrows on the discriminant key. Try renaming
    // `PeerDiscovered` in lib.rs + re-run `cargo test` — this switch
    // turns red on next typecheck.
    if ("ScanStarted" in event) {
      console.log(`scan ${event.ScanStarted.scan_id} started`);
    } else if ("PeerDiscovered" in event) {
      const { peer, scan_id } = event.PeerDiscovered;
      console.log(`scan ${scan_id} found ${peer.id} @ ${peer.latency_ms}ms`);
    } else if ("ScanFinished" in event) {
      console.log(
        `scan ${event.ScanFinished.scan_id} done — ${event.ScanFinished.total_peers} peers`,
      );
    }
  });

  return unlisten;
}

export async function attachOnlyPeerDiscovered(): Promise<() => void> {
  // Variant-narrowed handler: TypeScript infers payload as
  // { scan_id: ScanId; peer: PeerRecord } with zero manual casting.
  return onAppEventVariant("PeerDiscovered", ({ peer, scan_id }) => {
    console.log(`scan ${scan_id} → peer ${peer.id}`);
  });
}
