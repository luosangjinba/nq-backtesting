# V6 Step 42 - Connect Chart Data Snapshot To Mounted Adapter

Date: 2026-07-05

## Scope

Step 42 connected pane-local chart-data snapshots to the mounted workstation
chart adapter. Chart-data remains the owner of bars and revisions; chart-engine
is the only boundary that writes adapter series data.

## Commits

- `1a3d854e feat(v6): apply chart data records to workstation chart`
- `ee7bb97a feat(v6): bridge chart data to workstation chart`

## Implementation Notes

- Added `applyChartDataRecord(record)` to the workstation chart surface.
- Added `v6/src/chart-engine/chart-data-surface-bridge.js` to subscribe to
  `chartData:barsChanged` and forward records to the mounted chart surface.
- Connected the bridge in `v6/src/app.js` without giving route or shell code
  direct ownership of bars.
- Added browser coverage that dispatches chart-data commands through the command
  bus and verifies the mounted adapter updates its data length.

## Verification

- `node v6/tests/chart-data-surface-bridge-smoke.js`
- `node v6/tests/chart-data-runtime-smoke.js`
- `node v6/tests/workstation-chart-surface-smoke.js`
- `node v6/tests/workstation-chart-data-bridge-browser-smoke.js`
- `node v6/tests/workstation-chart-adapter-browser-smoke.js`
- `node v6/tests/chart-engine-browser-smoke.js`
- `node v6/tests/visible-latency-cache-hit-browser-smoke.js`
- `node v6/tests/default-wall-replay-browser-smoke.js`
- `node v6/tests/multi-pane-manual-wall-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 43 should connect chart-viewport projected logical ranges to the mounted
adapter. Chart-viewport must remain the owner of viewport intent and projection,
while chart-engine remains the only layer that writes adapter logical ranges.
