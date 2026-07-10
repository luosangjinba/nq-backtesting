# V6 Step 284 - Controlled Display-Timeframe Target-History Opt-In

Date: 2026-07-10

## Decision

Step 284 wires the first controlled display-timeframe target-history runtime
path. The path is still opt-in only: callers must pass `targetHistory.enabled`
with an explicit window. Default display-timeframe switching continues to use
source bars plus frontend projection.

The display-timeframe runtime may now dispatch
`BAR_DATA_COMMANDS.LOAD_TARGET_WINDOW`, but it still does not import the target
bars adapter, call `/v4/target_bars`, call `fetch`, or mutate chart series
directly.

## Implemented

- `DISPLAY_TIMEFRAME_COMMANDS.APPLY` accepts an optional `targetHistory`
  payload.
- When `targetHistory.enabled` is true and the planner accepts the timeframe,
  display-timeframe runtime loads target bars through bar-data runtime.
- Loaded target bars replace displayed chart bars with `preserveSource: true`.
- Target records report `projectionSource.owner: runtime.bar-data`.
- Disabled, empty, or failed target-history loads fall back to the existing
  chart-data projection path.
- Fallback records include target-history status and failure reason for tests
  and future diagnostics.

## Preserved Behavior

- Default display-timeframe switching does not load target bars.
- Existing minute-based projection and high-TF-to-`1m` round trips still use
  preserved source bars.
- Replay remains source `1m` driven.
- Chart-history leftward extension still uses source-bar windows and frontend
  projection fallback.
- Chart viewport, chart-engine, chart-data ownership, journal, order-ticket,
  prop-firm, indicator, and seconds behavior are unchanged.

## Verification

- `node v6/tests/display-target-history-opt-in-step284-smoke.js`
- `node v6/tests/display-target-history-fallback-step284-smoke.js`
- `node v6/tests/display-target-history-boundary-step283-static-smoke.js`
- `node v6/tests/display-timeframe-no-feature-step192-smoke.js`
- `node v6/tests/display-timeframe-runtime-smoke.js`
- `node v6/tests/bar-data-target-runtime-step282-smoke.js`
- `node v6/tests/display-target-history-plan-step283-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 285 should decide the next target-history consumer. The likely slice is a
chart-history leftward-extension target-bars opt-in path for high display
timeframes, still keeping source-bar projection as fallback and replay as
source `1m`.
