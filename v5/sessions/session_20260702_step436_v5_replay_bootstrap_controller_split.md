# Step 436 - V5 Replay Bootstrap Controller Split

## Status

Completed.

## Goal

Move replay session bootstrap and persisted cursor restore out of
`replay-runtime.js` so the runtime shell remains a composition, lifecycle,
event subscription, and command-registration module.

## Plan

- Step 436.1: Treat `RESOLVE_START_BAR`, `LOAD_INITIAL_PREFIX`, and
  `LOAD_INITIAL_SESSION` as a bootstrap/restore subsystem.
- Step 436.2: Add a bootstrap controller with injected state access,
  command dispatch, chart sync, prefix-anchor reset, and event emission.
- Step 436.3: Move start-bar resolution, initial prefix loading, persisted
  reveal-bar restore, initial chart render, and stale initial-load sequence
  guards into the controller.
- Step 436.4: Keep replay runtime responsible for command registration and
  inject bootstrap hooks into display-window and navigation controllers.
- Step 436.5: Update boundary smoke coverage so bootstrap implementation bodies
  do not drift back into `replay-runtime.js`.
- Step 436.6: Run focused bootstrap/restore checks, full V5 smoke, and
  `git diff --check`.

## Changes

- Added `v5/src/runtime/replay-bootstrap-controller.js`.
- Updated `v5/src/runtime/replay-runtime.js` to delegate
  `RESOLVE_START_BAR`, `LOAD_INITIAL_PREFIX`, and `LOAD_INITIAL_SESSION`.
- Updated display-window and navigation wiring to call bootstrap hooks through
  the controller.
- Updated `v5/tests/runtime-boundary-smoke.js` to assert the bootstrap
  boundary.
- Reduced `replay-runtime.js` from 363 lines to 178 lines.
- Updated `v5/TODO.md` and this handoff.

## Guardrails

- Bootstrap still loads bars only through bar-data runtime commands.
- Initial chart render still writes chart state only through `replay-chart-sync`
  and chart runtime commands.
- Replay runtime still owns command registration, event subscription,
  controller composition, lifecycle reset, and public helper exports.
- The bootstrap controller owns stale initial-load sequence guards so session
  switches cannot complete an old initial load.

## Verification

- `node --check v5/src/runtime/replay-runtime.js`
- `node --check v5/src/runtime/replay-bootstrap-controller.js`
- `node v5/tests/replay-start-bar-smoke.js`
- `node v5/tests/replay-prefix-load-smoke.js`
- `node v5/tests/replay-initial-render-smoke.js`
- `node v5/tests/replay-restore-smoke.js`
- `node v5/tests/replay-session-switch-smoke.js`
- `node v5/tests/replay-cursor-persistence-smoke.js`
- `node v5/tests/runtime-boundary-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Next

Step 437 should return to the Settings backlog matrix and pick the next
explicit contract row. The replay runtime shell now has stable subsystem
boundaries for state helpers, chart sync, prefix loading, bootstrap/restore,
display-window projection, playback, and cursor navigation.
