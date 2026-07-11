# V6 High-Timeframe Target-History Runtime Optimization Probe - Step 313

## Status

Accepted.

## Outcome

Step 313 added a pure bounded runtime optimization probe/report:

`v6/src/chart-history/high-timeframe-target-history-runtime-optimization-probe.js`

The probe consumes the Step 311 browser record shape and the Step 312 budget
report, then returns:

- the original budget report;
- phase cost summary;
- dominant phase;
- next slice;
- reason;
- recommendation.

The supported dominant phases are:

- `fetch`;
- `chart-data-replacement`;
- `viewport-reapply`;
- `browser-visible-apply-lag`.

When budgets pass, the probe reports
`replay-coordination-materialization-transition`. When samples are incomplete,
it sends the work back to the responsiveness harness.

## Decision

The next slice is a browser phase-timing probe, not a runtime optimization yet.

Reason: the pure Step 313 probe can route records once phase timings are
available, but the current Step 311 browser harness records only have total
duration, browser-visible latency, apply lag, and request counts. They do not
yet split the real browser path into fetch, chart-data replacement, viewport
reapply, and browser-visible apply timing.

Step 314 should add focused browser phase timing to the high-timeframe
target-history responsiveness harness. Runtime behavior should still remain
unchanged until that timing identifies a concrete phase to optimize.

## Boundary

This step added only a pure optimization probe helper, pure tests,
documentation, and TODO/index updates.

It did not change chart-history runtime behavior, target-history runtime
behavior, chart viewport intent, chart-engine behavior, replay cursor movement,
no-bar gap skipping, shell behavior, journal, order-ticket, prop-firm,
indicator, or seconds behavior. Replay remains source `1m` driven.

## Verification

- `node v6/tests/high-timeframe-target-history-runtime-optimization-probe-step313-smoke.js`
- `node v6/tests/high-timeframe-target-history-responsiveness-budget-decision-step312-smoke.js`
- `node v6/tests/high-timeframe-target-history-responsiveness-audit-step310-smoke.js`
- `node v6/tests/high-timeframe-target-history-runtime-optimization-probe-closeout-step313-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 314 should add focused browser phase timing for target-history
responsiveness records. It should preserve the Step 311 harness behavior,
extend the record shape with observed phase timings where possible, and still
avoid runtime behavior changes.
