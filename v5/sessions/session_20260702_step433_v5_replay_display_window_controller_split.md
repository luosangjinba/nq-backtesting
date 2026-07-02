# Step 433 - V5 Replay Display Window Controller Split

## Status

Completed.

## Goal

Move display-window loading and display-timeframe projection out of
`replay-runtime.js` so future replay display behavior does not accumulate in
the main command owner.

## Plan

- Step 433.1: Treat display-window loading as the next replay subsystem
  boundary after prefix demand/retention.
- Step 433.2: Add a display-window controller with injected state access,
  command dispatch, chart sync, initial-session loading, and event emission.
- Step 433.3: Move viewport-demand display-window loading, duplicate demand
  tracking, sparse backward seek attempts, display-timeframe switching, and
  display context snapshots into that controller.
- Step 433.4: Keep replay runtime responsible for command registration, cursor
  mutation, and lifecycle reset while delegating display commands and cursor
  projection.
- Step 433.5: Update boundary smoke coverage so display-window implementation
  bodies do not drift back into `replay-runtime.js`.
- Step 433.6: Run focused display smokes, full V5 smoke, and `git diff --check`.

## Changes

- Added `v5/src/runtime/replay-display-window-controller.js`.
- Updated `v5/src/runtime/replay-runtime.js` to delegate
  `SET_DISPLAY_TIMEFRAME`, `LOAD_DISPLAY_WINDOW`, `GET_DISPLAY_CONTEXT`, and
  post-cursor-move display projection.
- Moved display-window demand de-dupe into the controller and reset it through
  `displayWindowController.reset()`.
- Updated `v5/tests/runtime-boundary-smoke.js` to assert the new boundary.
- Reduced `replay-runtime.js` from 984 lines to 785 lines.
- Updated `v5/TODO.md` and this handoff.

## Guardrails

- Display-window loading still uses bar-data runtime commands only.
- Display-window rendering still writes chart state only through
  `replay-chart-sync` and chart runtime commands.
- Replay runtime remains the owner of replay command registration and
  cursor/reveal mutations.
- Public replay helper exports remain unchanged.

## Verification

- `node --check v5/src/runtime/replay-runtime.js`
- `node --check v5/src/runtime/replay-display-window-controller.js`
- `node v5/tests/replay-display-timeframe-smoke.js`
- `node v5/tests/replay-display-viewport-demand-smoke.js`
- `node v5/tests/replay-display-window-cache-smoke.js`
- `node v5/tests/replay-display-sparse-backward-seek-smoke.js`
- `node v5/tests/runtime-boundary-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Next

Step 434 should split the remaining replay runtime navigation/truncation/reset
or playback logic into a controller. After that, the replay runtime should be
small enough to resume Settings contracts without creating another large mixed
file.
