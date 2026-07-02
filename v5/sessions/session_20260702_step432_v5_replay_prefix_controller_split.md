# Step 432 - V5 Replay Prefix Controller Split

## Status

Completed.

## Goal

Continue the replay runtime split by moving prefix demand and prefix retention
into a dedicated controller, keeping left-side sparse chart extension behavior
out of the main replay command owner.

## Plan

- Step 432.1: Choose prefix demand/retention as the next boundary because it is
  a stable replay subsystem and directly affects left-side chart extension.
- Step 432.2: Add a controller factory with injected state access, command
  dispatch, chart sync, and event emission instead of importing runtime globals.
- Step 432.3: Move prefix anchor de-dupe, prefix window loading, sparse display
  merge, retention release, and prefix events into the controller.
- Step 432.4: Keep `replay-runtime.js` responsible for command registration,
  replay lifecycle reset, and public helper re-exports.
- Step 432.5: Update boundary smoke coverage so prefix implementation bodies do
  not drift back into `replay-runtime.js`.
- Step 432.6: Run focused prefix/replay checks, full V5 smoke, and
  `git diff --check`.

## Changes

- Added `v5/src/runtime/replay-prefix-controller.js`.
- Updated `v5/src/runtime/replay-runtime.js` to delegate
  `LOAD_PREFIX_DEMAND` and `APPLY_PREFIX_RETENTION` to the controller.
- Moved loaded/loading prefix anchor sets into the controller and reset them
  through `prefixController.resetAnchors()`.
- Updated `v5/tests/runtime-boundary-smoke.js` to assert this boundary.
- Reduced `replay-runtime.js` from 1132 lines to 984 lines.
- Updated `v5/TODO.md` and this handoff.

## Guardrails

- Prefix loading still uses bar-data runtime commands only.
- Prefix rendering still writes chart state only through `replay-chart-sync`
  and chart runtime commands.
- Replay runtime remains the command/event registration owner.
- Public replay helper exports remain unchanged.

## Verification

- `node --check v5/src/runtime/replay-runtime.js`
- `node --check v5/src/runtime/replay-prefix-controller.js`
- `node v5/tests/prefix-demand-load-smoke.js`
- `node v5/tests/prefix-demand-merge-smoke.js`
- `node v5/tests/prefix-retention-smoke.js`
- `node v5/tests/replay-display-viewport-demand-smoke.js`
- `node v5/tests/runtime-boundary-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Next

Step 433 should extract display-window loading and display-timeframe projection
from `replay-runtime.js`. That will remove the next large mixed responsibility
before replay navigation/playback or more Settings contracts are added.
