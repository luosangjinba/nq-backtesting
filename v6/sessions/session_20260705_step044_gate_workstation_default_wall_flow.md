# V6 Step 44 - Gate Workstation Default Wall Flow

Date: 2026-07-05

## Scope

Step 44 added a running-app browser gate proving default-wall load/next drives
the mounted workstation chart through the existing replay, chart-data,
chart-viewport, and chart-engine boundaries. The step did not add a new data
path.

## Commits

- `3c40b396 test(v6): gate workstation default wall flow`

## Implementation Notes

- Added `v6/tests/workstation-default-wall-flow-browser-smoke.js`.
- The smoke dispatches `DEFAULT_WALL_COMMANDS.LOAD` and
  `DEFAULT_WALL_COMMANDS.NEXT` through the running app command bus.
- It verifies mounted chart `dataLength`, applied chart-data revision, applied
  viewport projection, and visible logical range after load and next.
- It asserts the visible path does not fetch and does not manually write the
  chart adapter from test code.

## Verification

- `node v6/tests/workstation-default-wall-flow-browser-smoke.js`
- `node v6/tests/default-wall-runtime-smoke.js`
- `node v6/tests/chart-data-surface-bridge-smoke.js`
- `node v6/tests/chart-viewport-surface-bridge-smoke.js`
- `node v6/tests/workstation-chart-data-bridge-browser-smoke.js`
- `node v6/tests/workstation-chart-viewport-bridge-browser-smoke.js`
- `node v6/tests/visible-latency-cache-hit-browser-smoke.js`
- `node v6/tests/multi-pane-manual-wall-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 45 should add a running-app manual-wall flow gate proving a manual
projection can be applied to the mounted workstation chart and preserved across
default-wall next.
