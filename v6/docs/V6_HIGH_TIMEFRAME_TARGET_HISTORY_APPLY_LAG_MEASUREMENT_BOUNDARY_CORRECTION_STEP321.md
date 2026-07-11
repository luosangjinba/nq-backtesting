# V6 High-Timeframe Target-History Apply-Lag Measurement Boundary Correction - Step 321

## Status

Accepted.

## Outcome

Step 321 added an event-driven replacement browser report for target-history
apply-lag measurement:

`v6/tests/high-timeframe-target-history-apply-lag-measurement-boundary-step321-smoke.js`

The smoke collects `8h`, `1D`, and `1W` target-history samples and derives
`applyLagMs` from browser milestones:

`diagnostics-readout-visible.time - left-extension-loaded.time`

This replaces the previous coarse polling-loop boundary from Step 317. The
report still feeds the corrected records into
`selectHighTimeframeTargetHistoryPhaseBudget` with default budgets.

## Finding

The corrected records prove:

- `applyLagP95Ms` is below the default `80ms` budget;
- the selector no longer chooses
  `target-history-browser-visible-apply-lag-optimization`;
- the remaining over-budget condition is `visualLatencyP95Ms`;
- the selected phase can land in the residual visual-latency attribution range:
  `chart-data-replacement` or `viewport-reapply`.

The chart-data/viewport result is not yet a stable runtime optimization target.
The measured phase costs are small and can swap winner across browser runs.
That makes the next bounded work an attribution-stabilization step, not a
runtime optimization.

## Decision

The next slice should be target-history visual-latency phase attribution
stabilization.

Reason: Step 321 corrected the apply-lag measurement boundary. Before V6 changes
chart-data, chart-viewport, or chart-surface behavior, the browser report needs
stable attribution for the remaining visual-latency budget finding.

## Boundary

This step added only browser reporting coverage, documentation, and TODO/index
updates.

It did not change chart-history runtime behavior, target-history runtime
behavior, chart viewport intent, chart-engine behavior, replay cursor movement,
no-bar gap skipping, shell behavior, journal, order-ticket, prop-firm,
indicator, or seconds behavior. Replay remains source `1m` driven.

## Verification

- `node v6/tests/high-timeframe-target-history-apply-lag-measurement-boundary-step321-smoke.js`
- `node v6/tests/high-timeframe-target-history-apply-lag-boundary-browser-step320-smoke.js`
- `node v6/tests/high-timeframe-target-history-apply-lag-optimization-plan-step319-smoke.js`
- `node v6/tests/high-timeframe-target-history-phase-budget-selection-step315-smoke.js`
- `node v6/tests/high-timeframe-target-history-apply-lag-measurement-boundary-closeout-step321-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 322 should stabilize target-history visual-latency phase attribution before
any runtime optimization. It should make the corrected report distinguish chart
data, viewport, and browser rendering/readout milestones without selecting a
runtime phase from sub-frame noise.
