# V6 High-Timeframe Target-History Browser Phase Budget Selection - Step 316

## Status

Accepted.

## Outcome

Step 316 added browser integration for the Step 315 phase-budget selector:

`v6/tests/high-timeframe-target-history-browser-phase-budget-selection-step316-smoke.js`

The browser smoke uses the real V6 workstation route with stubbed `/v4/bars`
and `/v4/target_bars` responses. It collects real browser phase-timed
target-history records for:

- `8h`;
- `1D`;
- `1W`.

Those records include:

- `fetchMs`;
- `chartDataReplacementMs`;
- `viewportReapplyMs`;
- `applyLagMs`;
- `visualLatencyMs`;
- path/fallback/request counts;
- matching target fetch metadata.

The records feed `selectHighTimeframeTargetHistoryPhaseBudget`. The smoke uses
wide phase and responsiveness budgets so it validates browser selector
integration and record shape without creating a machine-dependent performance
gate.

## Decision

The next slice should be a real-budget browser report.

Reason: Step 316 proves real browser phase-timed records can flow into the
Step 315 selector. However, the browser smoke intentionally uses wide budgets.
Step 317 should run the same browser record shape against the default phase and
responsiveness budgets, then document whether the selected path is a concrete
phase optimization or materialization transition.

## Boundary

This step added only a browser selector integration smoke and documentation.

It did not change chart-history runtime behavior, target-history runtime
behavior, chart viewport intent, chart-engine behavior, replay cursor movement,
no-bar gap skipping, shell behavior, journal, order-ticket, prop-firm,
indicator, or seconds behavior. Replay remains source `1m` driven.

## Verification

- `node v6/tests/high-timeframe-target-history-browser-phase-budget-selection-step316-smoke.js`
- `node v6/tests/high-timeframe-target-history-phase-budget-selection-step315-smoke.js`
- `node v6/tests/high-timeframe-target-history-browser-phase-timing-step314-smoke.js`
- `node v6/tests/high-timeframe-target-history-browser-phase-budget-selection-closeout-step316-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 317 should add a real-budget browser phase report. It should feed the
Step 316 browser records into the Step 315 selector with default budgets,
record the selected path, and still avoid runtime behavior changes.
