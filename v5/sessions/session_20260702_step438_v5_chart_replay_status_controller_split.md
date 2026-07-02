# Step 438 - V5 Chart Replay Status Controller Split

## Status

Completed.

## Goal

Start decomposing `chart-replay-route.js` by moving route-local replay
status/readout rendering into a dedicated controller.

## Plan

- Step 438.1: Treat replay footer status, chart OHLC overlay, crosshair
  readout, countdown, and route-local display formatting as the first stable
  route split.
- Step 438.2: Add `chart-replay-status.js` with injected getters for display
  timezone, exchange timezone, presentation settings, and active display
  timeframe.
- Step 438.3: Move status labels, OHLC legend DOM rendering, crosshair readout,
  countdown rendering, and replay timestamp formatting into the status
  controller.
- Step 438.4: Keep `chart-replay-route.js` responsible for runtime command
  dispatch, event subscription, initial load, Settings orchestration, truncate
  pick mode, go-to navigation, and lifecycle disposal.
- Step 438.5: Run focused browser smokes, boundary smoke, full V5 smoke, and
  `git diff --check`.

## Changes

- Added `v5/src/features/chart-replay/chart-replay-status.js`.
- Updated `v5/src/features/chart-replay/chart-replay-route.js` to delegate
  replay status/readout rendering to the controller.
- Reduced `chart-replay-route.js` from 872 lines to 749 lines.
- Updated `v5/TODO.md`, `v5/sessions/README.md`, and this handoff.

## Guardrails

- The status controller is route-local UI only. It does not dispatch replay,
  chart, bar-data, display-timezone, or presentation mutation commands.
- Runtime snapshots and event payloads still flow through `chart-replay-route`.
- Replay cursor, display bars, chart series writes, and bar requests are
  unchanged.
- Future route splits should target replay command controls, truncate pick
  mode, or chart navigation before moving to `chart-settings-panel.js`.

## Verification

- `node --check v5/src/features/chart-replay/chart-replay-route.js`
- `node --check v5/src/features/chart-replay/chart-replay-status.js`
- `node v5/tests/chart-presentation-browser-smoke.js`
- `node v5/tests/chart-crosshair-browser-smoke.js`
- `node v5/tests/replay-controls-browser-smoke.js`
- `node v5/tests/replay-restore-browser-smoke.js`
- `node v5/tests/boundary-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Next

Continue `chart-replay-route.js` decomposition. The next clean boundaries are
replay command controls, truncate pick mode, and chart go-to/reset navigation.
