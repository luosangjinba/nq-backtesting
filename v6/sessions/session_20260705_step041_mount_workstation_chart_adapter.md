# V6 Step 41 - Mount Workstation Chart Adapter

Date: 2026-07-05

## Scope

Step 41 mounted a real Lightweight chart adapter into the workstation chart host
reserved in Step 40. The mount is owned by chart-engine; route and shell code do
not write chart series data, replay cursor, or viewport intent.

## Commits

- `90e747d1 feat(v6): add workstation chart surface mount`
- `56586e14 feat(v6): mount workstation chart adapter`

## Implementation Notes

- Added `mountWorkstationChartSurface(root)` in
  `v6/src/chart-engine/workstation-chart-surface.js`.
- Added `resizePane` to `createChartHostManager` so host resizing remains inside
  chart-engine ownership.
- Mounted the workstation chart surface from `v6/src/app.js` after shell/runtime
  startup.
- Added browser coverage proving the running app mounts the default pane adapter
  with `dataLength: 0` until chart-data explicitly drives the surface.

## Verification

- `node v6/tests/chart-host-manager-smoke.js`
- `node v6/tests/workstation-chart-surface-smoke.js`
- `node v6/tests/workstation-chart-adapter-browser-smoke.js`
- `node v6/tests/chart-engine-browser-smoke.js`
- `node v6/tests/visible-latency-cache-hit-browser-smoke.js`
- `node v6/tests/default-wall-replay-browser-smoke.js`
- `node v6/tests/multi-pane-manual-wall-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 42 should connect chart-data snapshots to the mounted workstation adapter
through an explicit integration boundary. Chart-data must continue to own
pane-local bars and revisions, while chart-engine remains the only layer that
writes the adapter series.
