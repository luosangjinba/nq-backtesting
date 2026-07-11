# V6 High-Timeframe Target-History Phase Budget Selection - Step 315

## Status

Accepted.

## Outcome

Step 315 added a pure phase-budget selection/report layer:

`v6/src/chart-history/high-timeframe-target-history-phase-budget-selection.js`

The selector consumes Step 314 phase-timed records and Step 313 probe output,
then returns:

- resolved phase budgets;
- phase findings;
- selected phase;
- selected slice;
- status;
- probe output.

The selector can route records to:

- `target-history-fetch-optimization`;
- `target-history-chart-data-replacement-optimization`;
- `target-history-viewport-reapply-optimization`;
- `target-history-browser-visible-apply-lag-optimization`;
- `replay-coordination-materialization-transition`;
- `high-timeframe-target-history-responsiveness-harness` when measurement is
  incomplete.

Default phase budgets:

- `fetch`: `120ms`;
- `chart-data-replacement`: `120ms`;
- `viewport-reapply`: `80ms`;
- `browser-visible-apply-lag`: `80ms`.

## Decision

The next slice should connect the real Step 314 browser phase-timing records to
the Step 315 selector.

Reason: Step 315 proves the selector logic with pure records, but the current
browser phase-timing smoke still feeds Step 313 directly with wide thresholds.
Before selecting a concrete runtime optimization or materialization transition,
V6 should run the real browser records through the phase-budget selector and
document the selected slice.

## Boundary

This step added only a pure phase-budget selector, pure tests, documentation,
and TODO/index updates.

It did not change chart-history runtime behavior, target-history runtime
behavior, chart viewport intent, chart-engine behavior, replay cursor movement,
no-bar gap skipping, shell behavior, journal, order-ticket, prop-firm,
indicator, or seconds behavior. Replay remains source `1m` driven.

## Verification

- `node v6/tests/high-timeframe-target-history-phase-budget-selection-step315-smoke.js`
- `node v6/tests/high-timeframe-target-history-browser-phase-timing-step314-smoke.js`
- `node v6/tests/high-timeframe-target-history-runtime-optimization-probe-step313-smoke.js`
- `node v6/tests/high-timeframe-target-history-phase-budget-selection-closeout-step315-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 316 should add a browser selector integration for the phase-budget report.
It should feed the real Step 314 browser records into the Step 315 selector,
assert the selected slice, and still avoid runtime behavior changes.
