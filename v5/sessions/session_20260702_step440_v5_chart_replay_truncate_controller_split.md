# Step 440 - V5 Chart Replay Truncate Controller Split

Status: completed.

Date: 2026-07-02

## Goal

Continue `chart-replay-route.js` decomposition by extracting selected-bar
truncate pick mode into a route-local controller while preserving replay/chart
runtime ownership boundaries.

## Plan

1. Identify the remaining truncate pick responsibilities inside
   `chart-replay-route.js`.
2. Add `features/chart-replay/chart-replay-truncate.js` for truncate-specific
   DOM behavior and command UI state.
3. Keep runtime mutations routed through injected callbacks and existing
   replay/chart commands.
4. Update TODO/session handoff documentation.
5. Run syntax checks, focused smokes, full smoke suite, and `git diff --check`.

## Implementation

- Added `chart-replay-truncate.js`.
- Moved truncate transport button binding, pick-mode state, vertical guide
  rendering, warning popover behavior, Escape cancel behavior, visible
  rendered-bar timestamp selection, timestamp guardrails, and replay truncate
  command wiring into the controller.
- Updated `chart-replay-route.js` to create the truncate controller and inject:
  replay-loaded state, session id, start/cursor timestamps, timestamp
  formatting, replay command queueing, status text, terminal reason, controls
  disabled rendering, and replay status refresh.
- Updated `chart-replay-controls.js` integration indirectly by passing
  `truncateController?.isPickMode()` into the existing disabled-state getter.
- Reduced `chart-replay-route.js` from 625 lines to 499 lines.

## Boundary Notes

- `chart-replay-truncate.js` is route-local command UI. It may own DOM state and
  user interaction for selected-bar truncation.
- The controller must not mutate replay cursor, display bars, chart series, or
  persistence directly.
- Truncate mutations must continue through `REPLAY_COMMANDS.TRUNCATE_TO_TIMESTAMP`.
- `chart-replay-route.js` remains the route orchestration owner for initial
  load, Settings, chart go-to/reset navigation, event subscriptions, and
  lifecycle disposal.

## Verification

- `node --check v5/src/features/chart-replay/chart-replay-route.js`
- `node --check v5/src/features/chart-replay/chart-replay-truncate.js`
- `node v5/tests/replay-controls-browser-smoke.js`
- `node v5/tests/replay-floating-controls-browser-smoke.js`
- `node v5/tests/chart-navigation-toolbar-browser-smoke.js`
- `node v5/tests/boundary-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Next Step Candidate

Step 441 should continue `chart-replay-route.js` decomposition by extracting
chart go-to/reset/jump navigation into a route-local controller before moving
to the larger `chart-settings-panel.js` split.
