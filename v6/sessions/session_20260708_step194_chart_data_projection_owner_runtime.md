# V6 Session - Step 194 Chart Data Projection Owner Runtime

Date: 2026-07-08

## Completed

Step 194 added the chart-data projection owner contract and runtime. It
intentionally did not route the owner into initial load, pane reload, manual
next, auto-play, leftward history, reset view, chart-data runtime, UI, or chart
engine.

Commits:

- `6ffad2df feat(v6): define chart data projection contract`
- `57aedc9d feat(v6): add chart data projection owner runtime`
- `b3d8fe25 test(v6): guard chart data projection routing`

## Changes

- Added `CHART_DATA_PROJECTION_COMMANDS` and
  `CHART_DATA_PROJECTION_EVENTS`.
- Added `createChartDataProjectionRuntime()`.
- Added owner runtime coverage for pane-local projection, event emission,
  revision state, metadata cloning, and stop/reset behavior.
- Added no-routing coverage proving the owner is not wired into runtime flows
  before the planned routing steps.

## Owner Contract

The owner runtime exposes:

- `chartDataProjection.getState`
- `chartDataProjection.project`
- `chartDataProjection:projected`

The owner consumes caller-provided source bars and calls the pure projection
domain. It does not request bars, mutate replay cursor state, update chart-data,
touch chart engine APIs, or decide UI interval intent.

## Verification

- `node v6/tests/chart-data-projection-contract-step194-smoke.js`
- `node v6/tests/chart-data-projection-owner-step194-smoke.js`
- `node v6/tests/chart-data-projection-no-routing-step194-smoke.js`
- `node v6/tests/display-timeframe-no-wiring-step193-smoke.js`
- `node v6/tests/display-timeframe-projection-domain-step193-smoke.js`
- `node v6/tests/replay-safe-leftward-history-latency-browser-step187-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 195 should route initial chart-entry projection through the owner for
higher display timeframes only. It should leave pane reload, manual next,
auto-play, leftward history, and reset view for later dedicated steps.
