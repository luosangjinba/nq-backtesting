# V6 High-Timeframe Target-History Fast Path Responsiveness Re-measurement - Step 327

## Status

Accepted.

## Outcome

Step 327 re-measured high-timeframe target-history responsiveness after the
programmatic leftward request fast path from Step 326.

New pure decision helper:

`v6/src/chart-history/high-timeframe-target-history-fast-path-remeasurement.js`

New browser coverage:

`v6/tests/high-timeframe-target-history-fast-path-remeasurement-browser-step327-smoke.js`

## Finding

The focused browser measurement over `8h`, `1D`, and `1W` target-history
records now resolves to:

- status: `materialization-ready`;
- owner boundary: `target-history-fast-path-responsive`;
- next slice: `replay-coordination-materialization-transition`.

The browser smoke verifies:

- one target-history request per sample;
- no source-window fallback;
- browser-visible readout at the left-extension listener observation;
- apply lag below budget;
- visual latency below budget;
- pre-left-extension timing below the visual-latency budget.

## Decision

The next slice should be:

`replay-coordination-materialization-transition`

Reason: the high-timeframe target-history responsiveness issue that blocked the
materialization transition is now within budget after the fast path. Further
work should shift from latency attribution to planning the replay coordination
materialization transition boundary.

## Boundary

This step added measurement/decision logic, browser coverage, documentation,
and TODO/index updates.

It did not change chart-history runtime loading, target-history request sizing,
chart viewport intent, chart-engine behavior, replay cursor movement, no-bar
gap skipping, shell behavior, journal, order-ticket, prop-firm, indicator, or
seconds behavior. Replay remains source `1m` driven.

## Verification

- `node v6/tests/high-timeframe-target-history-fast-path-remeasurement-step327-smoke.js`
- `node v6/tests/high-timeframe-target-history-fast-path-remeasurement-browser-step327-smoke.js`
- `node v6/tests/high-timeframe-target-history-trigger-coordination-browser-step324-smoke.js`
- `node v6/tests/high-timeframe-target-history-programmatic-leftward-fast-path-closeout-step326-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 328 should select and document the first bounded replay-coordination
materialization transition slice.
