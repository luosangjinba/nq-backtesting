# Step 431 - V5 Replay Runtime Boundary Split

## Status

Completed.

## Goal

Split the replay runtime before adding more replay/settings behavior so V5 keeps
clear module ownership instead of repeating V4's large-file accumulation.

## Plan

- Step 431.1: Treat this as a structural boundary split with no command/event
  behavior change.
- Step 431.2: Move pure replay state, timestamp/timeframe, display-bar safety,
  prefix-retention, sparse display merge, and countdown derivation helpers into
  a replay state module.
- Step 431.3: Move replay-to-chart command synchronization into a dedicated
  chart-sync helper that receives commands by injection.
- Step 431.4: Keep `replay-runtime.js` as the replay command owner and preserve
  existing public helper exports through re-exports.
- Step 431.5: Run syntax checks, replay focused smokes, the full V5 smoke, and
  `git diff --check`.

## Changes

- Added `v5/src/runtime/replay-runtime-state.js`.
- Added `v5/src/runtime/replay-chart-sync.js`.
- Updated `v5/src/runtime/replay-runtime.js` to import helper boundaries and
  re-export the existing public guard/helper API.
- Reduced `replay-runtime.js` from 1421 lines to 1132 lines.
- Updated `v5/TODO.md` and this handoff with the Step 431 boundary decision.

## Guardrails

- Replay runtime still owns replay cursor, reveal count, countdown snapshot, and
  replay command registration.
- Chart writes still go through chart runtime commands; no replay module calls a
  chart adapter or series API.
- Bar loading and caching still go through bar-data runtime commands.
- Public helper imports from `replay-runtime.js` remain compatible.

## Verification

- `node --check v5/src/runtime/replay-runtime.js`
- `node --check v5/src/runtime/replay-runtime-state.js`
- `node --check v5/src/runtime/replay-chart-sync.js`
- `node v5/tests/replay-next-smoke.js`
- `node v5/tests/replay-previous-smoke.js`
- `node v5/tests/replay-display-window-cache-smoke.js`
- `node v5/tests/replay-viewport-follow-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Next

Step 432 should continue the replay runtime split, preferably by extracting
display-window loading and prefix-demand/retention into explicit controller
factories before more replay or Settings behavior is added.
