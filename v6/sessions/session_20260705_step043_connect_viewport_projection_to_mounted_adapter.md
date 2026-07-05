# V6 Step 43 - Connect Viewport Projection To Mounted Adapter

Date: 2026-07-05

## Scope

Step 43 connected chart-viewport projected logical ranges to the mounted
workstation chart adapter. Chart-viewport remains the owner of viewport intent
and projection; chart-engine is the only boundary that writes adapter logical
ranges.

## Commits

- `1675b8ec feat(v6): apply viewport projection to workstation chart`
- `1fba4157 feat(v6): bridge viewport projection to workstation chart`

## Implementation Notes

- Added `applyViewportProjection(record)` to the workstation chart surface.
- Added `v6/src/chart-engine/chart-viewport-surface-bridge.js` to subscribe to
  `chartViewport:projected` and forward records to the mounted chart surface.
- Connected the bridge in `v6/src/app.js` without giving route or shell code
  direct ownership of viewport intent or adapter logical range writes.
- Added browser coverage proving chart-data changes trigger chart-viewport
  projection and update the mounted adapter visible logical range.

## Verification

- `node v6/tests/chart-viewport-surface-bridge-smoke.js`
- `node v6/tests/chart-viewport-runtime-smoke.js`
- `node v6/tests/workstation-chart-surface-smoke.js`
- `node v6/tests/workstation-chart-viewport-bridge-browser-smoke.js`
- `node v6/tests/workstation-chart-data-bridge-browser-smoke.js`
- `node v6/tests/workstation-chart-adapter-browser-smoke.js`
- `node v6/tests/chart-engine-browser-smoke.js`
- `node v6/tests/visible-latency-cache-hit-browser-smoke.js`
- `node v6/tests/default-wall-replay-browser-smoke.js`
- `node v6/tests/multi-pane-manual-wall-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 44 should add a running-app browser gate proving default-wall load/next
drives the mounted workstation chart through replay, chart-data, chart-viewport,
and chart-engine boundaries.
