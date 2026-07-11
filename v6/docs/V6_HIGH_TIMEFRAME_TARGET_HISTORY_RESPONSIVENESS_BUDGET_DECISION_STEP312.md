# V6 High-Timeframe Target-History Responsiveness Budget Decision - Step 312

## Status

Accepted.

## Outcome

Step 312 added a pure budget-decision/reporting layer around the Step 311
browser harness record shape and the Step 310 responsiveness audit budgets:

`v6/src/chart-history/high-timeframe-target-history-responsiveness-budget-decision.js`

The report helper calls `auditHighTimeframeTargetHistoryResponsiveness`, keeps
the Step 310 default budgets, and returns:

- `outcome`;
- `implementationSlice`;
- `auditReason`;
- `budgetFindings`;
- accepted sample status;
- audit summary;
- resolved thresholds.

The stable implementation-slice decisions are:

- `bounded-runtime-optimization` when fallback rate, p95 extension duration,
  p95 browser-visible latency, or p95 apply lag exceeds budget;
- `replay-coordination-materialization-transition` when enough browser-visible
  samples are present and all target-history responsiveness budgets pass;
- `responsiveness-harness` only when samples are incomplete.

## Decision

The next implementation slice is `bounded-runtime-optimization`.

Reason: Step 312 now has the budget report shape needed to route measured
records. Before entering the replay/materialization transition, V6 should add a
small bounded optimization probe that uses the Step 311 harness records and
Step 312 budget findings to identify whether target-history work is dominated
by fetch, chart-data replacement, viewport reapply, or browser-visible apply
lag.

This keeps runtime changes evidence-driven and avoids moving to materialization
before the high-timeframe responsiveness budget has a concrete optimization
gate.

## Boundary

This step added only a pure budget-decision helper, pure tests, documentation,
and TODO/index updates.

It did not change chart-history runtime behavior, target-history runtime
behavior, chart viewport intent, chart-engine behavior, replay cursor movement,
no-bar gap skipping, shell behavior, journal, order-ticket, prop-firm,
indicator, or seconds behavior. Replay remains source `1m` driven.

## Verification

- `node v6/tests/high-timeframe-target-history-responsiveness-budget-decision-step312-smoke.js`
- `node v6/tests/high-timeframe-target-history-responsiveness-audit-step310-smoke.js`
- `node v6/tests/high-timeframe-target-history-responsiveness-browser-closeout-step311-static-smoke.js`
- `node v6/tests/high-timeframe-target-history-responsiveness-budget-decision-closeout-step312-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 313 should add a bounded runtime optimization probe/report. It should
consume the Step 311 record shape and Step 312 budget findings, identify the
dominant phase to optimize, and still avoid runtime behavior changes unless a
specific bottleneck is proven with focused coverage.
