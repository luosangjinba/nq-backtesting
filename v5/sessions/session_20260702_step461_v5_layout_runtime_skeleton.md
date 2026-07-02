# Step 461 - V5 Layout Runtime Skeleton

Status: completed.

Date: 2026-07-02

## Goal

Turn the Step 460 layout split-pane contract into the smallest runtime state
boundary without enabling multi-pane rendering.

## Plan

1. Add layout contracts for commands, events, modes, and default pane state.
2. Add layout runtime with read-only state and active-pane selection.
3. Register layout runtime in app startup.
4. Wire chart route metadata to layout state while keeping one rendered pane.
5. Add focused layout runtime smoke coverage.
6. Update docs and session handoff.

## Implementation

- Added `src/contracts/layout-contracts.js`.
- Added `src/runtime/layout-runtime.js`.
- Registered layout runtime from `src/app.js`.
- Updated chart replay route metadata to use layout defaults and refresh from
  `layout.getState` / `layout:changed`.
- Added `tests/layout-runtime-smoke.js`.
- Added `layout-runtime-smoke.js` to `scripts/smoke_all.js`.

## Boundary Notes

- Default layout state is `single` with one `primary` pane.
- `layout.setActivePane` rejects unknown pane ids.
- Chart route still renders one pane; the Layout button remains disabled and
  deferred.
- Layout runtime does not own chart series, bar requests, replay cursor, or
  Settings draft state.

## Verification

- `node --check v5/src/runtime/layout-runtime.js`
- `node v5/tests/layout-runtime-smoke.js`
- `node v5/tests/boundary-smoke.js`
- `node v5/tests/chart-engine-boundary-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `git diff --check`

## Next Step Candidate

Step 462 can resume Settings within the active-pane scope, or add a two-pane
layout state/UI affordance only after defining the chart host mounting path.
