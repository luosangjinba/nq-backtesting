# V6 High-Timeframe Target-History Browser Phase Timing Probe - Step 314

## Status

Accepted.

## Outcome

Step 314 added focused browser-observed phase timing for high-timeframe
target-history responsiveness records:

`v6/tests/high-timeframe-target-history-browser-phase-timing-step314-smoke.js`

The harness preserves the Step 311 sample pattern for:

- `8h`;
- `1D`;
- `1W`.

Each sample still restores the pane to source `1m`, applies the target
timeframe, waits for the matching target-history fetch and visible diagnostics,
and preserves source bars after returning to `1m`.

The Step 314 records extend the Step 311 shape with browser-observed phase
timings:

- `fetchMs`;
- `chartDataReplacementMs`;
- `viewportReapplyMs`;
- `applyLagMs`;
- `visualLatencyMs`.

The extended records are fed into
`createHighTimeframeTargetHistoryRuntimeOptimizationProbe` from Step 313. The
browser smoke uses wide timing thresholds to validate phase-record shape and
probe compatibility without creating a machine-dependent performance gate.

## Decision

The next slice should integrate the phase-timing records into a budget
selection/report.

Reason: Step 314 now captures enough phase timing to identify a dominant phase,
but the current browser smoke intentionally uses wide thresholds. Step 315
should add a bounded phase-budget selector/report that can route measured
records to a concrete optimization candidate or materialization readiness
without changing runtime behavior.

## Boundary

This step added only a browser phase-timing harness and documentation.

It did not change chart-history runtime behavior, target-history runtime
behavior, chart viewport intent, chart-engine behavior, replay cursor movement,
no-bar gap skipping, shell behavior, journal, order-ticket, prop-firm,
indicator, or seconds behavior. Replay remains source `1m` driven.

## Verification

- `node v6/tests/high-timeframe-target-history-browser-phase-timing-step314-smoke.js`
- `node v6/tests/high-timeframe-target-history-runtime-optimization-probe-step313-smoke.js`
- `node v6/tests/high-timeframe-target-history-responsiveness-budget-decision-step312-smoke.js`
- `node v6/tests/high-timeframe-target-history-browser-phase-timing-closeout-step314-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 315 should add a phase-budget selection/report layer. It should consume
the Step 314 phase-timed records and Step 313 probe output, decide whether the
next slice is a concrete phase optimization or materialization transition, and
still avoid runtime behavior changes.
