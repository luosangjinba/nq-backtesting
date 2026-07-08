# V6 Session - Step 181 Chart Browser Regression Pack

Date: 2026-07-08

## Completed

Step 181 added a selected browser regression pack for chart-facing V6 gates.

Commit:

- `455b57a5 test(v6): add chart browser regression pack`

## Changes

- Added `v6/tests/chart-browser-regression-pack.js`.
- The pack runs reload pipeline, layout pane bootstrap, multi-pane replay
  append, multi-pane replay viewport projection, and pane-local reset browser
  smokes.
- The runner prints per-smoke start/pass/fail lines and duration.
- The runner stops on first failure and exits with the failing process code.

## Verification

- `node v6/tests/chart-browser-regression-pack.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 182 should return to chart feature work. Recommended candidates:

- finish crosshair/OHLC behavior;
- add a browser latency gate for leftward historical extension under replay.
