# V6 High-Timeframe Target-History Real-Budget Browser Phase Report - Step 317

## Status

Accepted.

## Outcome

Step 317 added a real-budget browser phase report:

`v6/tests/high-timeframe-target-history-real-budget-browser-phase-report-step317-smoke.js`

The browser smoke uses the real V6 workstation route with stubbed `/v4/bars`
and `/v4/target_bars` responses. It collects browser phase-timed
target-history records for:

- `8h`;
- `1D`;
- `1W`.

Those real browser records feed
`selectHighTimeframeTargetHistoryPhaseBudget` with the selector defaults. The
smoke does not pass custom wide `phaseBudgets` or responsiveness `thresholds`.

The report accepts the concrete selector path returned by the current machine:

- `target-history-fetch-optimization`;
- `target-history-chart-data-replacement-optimization`;
- `target-history-viewport-reapply-optimization`;
- `target-history-browser-visible-apply-lag-optimization`;
- `replay-coordination-materialization-transition`;
- `high-timeframe-target-history-responsiveness-harness`.

It also asserts that the default real-budget summary has finite
`durationP95Ms`, `visualLatencyP95Ms`, and `applyLagP95Ms`, and that the
selector exposes default phase budgets for `fetch`, `chart-data-replacement`,
`viewport-reapply`, and `browser-visible-apply-lag`.

## Decision

The next slice should record the selected implementation path and convert it
into a bounded implementation plan before changing runtime behavior.

Reason: Step 317 intentionally avoids making a machine-dependent browser timing
result a hard product decision. The real-budget path is now measurable through
the Step 315 selector, but Step 318 should pin the selected path in a closeout
artifact and choose the next small implementation slice from that path.

## Boundary

This step added only browser report coverage and documentation.

It did not change chart-history runtime behavior, target-history runtime
behavior, chart viewport intent, chart-engine behavior, replay cursor movement,
no-bar gap skipping, shell behavior, journal, order-ticket, prop-firm,
indicator, or seconds behavior. Replay remains source `1m` driven.

## Verification

- `node v6/tests/high-timeframe-target-history-real-budget-browser-phase-report-step317-smoke.js`
- `node v6/tests/high-timeframe-target-history-phase-budget-selection-step315-smoke.js`
- `node v6/tests/high-timeframe-target-history-browser-phase-budget-selection-step316-smoke.js`
- `node v6/tests/high-timeframe-target-history-real-budget-browser-phase-report-closeout-step317-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 318 should select the next implementation slice from the Step 317
real-budget report. It should document whether the next bounded move is a phase
optimization, materialization transition planning, or measurement completion,
and keep runtime changes behind focused coverage.
