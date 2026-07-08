# V6 Session - Step 191 Chart Boundary Metadata Bridge

Date: 2026-07-08

## Completed

Step 191 added the owner bridge that carries bar-data-owned boundary metadata
to the session/dashboard surface without letting UI modules query bar-data
directly.

Commits:

- `d68e832f feat(v6): add chart boundary metadata bridge runtime`
- `9411d61a feat(v6): bridge chart boundary metadata to dashboard`

## Changes

- Added `CHART_BOUNDARY_METADATA_COMMANDS.GET_STATE` and `REFRESH`.
- Added `CHART_BOUNDARY_METADATA_EVENTS.UPDATED`.
- Added `createChartBoundaryMetadataRuntime`.
  - It subscribes to bar-data window loaded/released events.
  - It reads metadata only through `BAR_DATA_COMMANDS.GET_BOUNDARY_METADATA`.
  - It exposes shell/session-facing state through its own command/event surface.
- Wired `session-dashboard` to the bridge command/event surface.
  - Dashboard rows preserve the static prior-Globex fallback before actual
    metadata is available.
  - Once bridge metadata reports an actual loaded boundary, the dashboard row
    displays `Chart data from loaded boundary: ...`.
- Added browser coverage proving the dashboard switches from static
  `2026-05-31 18:00` fallback to actual loaded boundary metadata after the
  relevant NQ window is loaded.

## Boundary Notes

- Dashboard UI still does not import or dispatch `BAR_DATA_COMMANDS`.
- The bridge runtime is the session-facing adapter for chart boundary metadata.
- Bar-data remains the only owner of requests, cache records, and actual
  boundary derivation.
- Step 191 intentionally does not start TF work. TF should follow a readiness
  audit so aggregation, no-future filtering, pane-local reload, replay append,
  reset view, and leftward history ownership are explicit before implementation.

## Verification

- `node v6/tests/chart-boundary-metadata-runtime-step191-smoke.js`
- `node v6/tests/session-dashboard-boundary-bridge-browser-step191-smoke.js`
- `node v6/tests/bar-data-boundary-metadata-step190-smoke.js`
- `node v6/tests/real-date-boundary-metadata-browser-step190-smoke.js`
- `node v6/tests/session-dashboard-model-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/real-date-leftward-gap-browser-step189-smoke.js`
- `node v6/tests/replay-safe-leftward-history-latency-browser-step187-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 192 should be a display-timeframe readiness audit. It should decide the
owner boundary and acceptance tests for higher timeframe data before any TF
feature implementation begins.
