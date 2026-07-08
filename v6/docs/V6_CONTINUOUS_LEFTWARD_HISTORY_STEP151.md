# V6 Continuous Leftward History - Step 151

## Decision

Step 151 accepts continuous leftward historical K-line extension until the
bar-data source reports exhausted older coverage.

The chart-history runtime now remembers exhausted older history by
pane/instrument/timeframe and prevents repeated older-window requests once the
planned window is fully before the exhausted boundary.

## Accepted Behavior

- Repeated leftward extension uses the current canvas-left timeline boundary for
  each older-window request.
- Bar-data remains the only requester/cache owner.
- Chart-data remains the owner of prepend/merge behavior.
- Chart-engine remains the only Lightweight Charts series writer.
- Replay runtime remains the only owner of cursor and reveal state.
- Exhaustion memory is pane-local, while bar-data cache can still serve shared
  instrument/timeframe windows across panes.
- Real browser integration can load multiple older windows in sequence and keep
  replay `Next` visibly fast afterward.

## Coverage

- `continuous-leftward-history-step151-smoke.js` proves repeated extension
  progresses through older windows and stops before issuing a new request after
  exhausted history has been reported.
- `continuous-leftward-history-browser-step151-smoke.js` proves the browser page
  can perform multiple older-window extensions, grow chart-data/cache, keep
  replay state unchanged during extension, and still advance replay `Next`.
- `continuous-leftward-history-pane-isolation-step151-smoke.js` proves exhausted
  history memory is scoped per pane and does not block another pane from loading
  the same instrument/timeframe window.
- `drag-triggered-history-extension-browser-step149-smoke.js` now checks the
  real drag-triggered extension responsibility directly: older-window load,
  visible range presence, cache growth, latency, and replay-state isolation.

## Next Direction

Step 152 should verify auto-play speed under continuous history extension. Keep
the work in existing runtime boundaries: auto-play delegates advancement to
manual-next/chart-entry, replay owns cursor/reveal state, bar-data owns
requests/cache, chart-data owns merges, and chart-engine owns series writes.
