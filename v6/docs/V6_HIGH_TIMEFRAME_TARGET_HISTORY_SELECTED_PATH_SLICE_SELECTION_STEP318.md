# V6 High-Timeframe Target-History Selected Path Slice Selection - Step 318

## Status

Accepted.

## Outcome

Step 318 added a pure selected-path planner:

`v6/src/chart-history/high-timeframe-target-history-selected-path-slice-selection.js`

The planner consumes the Step 315/317 selector result and maps the selected
real-budget path to the next bounded implementation slice. It does not read or
write runtime state.

The supported selected paths are:

- `target-history-browser-visible-apply-lag-optimization` to
  `target-history-browser-visible-apply-lag-optimization-plan`;
- `target-history-fetch-optimization` to
  `target-history-fetch-optimization-plan`;
- `target-history-chart-data-replacement-optimization` to
  `target-history-chart-data-replacement-optimization-plan`;
- `target-history-viewport-reapply-optimization` to
  `target-history-viewport-reapply-optimization-plan`;
- `replay-coordination-materialization-transition` to
  `replay-coordination-materialization-transition-plan`;
- `high-timeframe-target-history-responsiveness-harness` to
  `high-timeframe-target-history-responsiveness-measurement-completion`.

The current real-budget browser sample selected:

- status: `optimize-phase`;
- selected phase: `browser-visible-apply-lag`;
- selected slice: `target-history-browser-visible-apply-lag-optimization`;
- next implementation slice:
  `target-history-browser-visible-apply-lag-optimization-plan`.

The real sample showed `browser-visible-apply-lag` over the default `80ms`
phase budget while fetch, chart-data replacement, and viewport reapply remained
within their default budgets. Step 318 records that as a planning input, not a
machine-portable performance assertion.

## Decision

The next slice should be
`target-history-browser-visible-apply-lag-optimization-plan`.

Reason: the real-budget selector has already narrowed the bottleneck to
browser-visible apply lag. The next bounded step should inspect where the
post-load browser-visible delay is created, choose one minimal implementation
change, and define focused browser coverage before touching runtime behavior.

The likely investigation boundary is between:

- chart-history completion timing;
- chart-data replacement notification timing;
- chart-viewport reapply scheduling;
- chart-surface render/readout observation timing.

## Boundary

This step added only a pure planner, pure tests, documentation, and TODO/index
updates.

It did not change chart-history runtime behavior, target-history runtime
behavior, chart viewport intent, chart-engine behavior, replay cursor movement,
no-bar gap skipping, shell behavior, journal, order-ticket, prop-firm,
indicator, or seconds behavior. Replay remains source `1m` driven.

## Verification

- `node v6/tests/high-timeframe-target-history-selected-path-slice-selection-step318-smoke.js`
- `node v6/tests/high-timeframe-target-history-phase-budget-selection-step315-smoke.js`
- `node v6/tests/high-timeframe-target-history-real-budget-browser-phase-report-step317-smoke.js`
- `node v6/tests/high-timeframe-target-history-selected-path-slice-selection-closeout-step318-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 319 should plan the browser-visible apply-lag optimization slice. It
should identify the exact owner boundary and focused browser assertion before
any runtime change.
