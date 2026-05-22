// Typed wrapper around Tauri's `invoke`. Mirrors the listen story:
// instead of letting the consumer call `invoke<unknown>(...)` we name
// the request + response types up front and refuse to compile if the
// arg shape drifts from the Rust signature.

import { invoke } from "@tauri-apps/api/core";
import type { StartScanRequest } from "../../bindings/StartScanRequest";
import type { StartScanResponse } from "../../bindings/StartScanResponse";

// Tauri command name. Centralise so a Rust-side rename does not silently
// 404 the call at runtime — flip the literal here and the IDE jumps to
// every call site.
const CMD_START_SCAN = "start_scan" as const;

export async function startScan(
  request: StartScanRequest,
): Promise<StartScanResponse> {
  return invoke<StartScanResponse>(CMD_START_SCAN, { request });
}
