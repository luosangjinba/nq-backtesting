# V6 Session - Step 196 Pane Reload HTF Projection

Date: 2026-07-08

## Completed

Step 196 routed pane reload chart-data replacement through the chart-data
projection owner for higher display timeframes.

Commits:

- `a08dee66 feat(v6): route pane reload HTF projection`
- `1466f087 test(v6): guard pane reload projection scope`
- `914b4a71 test(v6): cover pane reload HTF projection browser flow`

## Changes

- Updated `pane-intent-reload-chart-data-runtime` so HTF reload replacement
  uses `chartDataProjection.project` before `chartData.replaceBars`.
- Added replacement state metadata showing projection owner, revision, source
  count, source timeframe, target timeframe, and bucket count.
- Kept 1m pane reload replacement on the existing raw-bars path.
- Added runtime and browser smokes for pane reload HTF projection.
- Updated routing-scope guards so only initial chart-entry and pane reload are
  allowed to use the projection owner at this stage.

## Boundary Notes

This step does not change pane reload window planning. The request still goes
through bar-data and uses the currently planned window. Manual next, auto-play,
leftward history, reset view, chart-data runtime, and chart engine remain
unrouted to projection owner.

## Verification

- `node v6/tests/pane-reload-htf-projection-step196-smoke.js`
- `node v6/tests/pane-reload-htf-projection-browser-step196-smoke.js`
- `node v6/tests/chart-data-projection-routing-scope-step196-smoke.js`
- `node v6/tests/chart-data-projection-routing-scope-step195-smoke.js`
- `node v6/tests/chart-data-projection-no-routing-step194-smoke.js`
- `node v6/tests/pane-reload-pipeline-step179-smoke.js`
- `node v6/tests/pane-reload-pipeline-browser-step179-smoke.js`
- `node v6/tests/chart-data-projection-owner-step194-smoke.js`
- `node v6/tests/chart-data-projection-contract-step194-smoke.js`
- `node v6/tests/replay-safe-leftward-history-latency-browser-step187-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 197 should route manual next through the projection owner for HTF panes and
add a visible latency browser gate for the rendered HTF candle. Auto-play,
leftward history, and reset view should remain untouched until their dedicated
steps.
