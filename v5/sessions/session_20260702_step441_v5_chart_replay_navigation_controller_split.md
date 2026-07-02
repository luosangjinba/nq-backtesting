# Step 441 - V5 Chart Replay Navigation Controller Split

Status: completed.

Date: 2026-07-02

## Goal

Continue `chart-replay-route.js` decomposition by extracting chart Go to /
Reset View / Jump-to-cursor navigation into a route-local controller while
preserving runtime command ownership.

## Plan

1. Identify Go to, Reset View, Jump-to-cursor, and chart navigation queueing
   responsibilities inside `chart-replay-route.js`.
2. Add `features/chart-replay/chart-replay-navigation.js` for chart navigation
   DOM behavior and command UI state.
3. Keep chart/replay mutations routed through injected callbacks and existing
   runtime commands.
4. Update TODO/session handoff documentation.
5. Run syntax checks, focused browser smokes, full smoke suite, and
   `git diff --check`.

## Implementation

- Added `chart-replay-navigation.js`.
- Moved Go to popover open/close behavior, Go to input disabled-state refresh,
  wall-clock-to-canonical timestamp parsing, `GET_VIEWPORT_METRICS`,
  `GO_TO_TIME`, Reset View, Jump-to-cursor, and chart navigation command
  queueing into the controller.
- Updated `chart-replay-route.js` to create the navigation controller and
  inject display timezone, exchange timezone, timestamp formatting, shared
  command-in-flight accessors, controls-disabled rendering, and status text.
- Updated replay controls integration by reading Go to input through
  `navigationController?.getGoToInputValue()`.
- Reduced `chart-replay-route.js` from 499 lines to 407 lines.

## Boundary Notes

- `chart-replay-navigation.js` is route-local chart command UI. It may own Go
  to popover DOM state and navigation button event binding.
- The controller must not mutate chart adapters, replay cursor, display bars,
  or persistence directly.
- Chart navigation mutations must continue through chart runtime commands, and
  Jump-to-cursor may read replay runtime state only through `REPLAY_COMMANDS.GET_STATE`.
- `chart-replay-route.js` remains the route orchestration owner for initial
  load, Settings, runtime event subscriptions, viewport-demand bridge, and
  lifecycle disposal.

## Verification

- `node --check v5/src/features/chart-replay/chart-replay-route.js`
- `node --check v5/src/features/chart-replay/chart-replay-navigation.js`
- `node v5/tests/chart-go-to-time-browser-smoke.js`
- `node v5/tests/chart-navigation-toolbar-browser-smoke.js`
- `node v5/tests/replay-controls-browser-smoke.js`
- `node v5/tests/replay-floating-controls-browser-smoke.js`
- `node v5/tests/boundary-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Next Step Candidate

Step 442 should move to a targeted `chart-settings-panel.js` split. Suggested
first cut: separate Settings draft state helpers, template/section rendering,
and event binding while preserving the existing presentation runtime command
path.
