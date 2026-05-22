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
 *
 * The `as unknown` step is deliberate: serde-tagged unions arrive as
 * `{ VariantName: payload }`, which TypeScript represents as a discriminated
 * union, not a `Record`. Casting through `unknown` is the documented way
 * to reshape between an inferred discriminated union and a homogeneous
 * record view for indexed access.
 */
export async function onAppEventVariant<K extends VariantName>(
  variant: K,
  handler: (payload: VariantPayload<K>) => void,
): Promise<UnlistenFn> {
  return onAppEvent((event) => {
    if (variant in event) {
      const indexed = event as unknown as Record<K, VariantPayload<K>>;
      handler(indexed[variant]);
    }
  });
}

/**
 * Compose several variant subscriptions into a single teardown closure.
 * `useEffect` cleanups want one function, not five, so this lets a React
 * panel stay focused on the handlers instead of bookkeeping.
 */
export function composeUnlisten(unlisteners: UnlistenFn[]): () => void {
  return () => {
    for (const fn of unlisteners) {
      fn();
    }
  };
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
