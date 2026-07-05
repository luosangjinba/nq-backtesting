# V6 Step 20 - Pane-Local Manual Walls

Date: 2026-07-05

## Scope

Step 20 closed the Phase 5 multi-pane replay gates by proving manual wall
intent is pane-local. The underlying viewport store already owned records by
pane id, so this step added runtime and browser gates that prevent regressions.

## Commits

- `ef540a6 test(v6): guard pane manual viewport intent`
- `699eac4 test(v6): verify multi pane manual wall replay`

## Implementation Notes

- Added a chart viewport runtime smoke that promotes only one pane to manual
  intent and verifies another pane remains default after replay and chart data
  events.
- Added a browser smoke with two chart hosts. The right pane is moved to a
  manual wall while the left pane remains at the default wall.
- The browser gate measures visible latency for both panes independently.
- The test path keeps single-pane manual wall replay behavior unchanged.

## Verification

- `node v6/tests/chart-viewport-pane-manual-isolation-smoke.js`
- `node v6/tests/multi-pane-manual-wall-browser-smoke.js`
- `node v6/tests/manual-wall-replay-browser-smoke.js`
- `node v6/tests/mixed-timeframe-visible-latency-browser-smoke.js`
- `node v6/tests/default-wall-runtime-smoke.js`
- `node v6/tests/chart-viewport-runtime-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 21 should start Phase 6 with a Settings baseline. Settings needs an
explicit state owner and command/event contract before any UI parity work.
