# Step 539 - V5 Manual Logical Anchor Wall

## Context

Manual testing reported that dragging away from the initial replay wall and then
playing did not preserve the new temporary wall. New candles moved right until
they reached the default wall, then resumed default-wall behavior.

The previous fix preserved a time-based manual visible range, but Lightweight
Charts' screen position is governed by logical range. Time-based ranges cannot
reliably preserve right-side whitespace or a manually chosen latest-candle
screen position after replay append or data-window replacement.

## Change

- Chart runtime now stores native manual logical range metadata alongside the
  manual time range.
- Native Lightweight visible-range callbacks pass the rendered bar count used
  by that logical range, so runtime can derive a relative manual anchor:
  `rightOffsetBars` from the latest rendered bar plus the current logical span.
- Replay cursor movement still shifts the manual time range by cursor delta,
  but the logical wall is now reapplied from the relative anchor against the
  current rendered bars.
- Lightweight adapter now prefers this relative logical anchor when applying a
  manual visible range, falling back to supplied absolute logical range or the
  old time-range projection only when needed.
- The native interaction browser smoke now asserts that after a native manual
  viewport and replay Next, the latest candle keeps its manual right offset and
  the logical span remains unchanged. The assertion no longer assumes replay
  Next must call `setData()`, preserving the Step 517/518 append fast path.
- Follow-up from live screenshots: viewport-demand/display-window loading also
  has to preserve the logical anchor. The demand payload now carries the
  pane-local manual logical range/anchor, and display-window restoration passes
  it back through `chart.setManualVisibleRange`. Without this, a drag that
  triggered left-window loading could restore only the time range and erase the
  temporary wall before Play.

## Ownership

- Chart runtime owns manual interaction state and relative manual logical
  anchor state.
- Lightweight adapter owns applying `setVisibleLogicalRange`.
- Replay runtime still owns cursor movement only; it does not read DOM,
  presentation settings, or chart adapter state.

## Verified

- `node v5/tests/chart-runtime-engine-adapter-smoke.js`
- `node v5/tests/replay-manual-viewport-follow-smoke.js`
  - includes viewport-demand/display-window restoration preserving
    `manualLogicalAnchor`.
- `node v5/tests/chart-native-interaction-browser-smoke.js`
- `node v5/tests/replay-right-edge-follow-browser-smoke.js`
- `node v5/tests/replay-chart-sync-fanout-smoke.js`
- `node v5/tests/replay-cadence-latency-browser-smoke.js`
  - average around `9.9ms`, p95/max `42ms`, no forward request during cadence.
- `node v5/tests/multi-pane-tf-change-next-fanout-browser-smoke.js`
- `node v5/tests/chart-interaction-contracts-smoke.js`

## Next

Manual retest in the live app:

- initial default wall, then Play/Next;
- drag left and drag right immediately from the initial state, then Play/Next;
- wheel zoom away from the default wall, then Play/Next;
- two-pane and three-pane replay with pane-local manual walls.

If this is quiet, return to the Settings parity checklist candidate from Step
528.
