# V6 Multi-Pane Leftward History - Step 155

## Decision

Step 155 accepts multi-pane leftward historical extension isolation.

V6 now verifies that canvas-left historical extension is coordinated by pane.
One pane can repeatedly extend and exhaust older history without mutating
another pane's chart-data record or blocking that other pane from loading the
same cached older-window data.

## Accepted Behavior

- Chart-history requests are keyed by pane for in-flight suppression.
- Exhausted-history memory is scoped by pane, instrument, and timeframe.
- Bar-data cache remains shared by instrument/timeframe/window, so a second pane
  can reuse a loaded older window without a second network/data fetch.
- Chart-data prepends are applied only to the requested pane.
- Chart-engine remains the only owner of chart series writes through the chart
  surface bridge.
- Replay runtime remains isolated from historical prepend behavior.

## Coverage

- `multi-pane-leftward-history-step155-smoke.js` proves one pane can extend to
  exhaustion while another pane's chart-data record remains unchanged, then the
  second pane can independently load the same older window from cache.
- `multi-pane-leftward-history-browser-step155-smoke.js` proves the same
  isolation in a browser runtime with real multi-pane chart hosts and chart-data
  surface bridge wiring.
- Step 151 pane-isolation coverage still proves exhausted-history memory is
  pane-local.
- Step 148-151 historical extension coverage still proves canvas-left caps,
  duplicate/in-flight suppression, exhaustion stopping, and replay speed.

## Next Direction

Step 156 should harden multi-pane replay append and auto-play isolation. Keep
replay cursor ownership unchanged while proving replay-driven appends update the
intended pane data and do not interfere with leftward historical extension state.
