# V6 Step 299 - Daily Target-History Sizing Pack Selection

Date: 2026-07-10

## Decision

Add the daily target-history request sizing browser smoke to the existing
target-history readout regression pack.

Do not create a separate daily pack and do not start `1W`/`1M` runtime work in
this step.

## Basis

The existing pack already owns the target-history browser safety net:

- fixed-duration target-history success path;
- target-history fallback path;
- source-bar preservation for high-TF-to-`1m` round trips.

Daily target-history sizing is the same safety category. Adding it as a third
member keeps one compact command for target-history browser regressions:

- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`

## Pack Members

- `v6/tests/target-history-diagnostics-readout-browser-step291-smoke.js`
- `v6/tests/target-history-diagnostics-readout-fallback-browser-step292-smoke.js`
- `v6/tests/daily-target-history-request-sizing-browser-step298-smoke.js`

## Boundary

This step is test orchestration only. It does not change chart-history request
execution, display-timeframe planning, bar-data commands, chart-data, replay,
chart-engine, viewport, journal, order-ticket, prop-firm, indicator, or seconds
behavior.

Target bars still load through `BAR_DATA_COMMANDS.LOAD_TARGET_WINDOW`; no direct
API calls were added.

## Verification

- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/daily-target-history-request-sizing-browser-step298-smoke.js`
- `git diff --check`

## Next

Step 300 should select the next target-history Phase D slice. Reasonable
options are `1W` request-sizing selection/audit, `1D` fallback browser coverage,
or returning to display-history responsiveness now that target-history success,
fallback, and daily sizing are packaged.
