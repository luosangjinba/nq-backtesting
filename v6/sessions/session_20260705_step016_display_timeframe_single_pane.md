# V6 Step 16 - Display Timeframe Single-Pane

Date: 2026-07-05

## Scope

Step 16 added single-pane display timeframe selection and projection. The
implementation keeps display timeframe as pane-local state, projects revealed
chart bars into the selected display timeframe, and lets chart-viewport runtime
reapply the current viewport intent after chart-data replacement.

## Completed Commits

- `45175eb feat(v6): add display timeframe projection`
- `d4c2b5b feat(v6): add pane display timeframe command`
- `47a8f1f feat(v6): add display timeframe runtime`
- `af5d9de feat(v6): mount display timeframe control`
- `76b840a test(v6): verify display timeframe selection`
- `93565b2 test(v6): enforce display timeframe boundaries`

## Implementation Notes

- Added `v6/src/display-timeframe/display-timeframe-projection.js` for
  no-future bar aggregation from replay timeframe to display timeframe.
- Added `pane.setDisplayTimeframe` and `pane:displayTimeframeChanged` while
  preserving the unified pane record model.
- Added `v6/src/display-timeframe/display-timeframe-runtime.js` as a command
  orchestration boundary. It reads current chart-data bars, projects them,
  updates pane display timeframe, and replaces chart data through existing
  commands.
- Added a shell display timeframe select that dispatches
  `displayTimeframe.apply` only.
- Browser smoke verifies selecting `5m` aggregates revealed `1m` bars, updates
  pane display timeframe, and preserves viewport intent origin/revision/offset.
- Boundary smoke now guards display-timeframe modules from chart engine,
  bar-data adapter, replay internals, storage, and network ownership.

## Verification

- `node v6/tests/display-timeframe-projection-smoke.js`
- `node v6/tests/display-timeframe-runtime-smoke.js`
- `node v6/tests/display-timeframe-control-smoke.js`
- `node v6/tests/display-timeframe-browser-smoke.js`
- `node v6/tests/pane-runtime-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/default-wall-replay-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

The display-timeframe browser smoke required local browser-test permissions
because it starts a temporary HTTP server and headless Chrome.

## Next Step

Step 17 should add a layout runtime skeleton for future multi-pane work without
introducing primary/non-primary state paths.
