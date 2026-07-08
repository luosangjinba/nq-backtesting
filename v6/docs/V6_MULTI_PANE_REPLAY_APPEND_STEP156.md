# V6 Multi-Pane Replay Append - Step 156

## Decision

Step 156 accepts multi-pane replay append and auto-play isolation.

V6 now verifies that replay-driven `Next` and auto-play append bars through the
requested pane id. The replay cursor remains owned by replay runtime, bar
requests remain owned by bar-data runtime, pane-local chart-data mutation remains
owned by chart-data runtime, and chart series writes remain owned by
chart-engine through the chart surface bridge.

## Accepted Behavior

- `CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT` accepts a pane id payload and defaults
  to `main`.
- `CHART_ENTRY_AUTO_PLAY_COMMANDS.START` accepts a pane id payload, stores it in
  auto-play state, and dispatches repeated manual next commands for that pane.
- Replay `Next` append updates only the requested pane-local chart-data record.
- Auto-play append updates only the requested pane-local chart-data record.
- Bar-data fetch/cache ownership remains shared and independent of pane-local
  chart-data records.
- Multi-pane chart surface bridge applies each pane-local chart-data update only
  to the corresponding chart host.

## Coverage

- `multi-pane-replay-append-step156-smoke.js` proves manual next and auto-play
  append into different pane-local chart-data records without mutating the other
  pane.
- `multi-pane-replay-append-browser-step156-smoke.js` proves the same behavior
  in a browser runtime with real multi-pane chart hosts and chart-data surface
  bridge wiring.
- Existing Step 152 coverage still proves auto-play remains fast after
  continuous leftward history extension.
- Existing Step 155 coverage still proves historical extension and exhaustion
  remain pane-local.

## Next Direction

Step 157 should harden multi-pane replay viewport projection isolation. Keep the
new pane-aware append path, then prove replay append and auto-play viewport
projection only affects the intended pane-local chart-viewport record.
