# V6 Session - Step 178 Reload Replacement Viewport Projection

Date: 2026-07-08

## Completed

Step 178 added the runtime handoff from reload chart-data replacement to
pane-local viewport projection.

Commits:

- `7fb9f76d feat(v6): project viewport after reload replacement`

## Changes

- Added `paneIntentReloadViewport.getState`.
- Added `paneIntentReloadViewport:projected`.
- Added `pane-intent-reload-viewport-runtime`.
- Runtime listens to `paneIntentReloadChartData:replaced`.
- Runtime calls `CHART_VIEWPORT_COMMANDS.ENSURE_INTENT`.
- Runtime calls `CHART_VIEWPORT_COMMANDS.APPLY_CHART_DATA_REVISION`.
- Preserved no chart-data writes, no bar-data requests, no chart-engine writes,
  and no replay mutation.

## Verification

- `node v6/tests/pane-intent-reload-viewport-runtime-step178-smoke.js`
- `node v6/tests/pane-intent-reload-chart-data-runtime-step177-smoke.js`
- `node v6/tests/chart-viewport-runtime-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 179 should add end-to-end coverage for the full pane Symbol/Interval reload
pipeline and then decide whether visible UI/browser coverage is sufficient or
needs a dedicated follow-up.
