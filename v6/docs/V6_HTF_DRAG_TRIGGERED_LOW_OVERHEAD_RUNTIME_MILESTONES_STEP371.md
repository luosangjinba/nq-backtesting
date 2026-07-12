# V6 HTF Drag-Triggered Low-Overhead Runtime Milestones - Step 371

Status

Accepted.

## Scope

Step 371 measured real wheel-triggered HTF leftward-extension runtime
milestones with low-overhead timestamps.

This step is browser/harness-only. It does not change runtime behavior,
command surfaces, target-history request sizing, chart-history fast-path
behavior, replay cursor movement, `v6/src/app.js`, shell readout code, or the
Step 362 handoff runtime skeleton.

## Added Coverage

- `v6/tests/high-timeframe-drag-triggered-low-overhead-runtime-milestones-browser-step371-smoke.js`
  drives real CDP `Input.dispatchMouseEvent` wheel input on `4h`, `8h`, `1D`,
  and `1W`.
- `v6/tests/high-timeframe-drag-triggered-low-overhead-runtime-milestones-boundary-step371-static-smoke.js`
  locks the harness boundary, covered TFs, low-overhead marker shape, optional
  post-marker canvas observation, and preserved handoff runtime registration
  expectations.

The browser smoke reports:

- `inputToTargetFetchStartMs`
- `targetFetchStartToEndMs`
- `fetchEndToChartDataMs`
- `chartDataToViewportMs`
- `viewportToLeftExtensionMs`
- `leftExtensionToReadoutMs`
- `postMarkerCanvasObservationMs`

## Observed Step 371 Run

The verified browser run produced this summary:

| TF | input -> fetch | target fetch | fetch -> chart data | viewport -> left extension | left extension -> readout |
| --- | ---: | ---: | ---: | ---: | ---: |
| `4h` | 474.9ms | 0.2ms | 22.7ms | 14.9ms | 0.1ms |
| `8h` | 536.4ms | 0.1ms | 1.0ms | -- | 0.0ms |
| `1D` | 460.2ms | 0.0ms | 1.1ms | -- | 0.0ms |
| `1W` | 471.4ms | 0.1ms | 8.9ms | -- | 0.3ms |

This run shows:

- the first real wheel attempt triggered target-history loading for all four
  TFs;
- the dominant low-overhead window is `inputToTargetFetchStartMs`, roughly
  matching the existing `requestDelayMs=500` scheduling policy;
- target fetch duration is effectively zero in the mocked browser harness;
- fetch-to-chart-data and left-extension-to-readout are low;
- source requests stay zero on the target-history path;
- viewport markers can be absent on some HTF samples, so viewport timings are
  attribution fields rather than hard behavior contracts.

## Preserved Surfaces

- Default target-history diagnostics pack membership remains unchanged.
- Optional members `replay-coordination`, `readout-producer-flow`, and
  `handoff-registration` remain unchanged.
- Step 337, Step 352, and Step 365 standalone browser smokes remain runnable.
- Replay remains source `1m` driven.
- Target bars remain display-materialization input only.
- Diagnostics runtime remains read-only observability.
- Shell readout code still does not call target APIs.

## Next Slice

Step 372 should select a bounded request scheduling policy change before
editing runtime behavior.

Reason:

- Step 371 identifies the main remaining delay as the native drag/wheel
  `requestDelayMs` scheduling window.
- Request sizing, target load, chart-data replacement, and readout visibility
  are not the bottleneck in the harness.
- A runtime change should be limited to the leftward-history input scheduling
  policy and should preserve native drag stability.

Suggested Step 372 boundaries:

- create a pure planning/selection helper for HTF target-history request
  scheduling;
- compare keeping native drag/wheel at `requestDelayMs=500`, reducing the HTF
  target-history delay, or applying the existing high-timeframe fast path only
  after a zero-delay surface check;
- preserve low-TF/native drag stability and existing sticky-drag protections;
- do not change runtime behavior until the policy and rollback gates are
  explicit.
