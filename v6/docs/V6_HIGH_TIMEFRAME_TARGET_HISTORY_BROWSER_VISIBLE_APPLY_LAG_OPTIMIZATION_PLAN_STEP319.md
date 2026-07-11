# V6 High-Timeframe Target-History Browser-Visible Apply-Lag Optimization Plan - Step 319

## Status

Accepted.

## Outcome

Step 319 added a pure apply-lag optimization planner:

`v6/src/chart-history/high-timeframe-target-history-apply-lag-optimization-plan.js`

The planner consumes the Step 318 selected path and phase-cost shape, then
chooses an owner boundary and next assertion slice without reading or writing
runtime state.

For the current real-budget shape from Step 317/318:

- selected slice: `target-history-browser-visible-apply-lag-optimization`;
- `browser-visible-apply-lag`: above the default `80ms` phase budget;
- `fetch`, `chart-data-replacement`, and `viewport-reapply`: within their
  default budgets.

The selected owner boundary is:

- boundary: `chart-surface-readout-observation`;
- owner: `shell.pane-status-readout`;
- next slice: `target-history-browser-visible-apply-lag-boundary-browser-assertion`.

## Boundary Finding

The current measurement treats the diagnostics readout becoming `target` as the
browser-visible success signal. That is useful for operator visibility, but it
does not yet distinguish:

- chart-data applied to the chart surface;
- chart viewport projection/reapply;
- `LEFT_EXTENSION_LOADED` emission;
- diagnostics readout DOM becoming visible.

The code path shows the chart-data surface bridge and chart-viewport surface
bridge subscribe before the shell readout, and events are emitted
synchronously. This makes the current apply-lag finding more likely to be a
readout/observation boundary than a target fetch, chart-data replacement, or
viewport reapply bottleneck.

## Decision

The next slice should be
`target-history-browser-visible-apply-lag-boundary-browser-assertion`.

Reason: V6 should first split the apply-lag measurement into concrete browser
milestones before changing runtime behavior. The focused browser assertion
should capture:

- chart-data applied;
- viewport projected;
- left-extension loaded;
- diagnostics readout visible.

The assertion must avoid an absolute machine-specific timing gate. It should
prove ordering and identify which milestone owns the post-load delay. Only
after that should a runtime optimization be selected.

## Boundary

This step added only a pure planner, pure tests, documentation, and TODO/index
updates.

It did not change chart-history runtime behavior, target-history runtime
behavior, chart viewport intent, chart-engine behavior, replay cursor movement,
no-bar gap skipping, shell behavior, journal, order-ticket, prop-firm,
indicator, or seconds behavior. Replay remains source `1m` driven.

## Verification

- `node v6/tests/high-timeframe-target-history-apply-lag-optimization-plan-step319-smoke.js`
- `node v6/tests/high-timeframe-target-history-selected-path-slice-selection-step318-smoke.js`
- `node v6/tests/high-timeframe-target-history-phase-budget-selection-step315-smoke.js`
- `node v6/tests/high-timeframe-target-history-real-budget-browser-phase-report-step317-smoke.js`
- `node v6/tests/high-timeframe-target-history-apply-lag-optimization-plan-closeout-step319-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 320 should add the focused browser boundary assertion for target-history
apply lag. It should instrument browser-observed milestones without changing
runtime behavior.
