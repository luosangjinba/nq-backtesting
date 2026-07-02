# Step 453 - V5 Chart Runtime Host Sync Boundary Split

Status: completed.

Date: 2026-07-02

## Goal

Reduce `chart-runtime.js` ownership pressure by moving mounted-host metadata and
adapter synchronization into a chart-runtime internal subsystem while preserving
the chart runtime command/event and adapter ownership boundary.

## Plan

1. Identify the mounted-host sync and metadata responsibilities in
   `chart-runtime.js`.
2. Extract those responsibilities into a dedicated host-sync controller.
3. Keep host mount lifecycle, command/event registration, state mutation, and
   adapter map ownership in `chart-runtime.js`.
4. Verify native interaction deferral, deferred flush, metadata writeback, and
   stale host cleanup through existing focused smoke coverage.
5. Update TODO/session handoff and commit.

## Implementation

- Added `src/runtime/chart-runtime-host-sync.js`.
- Moved chart metadata construction, mounted-host rerender, stale host cleanup,
  native interaction defer, and deferred sync flush into the controller.
- Updated `chart-runtime.js` to call `hostSync.syncChartHost`,
  `hostSync.rerenderMountedHosts`, `hostSync.syncMetadataToMountedHosts`, and
  `hostSync.flushPendingAfterNativeInteraction`.
- Removed unused inline `syncVisibleRangeToMountedHosts` code.

## Boundary Notes

- `chart-runtime.js` remains the only public chart runtime entrypoint and the
  only module registering chart commands/events.
- `chart-runtime-host-sync.js` has no command bus, event bus, replay, bar-data,
  or UI dependency.
- `chart-runtime-host-sync.js` may write chart adapters only through the state
  and adapter maps injected by `chart-runtime.js`.
- `chart-runtime.js` is now 484 lines, down from 559 after Step 452 and 612 at
  the Step 451 audit.

## Verification

- `node v5/tests/chart-runtime-smoke.js`
- `node v5/tests/chart-runtime-engine-adapter-smoke.js`
- `node v5/tests/chart-interaction-contracts-smoke.js`
- `node v5/tests/boundary-smoke.js`
- `git diff --check`

## Next Step Candidate

Step 454 should likely shift to `chart-engine-presentation.js` presentation
mapping/fallback rendering boundaries unless a product bug takes priority.
