# V6 Multi-Pane Replay Viewport Projection - Step 157

## Decision

Step 157 accepts multi-pane replay viewport projection isolation.

V6 now verifies that replay `Next`, auto-play, and replay append after
historical extension project the viewport only for the pane whose chart-data
record changed. The replay cursor remains replay-owned, chart-data remains
pane-local, chart-viewport remains the owner of viewport intent/projection, and
chart-engine remains the only layer that writes the visible logical range.

## Accepted Behavior

- Replay `Next` appending pane-a updates pane-a chart-viewport projection and
  does not move pane-b projection.
- Auto-play appending pane-b updates pane-b chart-viewport projection and does
  not move pane-a projection.
- Manual pane viewport intent keeps its origin, offset, span, and revision when
  another pane appends replay bars.
- After pane-local leftward history extension, a replay append remains projected
  from the current pane-local latest logical index.
- Chart surface viewport application is driven only by
  `CHART_VIEWPORT_EVENTS.PROJECTED` through the viewport surface bridge.

## Coverage

- `multi-pane-replay-viewport-projection-step157-smoke.js` proves pane-local
  projection for manual next and auto-play in runtime.
- `multi-pane-replay-viewport-projection-browser-step157-smoke.js` proves the
  same behavior with real multi-pane chart hosts, chart-data bridge, and
  chart-viewport bridge.
- `multi-pane-replay-viewport-history-step157-smoke.js` proves replay append
  projection remains correct after pane-local historical extension.
- Step 156 append coverage still proves replay data mutation remains pane-local.
- Step 155 history coverage still proves leftward extension and exhaustion
  remain pane-local.

## Next Direction

Step 158 should re-audit the chart foundation as an integrated unit before
adding the next feature layer. Focus on ownership boundaries, browser regression
stability, and the import/replay/reset/multi-pane/history/crosshair/replay
viewport path as one baseline.
