# V6 Step 288 - Activated Target-History Performance Observability

Date: 2026-07-10

## Decision

Step 288 adds runtime diagnostics for activated target-history leftward
extension. Diagnostics live on `CHART_HISTORY_COMMANDS.GET_STATE().extension`
and emitted left-extension payloads; no UI surface is added yet.

## Diagnostics

Each loaded leftward extension now reports:

- `durationMs`
- `path`
- `fallbackReason`
- `targetRequestCount`
- `targetLoadMs`
- `targetBarCount`
- `sourceRequestCount`
- `sourceLoadMs`
- `prependedBarCount`

The path is one of:

- `target-history`
- `target-history-fallback-source-window`
- `source-window`

## Covered Paths

- Target-history success reports target load timing and target/prepended bar
  counts.
- Target-history failure reports fallback reason, target load timing, source
  load timing, and source request count.
- Default source-window path reports source load timing with zero target
  requests.
- The Step 287 browser smoke now asserts target-history diagnostics on the real
  browser integration path.

## Preserved Behavior

- Target bars still load only through `BAR_DATA_COMMANDS.LOAD_TARGET_WINDOW`.
- Source-window fallback still preserves source bars.
- High-TF-to-`1m` round trips remain source-bar driven.
- Replay remains source `1m` driven.

## Verification

- `node v6/tests/activated-target-history-browser-step287-smoke.js`
- `node v6/tests/display-timeframe-leftward-auto-chain-browser-smoke.js`
- `node v6/tests/leftward-history-target-opt-in-step285-smoke.js`
- `node v6/tests/leftward-history-target-fallback-step285-smoke.js`
- `node v6/tests/leftward-history-target-default-step285-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 289 should use these diagnostics to make an optimization decision: tune
activation thresholds/window sizing, add a small diagnostic readout, or harden
fallback behavior based on measured target-versus-source latency.
