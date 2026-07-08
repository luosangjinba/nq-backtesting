# V6 Session - Step 177 Reloaded Data Chart-Data Replacement

Date: 2026-07-08

## Completed

Step 177 added the runtime handoff from loaded reload data to pane-local
chart-data replacement.

Commits:

- `dee4e696 feat(v6): replace chart data from reload windows`

## Changes

- Added `paneIntentReloadChartData.getState`.
- Added `paneIntentReloadChartData:replaced`.
- Added `pane-intent-reload-chart-data-runtime`.
- Runtime listens to `paneIntentReloadData:loaded`.
- Runtime reads loaded bars from bar-data cache with `BAR_DATA_COMMANDS.GET_WINDOW`.
- Runtime calls `CHART_DATA_COMMANDS.REPLACE_BARS` for the target pane.
- Runtime derives cursor timestamp from the replay-capped reload window end.
- Preserved no viewport projection, no chart-engine write, and no replay
  mutation.

## Verification

- `node v6/tests/pane-intent-reload-chart-data-runtime-step177-smoke.js`
- `node v6/tests/pane-intent-reload-data-runtime-step176-smoke.js`
- `node v6/tests/chart-data-runtime-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 178 should project viewport after reload chart-data replacement through the
chart-viewport owner only.
