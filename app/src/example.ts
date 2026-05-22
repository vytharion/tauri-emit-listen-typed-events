// How a consumer wires the typed listener. Run `bun install` once in
// `app/` to fetch `@tauri-apps/api`, then `bun run typecheck` to confirm
// the bindings light up correctly.

import { composeUnlisten, onAppEvent, onAppEventVariant } from "./listen";
import { startScan } from "./invoke";

export async function runFullScan(cidr: string): Promise<void> {
  // Both sides of the wire share `StartScanRequest` / `StartScanResponse`,
  // so the call below cannot drift from the Rust handler signature
  // without a typecheck breaking on the next `cargo test`.
  const { scan_id, estimated_peers } = await startScan({
    cidr,
    timeout_ms: 5_000,
  });
  console.log(`scan ${scan_id} launched — ~${estimated_peers} peers expected`);
}

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
    } else if ("ScanFailed" in event) {
      console.error(
        `scan ${event.ScanFailed.scan_id} failed: ${event.ScanFailed.reason}`,
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

/**
 * Final composition: panel subscribes to start + peers + failure with
 * separate handlers, returns ONE teardown function.
 */
export async function attachPanelHandlers(): Promise<() => void> {
  const unlisteners = await Promise.all([
    onAppEventVariant("ScanStarted", ({ scan_id }) => {
      console.log(`panel: scan ${scan_id} started`);
    }),
    onAppEventVariant("PeerDiscovered", ({ peer }) => {
      console.log(`panel: peer ${peer.id} (${peer.latency_ms}ms)`);
    }),
    onAppEventVariant("ScanFailed", ({ scan_id, reason }) => {
      console.error(`panel: scan ${scan_id} failed — ${reason}`);
    }),
  ]);
  return composeUnlisten(unlisteners);
}
