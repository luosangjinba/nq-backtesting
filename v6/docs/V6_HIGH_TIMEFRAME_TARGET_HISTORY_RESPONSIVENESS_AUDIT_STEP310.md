# V6 High-Timeframe Target-History Responsiveness Audit - Step 310

## Status

Accepted.

## Outcome

Step 310 added a pure audit model for deciding the next high-timeframe
target-history slice after fixed, daily, weekly, and monthly browser coverage
and browser pack cost controls are complete.

The audit lives in
`v6/src/chart-history/high-timeframe-target-history-responsiveness-audit.js`.
It accepts existing leftward-history diagnostics plus optional browser-visible
timing records and returns a bounded next-slice recommendation:

- `responsiveness-harness` when browser-visible samples are missing;
- `bounded-runtime-optimization` when fallback rate, total duration, visual
  latency, or apply lag exceeds the configured budget;
- `replay-coordination-materialization-transition` when target-history is
  responsive enough to move to the next phase.

Default audit budgets:

- minimum browser samples: `3`;
- fallback-rate limit: `0.2`;
- p95 extension duration: `250ms`;
- p95 browser-visible latency: `350ms`;
- p95 apply lag: `80ms`.

## Audit Result

The current V6 state has:

- complete fixed/daily/weekly/monthly target-history success and fallback
  browser coverage;
- Step 309 group/member controls for reducing browser-pack iteration cost;
- target-history diagnostics readout and runtime duration/path/request counts.

It does not yet have a dedicated browser-visible responsiveness harness for
high-timeframe target-history extension. Therefore Step 310 selects
`responsiveness-harness` as the next bounded slice. Runtime optimization and
materialization transition remain deferred until that harness provides concrete
timing evidence.

## Boundary

This step added only a pure audit helper, a pure smoke test, documentation, and
TODO/index updates.

It did not change chart-history runtime behavior, target-history runtime
behavior, chart viewport intent, chart-engine behavior, replay cursor movement,
no-bar gap skipping, shell behavior, journal, order-ticket, prop-firm,
indicator, or seconds behavior. Replay remains source `1m` driven.

## Verification

- `node v6/tests/high-timeframe-target-history-responsiveness-audit-step310-smoke.js`
- `node v6/tests/target-history-phase-d-reaudit-step308-smoke.js`
- `node v6/tests/target-history-pack-cost-control-step309-smoke.js`
- `node v6/tests/high-timeframe-target-history-responsiveness-audit-closeout-step310-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 311 should add a focused high-timeframe target-history responsiveness
browser harness. It should collect browser-visible timing for a small targeted
member set, keep the full Step 293 pack available, and avoid runtime changes
unless the captured timings expose a specific bottleneck.
