# V6 Session - Step 175 Reload Window Planning Runtime

Date: 2026-07-08

## Completed

Step 175 added the runtime handoff that turns pane reload-intent events into
replay-safe reload window plan events.

Commits:

- `b1d5ff6b feat(v6): add reload window planning runtime`

## Changes

- Added `paneIntentReloadPlan.getState`.
- Added `paneIntentReloadPlan:planned`.
- Added `pane-intent-reload-window-runtime`.
- Runtime listens to `paneIntentReload:intentCreated`.
- Runtime reads replay state through `REPLAY_COMMANDS.GET_STATE`.
- Runtime emits/stores planned reload windows capped at the replay cursor.
- Preserved the no bar-data load, no chart-data write, no viewport projection,
  no chart-engine write, and no replay mutation boundary.

## Verification

- `node v6/tests/pane-intent-reload-window-runtime-step175-smoke.js`
- `node v6/tests/pane-intent-reload-window-plan-step174-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 176 should define how planned reload windows are consumed by the bar-data
owner without coupling pane-intent reload, chart-data, chart-viewport, or
chart-engine ownership.
