# Step 435 - V5 Replay Navigation Controller Split

## Status

Completed.

## Goal

Move replay cursor navigation, truncation, and reset mutations out of
`replay-runtime.js` so the runtime shell stays focused on composition, command
registration, lifecycle, and session bootstrap.

## Plan

- Step 435.1: Treat `NEXT`, `PREVIOUS`, `TRUNCATE_TO_TIMESTAMP`, and `RESET`
  as the final large replay subsystem boundary.
- Step 435.2: Add a navigation controller with injected state access, bar-data
  dispatch, chart sync, display projection, session bootstrap hooks,
  persistence hooks, playback pause, and event emission.
- Step 435.3: Move cursor/reveal mutation, display-bar filtering, no-future
  guards, persistence writes, chart sync, and navigation events into the
  controller.
- Step 435.4: Keep replay runtime responsible for command registration and
  inject `navigationController.next` into playback.
- Step 435.5: Update boundary smoke coverage so navigation implementation
  bodies do not drift back into `replay-runtime.js`.
- Step 435.6: Run focused navigation/playback/display checks, full V5 smoke,
  and `git diff --check`.

## Changes

- Added `v5/src/runtime/replay-navigation-controller.js`.
- Updated `v5/src/runtime/replay-runtime.js` to delegate `NEXT`, `PREVIOUS`,
  `TRUNCATE_TO_TIMESTAMP`, and `RESET`.
- Updated playback wiring to advance through `navigationController.next`.
- Updated `v5/tests/runtime-boundary-smoke.js` to assert the navigation
  boundary.
- Reduced `replay-runtime.js` from 712 lines to 363 lines.
- Updated `v5/TODO.md` and this handoff.

## Guardrails

- Navigation still advances through bar-data runtime commands only.
- Navigation still persists cursor through the session runtime command hook
  provided by replay runtime.
- Navigation still writes chart state only through `replay-chart-sync` and
  chart runtime commands.
- Replay runtime remains the command registration and lifecycle owner.

## Verification

- `node --check v5/src/runtime/replay-runtime.js`
- `node --check v5/src/runtime/replay-navigation-controller.js`
- `node v5/tests/replay-next-smoke.js`
- `node v5/tests/replay-previous-smoke.js`
- `node v5/tests/replay-truncate-smoke.js`
- `node v5/tests/replay-reset-smoke.js`
- `node v5/tests/replay-play-smoke.js`
- `node v5/tests/replay-display-timeframe-no-future-smoke.js`
- `node v5/tests/runtime-boundary-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Next

Step 436 should decide whether to split session bootstrap/restore from
`replay-runtime.js` or return to the next Settings contract. The runtime shell
is now small enough that either path is reasonable, but new feature work should
continue to use the controller/module boundaries created in Steps 431-435.
