// Typed wrapper around Tauri's `event.listen`. Exporting `onAppEvent`
// instead of letting consumers call `listen` directly is what closes the
// type-safety gap — the callback is now (AppEvent) => void, not
// (Event<unknown>) => void.

import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { AppEvent } from "../../bindings/AppEvent";

// Mirror the channel constant from `crates/events/src/lib.rs` so renames
// catch at compile-time on both sides. If you forget to update one, the
// tsc job that re-imports bindings will diff against the new payload
// shape and complain loudly.
export const APP_EVENT_CHANNEL = "app://event" as const;

/**
 * Subscribe to backend `AppEvent`s with full payload typing.
 *
 * Returns the Tauri `UnlistenFn` so callers can stop the subscription
 * in their teardown / `useEffect` cleanup.
 */
export async function onAppEvent(
  handler: (event: AppEvent) => void,
): Promise<UnlistenFn> {
  return listen<AppEvent>(APP_EVENT_CHANNEL, (raw) => {
    // raw.payload is `AppEvent` thanks to the generic on `listen<AppEvent>`.
    handler(raw.payload);
  });
}

/**
 * Narrow helper: only call `handler` when the discriminant matches.
 * Useful when one component only cares about a single variant.
 */
export async function onAppEventVariant<K extends VariantName>(
  variant: K,
  handler: (payload: VariantPayload<K>) => void,
): Promise<UnlistenFn> {
  return onAppEvent((event) => {
    if (variant in event) {
      handler((event as Record<K, VariantPayload<K>>)[variant]);
    }
  });
}

// Helper types so `onAppEventVariant("PeerDiscovered", ...)` produces a
// handler typed as `(payload: { scan_id: ScanId; peer: PeerRecord }) => void`.
type VariantName = keyof UnionToIntersection<EventAsRecord>;
type EventAsRecord = AppEvent extends infer E
  ? E extends Record<string, unknown>
    ? E
    : never
  : never;
type VariantPayload<K extends VariantName> = Extract<
  AppEvent,
  Record<K, unknown>
>[K];

type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends (
  k: infer I,
) => void
  ? I
  : never;
