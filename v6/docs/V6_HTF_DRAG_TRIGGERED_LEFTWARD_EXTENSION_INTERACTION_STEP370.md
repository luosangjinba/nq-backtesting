# V6 HTF Drag-Triggered Leftward Extension Interaction - Step 370

Status

Accepted.

## Scope

Step 370 measured the real wheel-triggered HTF leftward-extension interaction
path selected by Step 369.

This step is browser/harness-only. It does not change runtime behavior,
command surfaces, target-history request sizing, chart-history fast-path
behavior, replay cursor movement, `v6/src/app.js`, shell readout code, or the
Step 362 handoff runtime skeleton.

## Added Coverage

- `v6/tests/high-timeframe-drag-triggered-leftward-extension-interaction-browser-step370-smoke.js`
  drives real CDP `Input.dispatchMouseEvent` wheel input on `4h`, `8h`, `1D`,
  and `1W`.
- `v6/tests/high-timeframe-drag-triggered-leftward-extension-interaction-boundary-step370-static-smoke.js`
  locks the harness boundary, covered TFs, real wheel input, measurement
  fields, and preserved handoff runtime registration expectations.

The browser smoke reports:

- `inputAttemptIndex`
- `inputDeltaX`
- `inputToTargetFetchStartMs`
- `inputToLeftExtensionLoadedMs`
- `inputToFirstPaintMs`
- `sourceRequestMs`
- `targetRequestMs`
- `chartDataReplacementMs`
- `viewportReapplyMs`
- `realChartPaintVisibleLagMs`

## Observed Step 370 Run

The verified browser run produced this summary:

| TF | attempt | deltaX | input -> fetch | input -> left extension | target request | viewport reapply | first paint stage |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `4h` | 0 | -960 | 11.9ms | 994.4ms | 0.1ms | 611.4ms | `viewport-projected` |
| `8h` | 0 | -960 | 18.0ms | 828.1ms | 0.3ms | 533.6ms | `viewport-projected` |
| `1D` | 0 | -960 | 9.2ms | 828.5ms | 0.2ms | 543.2ms | `viewport-projected` |
| `1W` | 0 | -960 | 4.4ms | 829.3ms | 0.0ms | 580.2ms | `viewport-projected` |

This run shows:

- the first real wheel attempt triggered target-history loading for all four
  TFs;
- target fetch started quickly after user input;
- source requests stayed at zero on the target-history path;
- target request duration was effectively zero in the mocked browser harness;
- chart-data replacement was not the measured cost;
- the remaining observed window sits after the quick target fetch and before /
  around left-extension loaded and viewport projection.

The Step 370 harness still samples canvas at runtime milestones, so the
`viewportReapplyMs` and `realChartPaintVisibleLagMs` buckets include measurement
overhead. Treat those values as attribution signals, not optimization budgets.

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

Step 371 should implement low-overhead drag-triggered runtime milestone
attribution before any optimization.

Reason:

- Step 370 already proves the successful wheel event reaches target fetch
  quickly.
- Request sizing / target load is not the bottleneck in the harness.
- Canvas sampling in Step 370 is too expensive to use as an optimization
  budget for viewport/paint phases.

Suggested Step 371 boundaries:

- keep real CDP wheel input on `4h`, `8h`, `1D`, and `1W`;
- do not sample canvas inside target fetch, chart-data, viewport, or
  left-extension markers;
- measure target-fetch-ended, chart-data-applied, viewport-projected,
  left-extension-loaded, and diagnostics-readout-visible with low-overhead
  timestamps;
- optionally sample canvas only after the timing-critical markers have been
  recorded;
- select the next owner only after the low-overhead attribution confirms
  whether the remaining delay is request scheduling, runtime event ordering,
  viewport projection, or measurement overhead.
