# V6 Session - Step 176 Planned Reload Bar-Data Handoff

Date: 2026-07-08

## Completed

Step 176 added the runtime handoff from replay-safe planned reload windows to
bar-data loading.

Commits:

- `3a11b252 feat(v6): load planned reload windows via bar data`

## Changes

- Added `paneIntentReloadData.getState`.
- Added `paneIntentReloadData:loaded`.
- Added `pane-intent-reload-data-runtime`.
- Runtime listens to `paneIntentReloadPlan:planned`.
- Runtime calls `BAR_DATA_COMMANDS.LOAD_WINDOW` for each planned window.
- Runtime emits/stores loaded-window metadata only.
- Preserved no chart-data writes, no viewport projections, no chart-engine
  writes, and no replay mutation.

## Verification

- `node v6/tests/pane-intent-reload-data-runtime-step176-smoke.js`
- `node v6/tests/pane-intent-reload-window-runtime-step175-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/bar-data-runtime-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 177 should define loaded reload data replacement into pane-local chart-data
without coupling viewport projection or chart-engine writes.
