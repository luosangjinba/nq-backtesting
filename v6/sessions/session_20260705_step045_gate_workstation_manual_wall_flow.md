# V6 Step 45 - Gate Workstation Manual Wall Flow

Date: 2026-07-05

## Scope

Step 45 added a running-app browser gate proving a manual wall projection can be
applied to the mounted workstation chart and preserved across default-wall next.
This directly protects the V5 failure class where dragging established a new
anchor visually but replay later fell back to the default wall behavior.

## Commits

- `49d8e7c1 test(v6): gate workstation manual wall flow`

## Implementation Notes

- Added `v6/tests/workstation-manual-wall-flow-browser-smoke.js`.
- The smoke loads default-wall replay through the running app command bus.
- It derives a manual wall measurement from a logical range, dispatches
  `CHART_VIEWPORT_COMMANDS.SET_MANUAL_INTENT`, and projects the current chart
  data revision through `CHART_VIEWPORT_COMMANDS.APPLY_CHART_DATA_REVISION`.
- It then dispatches `DEFAULT_WALL_COMMANDS.NEXT` and verifies the mounted chart
  keeps the manual wall offset and span through chart-viewport and chart-engine
  bridges.
- It asserts the visible path does not fetch and does not manually write the
  chart adapter from test code.

## Verification

- `node v6/tests/workstation-manual-wall-flow-browser-smoke.js`
- `node v6/tests/workstation-default-wall-flow-browser-smoke.js`
- `node v6/tests/chart-viewport-runtime-smoke.js`
- `node v6/tests/default-wall-runtime-smoke.js`
- `node v6/tests/chart-viewport-surface-bridge-smoke.js`
- `node v6/tests/workstation-chart-data-bridge-browser-smoke.js`
- `node v6/tests/workstation-chart-viewport-bridge-browser-smoke.js`
- `node v6/tests/visible-latency-cache-hit-browser-smoke.js`
- `node v6/tests/multi-pane-manual-wall-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 46 should capture the FXReplay UI reference screenshots as V6 guardrails
before expanding workstation UI parity. The goal is kernel consistency, not
pixel-copying.
