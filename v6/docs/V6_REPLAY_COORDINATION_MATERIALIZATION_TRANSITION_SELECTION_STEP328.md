# V6 Replay Coordination Materialization Transition Slice Selection - Step 328

## Status

Accepted.

## Outcome

Step 328 selects the first bounded replay-coordination materialization
transition slice:

`replay-coordination-materialization-owner-contract`

New pure selection helper:

`v6/src/replay/replay-coordination-materialization-transition-selection.js`

New coverage:

- `v6/tests/replay-coordination-materialization-transition-selection-step328-smoke.js`
- `v6/tests/replay-coordination-materialization-transition-boundary-step328-static-smoke.js`

## Decision

The target-history fast path is now `materialization-ready`, but the next safe
move is not a runtime materialization change. The next slice should define the
owner contract for replay coordination materialization first.

Reason:

- replay remains source `1m` driven;
- Replay Runtime owns cursor and reveal state;
- Bar Data Runtime owns source and target bar requests/caches;
- Chart Data Runtime owns pane-local display bars and no-future filtering;
- Chart Viewport Runtime owns viewport intent;
- chart-history fast path and target-history request sizing should stay
  unchanged while the materialization owner contract is defined.

## Acceptance Gates

The selected transition keeps these gates explicit:

- `replay-source-1m-driven`
- `replay-runtime-owns-cursor-and-reveal-state`
- `bar-data-runtime-owns-source-and-target-bars`
- `chart-data-runtime-owns-pane-local-series-bars`
- `chart-viewport-runtime-owns-viewport-intent`
- `chart-history-fast-path-unchanged`
- `target-history-request-sizing-unchanged`

## Boundary

This step added a replay-owned pure selector, static boundary coverage,
documentation, and TODO/index updates.

It did not change replay cursor movement, no-bar gap skipping, bar-data
requests, chart-data projection, chart-history runtime loading, target-history
request sizing, chart viewport intent, chart-engine behavior, shell behavior,
journal, order-ticket, prop-firm, indicator, or seconds behavior.

## Verification

- `node v6/tests/replay-coordination-materialization-transition-selection-step328-smoke.js`
- `node v6/tests/replay-coordination-materialization-transition-boundary-step328-static-smoke.js`
- `node v6/tests/high-timeframe-target-history-fast-path-remeasurement-step327-smoke.js`
- `node v6/tests/high-timeframe-target-history-fast-path-remeasurement-browser-step327-smoke.js`
- `node v6/tests/high-timeframe-target-history-fast-path-remeasurement-closeout-step327-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 329 should define the
`replay-coordination-materialization-owner-contract` before any runtime
materialization behavior changes.
