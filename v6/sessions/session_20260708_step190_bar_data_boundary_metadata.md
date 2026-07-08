# V6 Session - Step 190 Bar-Data Owned Chart Boundary Metadata

Date: 2026-07-08

## Completed

Step 190 moved chart boundary knowledge into the bar-data owner and added
real-date coverage for multiple Sunday `18:00` futures boundaries.

Commits:

- `e9c8491e feat(v6): expose bar data boundary metadata`
- `1d62f10b test(v6): cover real-date chart boundary metadata`
- `e873b447 feat(v6): let dashboard model consume chart boundary metadata`

## Changes

- Added `BAR_DATA_COMMANDS.GET_BOUNDARY_METADATA`.
- Added cache-derived boundary metadata for loaded windows:
  - earliest/latest loaded timestamp and display time;
  - loaded/empty window counts;
  - loaded bar count;
  - known exhausted-before timestamp when available from bar-data history.
- Added an owner-side smoke proving NQ boundary metadata can report
  `2026-05-31 18:00` as the actual loaded chart-data boundary.
- Added a real browser smoke using the live V4 bars API for four NQ Sunday
  `18:00` boundaries:
  - `2026-04-26 18:00`;
  - `2026-05-03 18:00`;
  - `2026-05-10 18:00`;
  - `2026-05-31 18:00`.
- Added a dashboard model input for explicitly supplied chart boundary
  metadata. The dashboard UI still does not query bar-data directly.

## Boundary Notes

- Bar-data remains the only owner that requests bars, caches windows, and
  derives actual loaded data boundaries.
- The session dashboard still has its static Globex fallback when actual
  metadata has not been supplied.
- Step 190 does not yet wire a live bridge from bar-data metadata into visible
  dashboard rows or pane status. That should be a separate owner-bridge step.

## Verification

- `node v6/tests/bar-data-boundary-metadata-step190-smoke.js`
- `node v6/tests/real-date-boundary-metadata-browser-step190-smoke.js`
- `node v6/tests/session-dashboard-model-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/bar-data-runtime-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/real-date-leftward-gap-browser-step189-smoke.js`
- `node v6/tests/replay-safe-leftward-history-latency-browser-step187-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 191 should add an explicit shell/session-facing bridge for actual boundary
metadata. The bridge should decide where to surface the data first without
letting dashboard UI, pane UI, or chart surface code query bar-data internals.
