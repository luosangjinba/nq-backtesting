# V6 HTF Leftward Extension Real Chart Paint Visibility - Step 369

Status

Accepted.

## Scope

Step 369 implemented the narrower browser/harness-only measurement selected by
Step 368. It distinguishes real chart-visible paint updates from the Step 367
two-animation-frame observation window.

This step does not change runtime behavior, command surfaces, target-history
request sizing, chart-history fast-path behavior, replay cursor movement,
`v6/src/app.js`, shell readout code, or the Step 362 handoff runtime skeleton.

## Added Coverage

- `v6/tests/high-timeframe-leftward-extension-real-chart-paint-visibility-browser-step369-smoke.js`
  measures `4h`, `8h`, `1D`, and `1W` target-history leftward extension with
  canvas-signature sampling at the chart-data, viewport, left-extension,
  readout, and animation-frame stages.
- `v6/tests/high-timeframe-leftward-extension-real-chart-paint-visibility-boundary-step369-static-smoke.js`
  locks the harness boundary, covered TFs, canvas-signature measurement fields,
  and preserved handoff runtime registration expectations.

The browser smoke reports:

- `firstPaintStage`
- `realChartPaintVisibleLagMs`
- `seriesUpdateToFirstPaintMs`
- `harnessObservationWindowMs`
- `harnessMinusRealPaintMs`
- target fetch TF and bar count

## Observed Step 369 Run

The verified browser run produced this summary:

| TF | target bars | first paint stage | real paint lag | series update to paint | harness window |
| --- | ---: | --- | ---: | ---: | ---: |
| `4h` | 20 | `viewport-projected` | 0.0ms | 0.0ms | 1176.0ms |
| `8h` | 20 | `viewport-projected` | 0.0ms | 0.0ms | 1200.0ms |
| `1D` | 14 | `viewport-projected` | 0.0ms | 0.0ms | 1266.5ms |
| `1W` | 4 | `viewport-projected` | 0.0ms | 0.0ms | 1149.5ms |

The large harness window is dominated by the deliberate canvas sampling and
post-readout observation work. The chart signature is already changed by the
`viewport-projected` milestone, so this run does not show a chart-surface or
browser-paint bottleneck on the programmatic target-history path.

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

Step 370 should measure the real drag-triggered HTF leftward-extension
interaction path before optimizing runtime code.

Reason:

- Step 367 and Step 369 both measured programmatic target-history paths.
- The original perceived slowness was tied to dragging left on higher
  timeframes.
- Programmatic request/runtime/chart paint phases do not currently show a
  bottleneck.

Suggested Step 370 boundaries:

- browser/harness-only measurement;
- simulate or drive real leftward drag/wheel input on `4h`, `8h`, `1D`, and
  `1W`;
- separate user input to left-extension trigger latency, target/source request
  latency, chart-data replacement, viewport reapply, real chart paint, and
  harness observation cost;
- keep runtime behavior unchanged unless the interaction measurement proves a
  concrete bottleneck.
