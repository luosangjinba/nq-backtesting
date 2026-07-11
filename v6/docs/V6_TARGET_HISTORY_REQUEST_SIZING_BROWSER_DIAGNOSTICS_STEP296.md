# V6 Step 296 - Target-History Request Sizing Browser Diagnostics

Date: 2026-07-10

## Outcome

V6 now asserts target-history request sizing on the real browser success path.

The Step 291 browser smoke imports the Step 295 sizing audit helper inside the
browser page and audits the actual `chartHistory` planned source window after
the activated `8h` target-history leftward extension completes.

## Coverage

`v6/tests/target-history-diagnostics-readout-browser-step291-smoke.js` now
asserts:

- request sizing status is `adequate`;
- estimated target bars are `20`;
- policy target display bars are `20`;
- sizing difference is `0`;
- mocked `/v4/target_bars` returns the same number of bars as the sizing audit
  estimated;
- `targetHistory.barCount` matches the target response size.

## Decision

No runtime request sizing change was made.

The real `8h` browser path confirms the current expanded source-window
start/end also requests the policy-sized target window. That supports the Step
295 audit conclusion: runtime sizing should not change until diagnostics show a
specific underfill or over-fetch case.

## Boundary

This step adds browser assertions only. It does not change chart-history
request execution, display-timeframe planning, bar-data commands, chart-data,
replay, chart-engine, viewport, journal, order-ticket, prop-firm, indicator, or
seconds behavior.

Target bars still load through `BAR_DATA_COMMANDS.LOAD_TARGET_WINDOW`; no direct
API calls were added.

## Verification

- `node v6/tests/target-history-diagnostics-readout-browser-step291-smoke.js`
- `node v6/tests/target-history-request-sizing-step295-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `git diff --check`

## Next

Step 297 should decide whether to extend request-sizing browser assertions to
session-aware target history (`1D`, `1W`, `1M`) or move back to the next Phase D
display-history optimization. A small selection/audit step is preferable before
changing runtime behavior.
