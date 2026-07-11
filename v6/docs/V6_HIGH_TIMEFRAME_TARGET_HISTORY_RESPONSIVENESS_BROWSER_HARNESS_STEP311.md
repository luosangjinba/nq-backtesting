# V6 High-Timeframe Target-History Responsiveness Browser Harness - Step 311

## Status

Accepted.

## Outcome

Step 311 added a focused browser-visible responsiveness harness for
high-timeframe target-history extension:

`v6/tests/high-timeframe-target-history-responsiveness-browser-step311-smoke.js`

The harness uses the real V6 workstation route with stubbed `/v4/bars` and
`/v4/target_bars` responses, then collects three target-history samples:

- `8h`;
- `1D`;
- `1W`.

Each sample restores the pane to source `1m` first, applies the target
timeframe, waits for the matching target-history fetch and visible diagnostics
readout, and records:

- browser-visible state;
- display timeframe;
- extension duration;
- visual latency;
- apply lag;
- target/source path;
- fallback reason;
- target/source request counts;
- prepended bars;
- matching target fetch metadata.

The collected records are fed into
`auditHighTimeframeTargetHistoryResponsiveness` from Step 310. The smoke uses
wide timing thresholds so the harness validates measurement shape and audit
compatibility without turning local machine variance into a runtime failure.

## Boundary

This step added only a browser test harness and documentation.

It did not change chart-history runtime behavior, target-history runtime
behavior, chart viewport intent, chart-engine behavior, replay cursor movement,
no-bar gap skipping, shell behavior, journal, order-ticket, prop-firm,
indicator, or seconds behavior. Replay remains source `1m` driven.

## Verification

- `node v6/tests/high-timeframe-target-history-responsiveness-browser-step311-smoke.js`
- `node v6/tests/high-timeframe-target-history-responsiveness-audit-step310-smoke.js`
- `node v6/tests/target-history-pack-cost-control-step309-smoke.js`
- `node v6/tests/high-timeframe-target-history-responsiveness-browser-closeout-step311-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 312 should add a small budget-decision/reporting layer around the Step 311
harness records. It should use the Step 310 default budgets to decide whether
the next implementation slice is bounded runtime optimization or the
replay/materialization transition, while keeping the measurement harness
separate from runtime behavior.
