# Step 439 - V5 Chart Replay Controls Controller Split

## Status

Completed.

## Goal

Continue decomposing `chart-replay-route.js` by moving replay transport controls
and display-timeframe command handling into a dedicated route-local controller.

## Plan

- Step 439.1: Treat replay transport controls as route-local command UI, not
  route orchestration.
- Step 439.2: Add `chart-replay-controls.js` with injected runtime command
  dispatch, route state getters/setters, status text, timestamp formatting, and
  refresh hooks.
- Step 439.3: Move Next, Previous, Play, Pause, Reset, speed, replay interval,
  sync interval, display timeframe, replay command queueing, and control
  disabled/visible state into the controller.
- Step 439.4: Preserve the shared `commandInFlight` guard so replay commands
  and chart navigation commands cannot overlap.
- Step 439.5: Run focused browser smokes, boundary smoke, full V5 smoke, and
  `git diff --check`.

## Changes

- Added `v5/src/features/chart-replay/chart-replay-controls.js`.
- Updated `v5/src/features/chart-replay/chart-replay-route.js` to delegate
  transport controls and display-timeframe changes to the controller.
- Reduced `chart-replay-route.js` from 749 lines to 625 lines.
- Updated `v5/TODO.md`, `v5/sessions/README.md`, and this handoff.

## Guardrails

- The controls controller dispatches only through injected command dispatch and
  does not import runtime implementations.
- Replay cursor and display bars remain owned by replay runtime.
- Display-timeframe changes still go through replay runtime commands.
- The route shell still owns initial load, Settings orchestration, truncate
  pick mode, chart go-to/reset navigation, event subscriptions, and disposal.

## Verification

- `node --check v5/src/features/chart-replay/chart-replay-route.js`
- `node --check v5/src/features/chart-replay/chart-replay-controls.js`
- `node v5/tests/replay-controls-browser-smoke.js`
- `node v5/tests/replay-display-timeframe-browser-smoke.js`
- `node v5/tests/chart-navigation-toolbar-browser-smoke.js`
- `node v5/tests/replay-floating-controls-browser-smoke.js`
- `node v5/tests/boundary-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Next

Continue `chart-replay-route.js` decomposition. The next practical boundaries
are truncate pick mode and chart go-to/reset navigation.
