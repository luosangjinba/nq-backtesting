# V6 Session - Step 8 Chart Data Runtime

Date: 2026-07-04 PDT

## Result

V6 Step 8 is complete. The app now has pane-local chart bars, append/replace
operations, no-future filtering, chartBarsRevision metadata, and a chart data
runtime exposed through commands/events.

## Commits

- `1fd4c2f feat(v6): add pane chart data store`
- `799f205 feat(v6): register chart data runtime`
- `a3bd5ee test(v6): gate chart data runtime`
- `5ac957c test(v6): enforce chart data boundaries`

## Verification

- `node v6/tests/chart-data-domain-smoke.js`
- `node v6/tests/chart-data-runtime-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `git diff --check`

## Boundary Notes

- Chart data runtime owns pane-local chart bars and revisions only.
- `cursorTimestamp` is accepted as a no-future filter input; chart data runtime
  does not own replay cursor state.
- Chart data runtime exposes `chartData.replaceBars`, `chartData.appendBars`,
  `chartData.getBars`, `chartData.clearPane`, and `chartData.getSummary`.
- Chart data runtime emits `chartData:barsChanged`.
- Chart data modules do not import or own replay runtime, bar-data runtime,
  viewport intent, shell, app runtime, or chart engine APIs.

## Next

Step 9 should add chart viewport runtime state for pane-local viewport intent,
consume replay cursor notifications, and reapply current intent after chart data
revisions without resetting default/manual wall origin or revision.
