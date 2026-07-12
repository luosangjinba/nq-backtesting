# V6 HTF Target-History Native Visible-Range Reduced Delay Resolver - Step 373

Status

Accepted.

## Decision

Step 373 adds pure resolver support for the selected Step 372 policy:

`native-target-history-reduced-delay-with-coalescing`

The pure scheduling resolver now accepts `nativeTargetHistoryDelayMs`. When the
reason is `native-visible-range`, target-history is enabled, and the caller
passes `nativeTargetHistoryDelayMs: 100`, the resolver returns:

- `delayMs: 100`;
- `mode: native-target-history-reduced-delay`;
- `reason: native-target-history-reduced-delay-with-coalescing`.

If the caller omits `nativeTargetHistoryDelayMs`, the native target-history
path still resolves to `requestDelayMs=500`. This preserves current bridge
runtime behavior until a later wiring step passes the new option.

## Preserved Behavior

- Low-TF/native source paths stay on `requestDelayMs=500`.
- Target-history disabled paths stay on `requestDelayMs=500`.
- Existing programmatic target-history fast path stays `delayMs: 0`.
- Invalid visible ranges still return `ignored`.
- `leftward-history-input-bridge.js` is not wired to the new option yet.
- Replay, chart viewport, chart engine, shell, diagnostics, and target-history
  request sizing are unchanged.

## Added Coverage

- `v6/tests/leftward-history-request-schedule-step373-smoke.js`
  covers the selected `100ms` native target-history delay, default `500ms`
  behavior, target-history disabled behavior, programmatic fast path behavior,
  invalid visible ranges, and normalized non-negative delay handling.
- `v6/tests/leftward-history-request-schedule-boundary-step373-static-smoke.js`
  proves the resolver owns the new pure policy shape while the bridge remains
  unwired.
- `v6/tests/high-timeframe-target-history-request-scheduling-policy-selection-boundary-step372-static-smoke.js`
  was narrowed so Step 372 still locks policy-selector purity and bridge
  non-wiring without preventing the Step 373 resolver implementation.

## Next Slice

Step 374 should wire the selected delay into `leftward-history-input-bridge.js`
behind the existing target-history activation and `shouldRequest` validation.

Recommended Step 374 boundary:

- pass `nativeTargetHistoryDelayMs: 100` only for native visible-range requests
  with target-history enabled;
- keep low-TF/native and target-history-disabled paths on `requestDelayMs=500`;
- keep programmatic fast path behavior unchanged;
- add bridge unit coverage before browser measurement;
- run a focused real CDP wheel browser smoke to confirm
  `inputToTargetFetchStartMs` moves from roughly `460-536ms` toward the
  selected `100ms` coalescing window;
- preserve sticky-drag and wheel-prepend stability gates.
