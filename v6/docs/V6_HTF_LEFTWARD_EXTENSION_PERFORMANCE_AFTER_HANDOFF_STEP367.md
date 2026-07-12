# V6 HTF Leftward Extension Performance After Handoff - Step 367

Status

Accepted.

## Scope

Step 367 returned to the HTF leftward-extension performance thread after the
replay coordination materialization handoff runtime was registered.

This step is measurement-only. It does not change runtime behavior, command
surfaces, replay cursor ownership, chart data ownership, target-history request
sizing, chart-history fast-path behavior, `v6/src/app.js`, shell readout code,
or the Step 362 handoff runtime skeleton.

## Added Coverage

- `v6/tests/high-timeframe-leftward-extension-performance-after-handoff-browser-step367-smoke.js`
  measures browser-visible leftward-extension timing for `4h`, `8h`, `1D`, and
  `1W`.
- `v6/tests/high-timeframe-leftward-extension-performance-after-handoff-step367-static-smoke.js`
  locks the measurement boundary, covered TFs, phase fields, and handoff
  runtime registration expectations.

The browser smoke records each TF with these phase fields:

- `sourceRequestMs`
- `targetRequestMs`
- `chartDataReplacementMs`
- `viewportReapplyMs`
- `visibleApplyLagMs`
- `browserPaintLagMs`
- `visualLatencyMs`
- `runtimeDurationMs`

It also records request counts, target fetch TF, target fetch bar count,
prepended bar count, fallback reason, readout visibility, milestones, and a
test-only `bottleneckHint` derived from the largest measured phase.

## Runtime Boundary Result

The measurement confirms the active browser path still uses:

- `runtime.leftward-history-extension`
- `runtime.replay-coordination-materialization-handoff`
- `DISPLAY_TIMEFRAME_COMMANDS.APPLY` as the TF-switch trigger in the harness
- `CHART_HISTORY_EVENTS.LEFT_EXTENSION_LOADED` as the left-extension event
- chart-surface instrumentation only for `applyChartDataRecord` and
  `applyViewportProjection`

The smoke asserts target-history path success for all four TFs:

- one target request per sample;
- zero source requests per sample;
- target fetch TFs `4h`, `8h`, `1D`, and `1W`;
- no fallback reason;
- target diagnostics readout visible;
- source bar count preserved when restoring `1m`.

## Observed Step 367 Run

The verified browser run produced this high-level phase summary:

| TF | target bars | source req | target req | chart data | viewport | visible lag | paint window |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `4h` | 20 | 0.0ms | 0.2ms | 10.9ms | 6.1ms | 0.1ms | 39.8ms |
| `8h` | 20 | 0.0ms | 0.0ms | 6.5ms | 1.2ms | 0.1ms | 51.2ms |
| `1D` | 14 | 0.0ms | 0.1ms | 6.7ms | 1.4ms | 0.0ms | 13.8ms |
| `1W` | 4 | 0.0ms | 0.0ms | 2.6ms | 2.8ms | 0.2ms | 38.2ms |

This run did not show source-window loading, target request sizing, chart-data
replacement, viewport reapply, or diagnostics readout visibility as the
dominant cost. The largest measured bucket was the test-only two-frame browser
paint observation window, so Step 368 should be careful to distinguish real
user-visible chart paint delay from the harness' intentional animation-frame
measurement window before changing chart-surface behavior.

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

Step 368 should consume the Step 367 phase summary and select the smallest
optimization owner. It should remain planning/selection unless the measurement
output makes one bottleneck unambiguous.

Candidate owners:

- request sizing / target-bar load path if `targetRequestMs` dominates;
- chart-data replacement if `chartDataReplacementMs` dominates;
- viewport owner if `viewportReapplyMs` dominates;
- chart surface/browser paint if `browserPaintLagMs` or `visibleApplyLagMs`
  dominates;
- trigger coordination if most latency happens before left-extension loaded.

Do not start a runtime optimization before the owner selection is explicit.
