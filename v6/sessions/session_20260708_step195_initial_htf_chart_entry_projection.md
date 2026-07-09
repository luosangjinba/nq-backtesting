# V6 Session - Step 195 Initial HTF Chart Entry Projection

Date: 2026-07-08

## Completed

Step 195 routed initial chart-entry projection through the chart-data projection
owner when the pane display timeframe is higher than the source timeframe.

Commits:

- `bf4e4053 feat(v6): route initial HTF chart entry projection`
- `5ceda6b3 test(v6): guard initial projection routing scope`
- `5f55e964 test(v6): cover initial HTF chart entry browser flow`

## Changes

- Registered `createChartDataProjectionRuntime()` in the app lifecycle before
  chart-entry runtimes.
- Updated chart-entry projection preparation runtime to resolve pane display
  timeframe and call `chartDataProjection.project` for initial HTF preparation.
- Added projection source metadata to prepared chart-entry payloads.
- Added runtime and browser smokes for initial 5m chart-entry projection.
- Added routing-scope guard proving Step 195 did not route pane reload, manual
  next, auto-play, leftward history, reset view, chart-data runtime, or chart
  engine through the projection owner.

## Notes

Initial chart-entry still writes the existing `main` chart/viewport record. The
runtime falls back to the active pane display timeframe when the plan pane id is
not present in pane state. This keeps the step scoped to initial HTF projection
without starting a broader pane-id ownership change.

## Verification

- `node v6/tests/initial-htf-chart-entry-projection-step195-smoke.js`
- `node v6/tests/initial-htf-chart-entry-browser-step195-smoke.js`
- `node v6/tests/chart-data-projection-routing-scope-step195-smoke.js`
- `node v6/tests/chart-data-projection-no-routing-step194-smoke.js`
- `node v6/tests/chart-entry-projection-preparation-runtime-smoke.js`
- `node v6/tests/chart-entry-projection-preparation-smoke.js`
- `node v6/tests/chart-data-projection-owner-step194-smoke.js`
- `node v6/tests/chart-data-projection-contract-step194-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/replay-safe-leftward-history-latency-browser-step187-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 196 should route pane reload chart-data replacement through the projection
owner for HTF panes. Manual next, auto-play, leftward history, and reset view
should remain untouched until their dedicated steps.
