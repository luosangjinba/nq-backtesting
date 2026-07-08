# V6 Replay Speed Under History Extension - Step 150

## Decision

Step 150 accepts replay speed under leftward historical extension.

V6 now verifies that replay `Next` remains responsive when an older-window
history request is in flight and immediately after an older-window history
extension has loaded.

## Accepted Behavior

- Chart-history may coordinate older-window extension, but it must not consume
  replay advancement or mutate replay cursor state.
- Bar-data remains the only owner that requests and caches historical bars.
- Chart-data remains the owner of append/prepend merges and no-future filtering.
- Chart-engine remains the only owner that writes Lightweight Charts series.
- Replay runtime remains the only owner of cursor and reveal state.
- History extension requests remain capped to the canvas-left timeline boundary.
- Duplicate in-flight and exhausted older-window suppression from Step 149 is
  preserved.

## Fix

The leftward-history runtime now refreshes replay state immediately before
prepending returned older bars. This prevents a slow older-window request from
using a stale cursor timestamp and filtering out a newer replay candle that was
appended while the older-window request was still pending.

## Coverage

- `replay-speed-history-inflight-step150-smoke.js` proves replay `Next` can run
  while an older-window request is pending, stays below the runtime latency
  budget, and keeps the newly appended replay candle after the history request
  resolves.
- `replay-speed-history-extension-browser-step150-smoke.js` proves browser-visible
  latest-candle latency remains within budget immediately after a historical
  extension, and that history extension does not mutate replay state.
- Existing Step 149 and Step 148 smokes continue to prove drag-triggered loading,
  duplicate suppression, exhausted suppression, and canvas-left request caps.

## Next Direction

Step 151 should extend this foundation into continuous leftward extension until
bar-data reports exhausted historical coverage. Keep the same ownership model:
chart-history coordinates, bar-data requests/caches, chart-data merges,
chart-engine renders, and replay owns cursor/reveal state.
