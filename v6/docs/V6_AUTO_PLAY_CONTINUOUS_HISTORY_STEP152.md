# V6 Auto-Play Continuous History - Step 152

## Decision

Step 152 accepts auto-play speed under continuous leftward historical extension.

V6 now verifies that replay auto-play can continue advancing and keep the latest
candle visible after multiple canvas-left capped older-window extensions have
loaded.

## Accepted Behavior

- Auto-play delegates replay advancement through the existing chart-entry
  manual-next path.
- Replay runtime remains the only owner of cursor and reveal state.
- Bar-data remains the only owner that requests and caches bars.
- Chart-data remains the owner of append/prepend merges and no-future filtering.
- Chart-engine remains the only owner that writes Lightweight Charts series.
- Continuous leftward historical extension remains capped to the canvas-left
  timeline boundary and does not mutate replay state.
- Auto-play speed selection remains owned by the transport / chart-entry
  auto-play boundary.

## Coverage

- `auto-play-continuous-history-step152-smoke.js` proves auto-play ticks stay
  within the runtime latency budget after repeated older-window extension and
  that replay advancement appends future bars without losing prepended history.
- `auto-play-continuous-history-browser-step152-smoke.js` proves browser-visible
  latest-candle updates remain responsive after multiple older-window extensions
  and that 4x auto-play advances at least two replay candles.
- Existing Step 151 and Step 150 smokes continue to prove continuous leftward
  exhaustion behavior and replay speed while or after history extension.

## Next Direction

Step 153 should define and gate the crosshair OHLC readout boundary. Keep the
readout owned by chart-surface/chart-engine interaction state, keep series
writes in chart-engine, and avoid introducing trading, overlays, comparison
symbols, Order, or Calendar behavior.
