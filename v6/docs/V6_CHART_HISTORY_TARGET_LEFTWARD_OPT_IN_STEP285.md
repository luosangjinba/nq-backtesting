# V6 Step 285 - Chart-History Target-Timeframe Leftward Opt-In

Date: 2026-07-10

## Decision

Step 285 wires a controlled chart-history leftward target-bars path. The path is
still opt-in only: callers must pass `targetHistory.enabled` on
`CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION`.

The chart-history runtime may now dispatch
`BAR_DATA_COMMANDS.LOAD_TARGET_WINDOW`, but it still does not import target
bars adapters, call `/v4/target_bars`, call `fetch`, or mutate chart series
directly.

## Implemented

- Leftward-history first plans the normal source window so the existing canvas
  boundary and source-window policy remain authoritative.
- When target-history opt-in is enabled, the planned source window start/end are
  converted into a target bars request for the pane display timeframe.
- Successful target loads prepend target bars directly to displayed chart data
  with `preserveSource: true`.
- Target-prepended records report `projectionSource.owner: runtime.bar-data`.
- Target empty/failure paths fall back to the existing source-window load and
  projection flow.
- Source fallback now passes the resolved display timeframe into prepend
  projection explicitly, so payload-level display timeframe works without
  requiring a pane runtime.

## Preserved Behavior

- Default chart-history leftward extension does not load target bars.
- Source-window fallback still updates preserved source bars with source bars,
  not target bars.
- Explicit target-history prepends do not pollute source bars, so high-TF-to-`1m`
  round trips still use source bars.
- Replay remains source `1m` driven.
- Chart viewport, chart-engine, journal, order-ticket, prop-firm, indicator,
  and seconds behavior are unchanged.

## Verification

- `node v6/tests/leftward-history-target-opt-in-step285-smoke.js`
- `node v6/tests/leftward-history-target-fallback-step285-smoke.js`
- `node v6/tests/leftward-history-target-default-step285-smoke.js`
- `node v6/tests/leftward-history-extension-step148-smoke.js`
- `node v6/tests/leftward-history-htf-projection-step198-smoke.js`
- `node v6/tests/display-target-history-boundary-step283-static-smoke.js`
- `node v6/tests/display-target-history-opt-in-step284-smoke.js`
- `node v6/tests/display-timeframe-runtime-smoke.js`
- `node v6/tests/bar-data-target-runtime-step282-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 286 should define and wire the first real activation policy for target
history, likely enabling target-history payloads for high display timeframes in
the chart-history input/bridge path while keeping an explicit fallback and
diagnostic surface.
