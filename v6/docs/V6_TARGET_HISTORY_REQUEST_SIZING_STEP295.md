# V6 Step 295 - Target-History Request Sizing

Date: 2026-07-10

## Outcome

V6 now has a pure target-history request sizing audit helper:

- `v6/src/chart-history/target-history-request-sizing.js`

The helper compares a planned leftward source window against the display
timeframe's target-history sizing policy. It reports:

- estimated fixed-duration target bars covered by the window;
- policy target display bars;
- difference between estimated and target display bars;
- `adequate`, `underfilled`, or `session-aware-policy-sized` status.

## Audit Result

No runtime sizing change was made in Step 295.

The current source-window policy already expands high-timeframe leftward
requests to target display bar goals:

- `4h`, `8h`, and `12h`: 20 display bars;
- `1D`: 12 display bars;
- `1W`: 4 display bars;
- `1M`: 1 display bar.

Because chart-history target windows currently reuse the expanded source-window
start/end, fixed-duration target-history requests already size to the same
target-display goal for normal leftward extensions. A runtime adjustment would
be premature without browser diagnostics showing systematic underfill or
over-fetch.

## Boundary

This step adds audit coverage only. It does not change chart-history request
execution, display-timeframe planning, bar-data commands, chart-data, replay,
chart-engine, viewport, journal, order-ticket, prop-firm, indicator, or seconds
behavior.

Target bars still load through `BAR_DATA_COMMANDS.LOAD_TARGET_WINDOW`; no direct
API calls were added.

## Verification

- `node v6/tests/target-history-request-sizing-step295-smoke.js`
- `node v6/tests/leftward-source-window-policy-step277-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 296 should add browser-visible request sizing diagnostics or assertions to
the target-history readout regression path. The goal is to compare requested
target bars and prepended bars on the real browser path before making any
runtime sizing change.
