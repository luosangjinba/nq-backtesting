# V6 HTF Target-History Request Scheduling Policy Selection - Step 372

Status

Accepted.

## Decision

Step 372 selects the next bounded scheduling policy for real native
drag/wheel-triggered high-timeframe target-history leftward extension.

Selected policy:

`native-target-history-reduced-delay-with-coalescing`

Future policy values:

- high-timeframe target-history native visible-range delay: `100ms`;
- low-timeframe native drag/wheel delay: keep `requestDelayMs=500`;
- target-history disabled native delay: keep `requestDelayMs=500`;
- existing programmatic target-history fast path: unchanged.

This step is planning/selection-only. It adds a pure selector and tests, but
does not wire the selected delay into `leftward-history-request-schedule.js` or
`leftward-history-input-bridge.js`.

## Evidence

Step 371 measured real CDP wheel-triggered HTF leftward extension for `4h`,
`8h`, `1D`, and `1W`.

Observed low-overhead result:

- `inputToTargetFetchStartMs`: roughly `460-536ms`;
- target fetch duration: effectively zero in the mocked browser harness;
- fetch-to-chart-data and left-extension-to-readout: low;
- source requests on the target-history path: `0`.

The dominant delay therefore matches the existing native `requestDelayMs=500`
scheduling window. Request sizing, target data loading, chart-data application,
viewport/readout visibility, and source-window fallback are not the bottleneck
shown by this measurement.

## Alternatives

`keep-native-visible-range-delay-500ms`

- Rejected.
- It preserves stability, but keeps the measured dominant delay.

`native-target-history-zero-delay-fast-path`

- Rejected for this slice.
- Zero-delay native wheel/drag can bypass coalescing and is riskier for sticky
  drag and wheel-prepend stability. The existing zero-delay fast path remains
  appropriate for programmatic display-timeframe / viewport-projection events
  after a surface check, but Step 371 measured real native input.

`native-target-history-reduced-delay-with-coalescing`

- Selected.
- It removes most of the `500ms` window while preserving a small native-input
  coalescing delay before dispatch.

## Added Coverage

- `v6/src/chart-history/high-timeframe-target-history-request-scheduling-policy-selection.js`
  selects the policy from Step 371 measurement evidence and preservation gates.
- `v6/tests/high-timeframe-target-history-request-scheduling-policy-selection-step372-smoke.js`
  covers selected, not-ready, unsafe-preservation, and zero-delay-candidate
  decisions.
- `v6/tests/high-timeframe-target-history-request-scheduling-policy-selection-boundary-step372-static-smoke.js`
  proves this step is a pure policy selector and that bridge/resolver runtime
  behavior remains unchanged.

## Rollback Gates

Future wiring must keep these gates explicit:

- low-timeframe native drag/wheel stays on `requestDelayMs=500`;
- target-history disabled path stays on `requestDelayMs=500`;
- `shouldRequest` visible-range validation remains before dispatch;
- sticky drag and wheel-prepend stability smokes stay green;
- existing programmatic target-history fast path remains unchanged;
- replay, chart viewport, chart engine, shell, and diagnostics behavior remain
  unchanged.

## Next Slice

Step 373 should add the pure resolver shape for the selected policy before
runtime wiring.

Recommended Step 373 boundary:

- extend the pure leftward request scheduling resolver to accept an explicit
  HTF target-history native delay option;
- prove native target-history can resolve to `100ms`;
- prove low-TF/native source paths and target-history disabled paths still
  resolve to `500ms`;
- keep `leftward-history-input-bridge.js` behavior unchanged until a later
  wiring/browser measurement step.
