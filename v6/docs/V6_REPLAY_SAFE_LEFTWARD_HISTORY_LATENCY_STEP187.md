# V6 Replay-Safe Leftward History Latency Gate - Step 187

## Decision

Step 187 converts the post-step 186 drag/history stability policy into a
replay-safe browser gate.

Older-history loading may be delayed, coalesced, chunked, pending, or
completing. During those states, replay controls and native chart dragging must
remain visibly responsive. The current screen's K-lines have priority over
immediate leftward data loading.

## Accepted Behavior

- Leftward history input is triggered only from chart-surface visible-range
  events that reach the canvas-left side of the loaded data window.
- Continuous visible-range changes are coalesced before issuing
  `REQUEST_LEFT_EXTENSION`.
- Oversized older windows are loaded in bounded chunks.
- Native manual drag records viewport intent but does not immediately project
  that measured range back into Lightweight Charts.
- A `prepend` during manual mode must not emit a viewport projection back into
  the chart.
- When older bars are prepended, chart surface shifts the visible logical range
  by the prepended bar count so the current screen remains visually stable.
- Replay `Next` remains responsive while a delayed or pending older-history
  extension is active.
- Replay state is not mutated by leftward historical extension.

## Boundary

- `leftward-history-input-bridge` may schedule and coalesce history-extension
  commands, but it does not request bars directly.
- `chart-history` coordinates older-window extension and exhausted/in-flight
  suppression only.
- `bar-data` owns requests, cache, database adapters, and chunked window plans.
- `chart-data` owns prepend/append/replace records.
- `chart-engine` owns Lightweight Charts series writes and visible-range
  compensation after prepends.
- `chart-viewport` owns viewport intent/projection state and suppresses
  prepend-triggered manual projection.
- `replay` remains the only owner of cursor/reveal state.

## Coverage

- `replay-safe-leftward-history-latency-browser-step187-smoke.js` covers
  replay `Next` responsiveness while leftward history work is delayed and
  completing, replay-state isolation, chunk/canvas-left metadata, and visible
  range compensation.
- Existing drag/history smokes continue to cover fast manual drag stability,
  drag release, canvas-left request caps, leftward extension, and browser chart
  regression coverage.

## Verification

- `node v6/tests/replay-safe-leftward-history-latency-browser-step187-smoke.js`
- `node v6/tests/fast-right-drag-stability-browser-smoke.js`
- `node v6/tests/drag-triggered-history-extension-browser-step149-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next Direction

After this gate passes, Step 188 can continue chart foundation work with less
risk: replay, manual drag, and leftward history loading will have explicit
browser coverage for the interaction class that caused the V5 repair churn.
