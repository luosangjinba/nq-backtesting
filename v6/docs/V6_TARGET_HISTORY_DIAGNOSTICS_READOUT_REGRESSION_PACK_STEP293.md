# V6 Step 293 - Target-History Diagnostics Readout Regression Pack

Date: 2026-07-10

## Outcome

V6 now has one compact regression-pack command for target-history diagnostics
readout browser coverage:

- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`

The pack runs the Step 291 success-path browser smoke and the Step 292
fallback-path browser smoke in sequence, prints start/pass/fail lines, stops on
the first failure, and exits non-zero when a member fails.

## Members

- `v6/tests/target-history-diagnostics-readout-browser-step291-smoke.js`
- `v6/tests/target-history-diagnostics-readout-fallback-browser-step292-smoke.js`

## Boundary

This step is test orchestration only. It does not change chart-history,
bar-data, chart-data, replay, chart-engine, viewport, journal, order-ticket,
prop-firm, indicator, or seconds behavior.

The pack preserves the existing ownership boundary:

- target bars load through bar-data target commands;
- shell readout code consumes chart-history runtime events;
- shell readout code does not call target APIs or bar-data commands;
- replay remains source-`1m` driven.

## Verification

- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `git diff --check`

## Next

Step 294 should return to target-history optimization selection using the now
packaged diagnostics coverage as the safety net. The likely next slice is a
small decision/audit step that chooses between activation policy tuning,
source-window fallback hardening, or target-history request sizing based on the
observed diagnostics.
