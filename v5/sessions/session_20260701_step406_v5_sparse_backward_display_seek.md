# Step 406 - V5 Sparse Backward Display Seek

Date: 2026-07-01

Status: completed.

## Goal

Fix left-drag display loading across sparse market gaps, especially the 1m NQ
case where dragging left could stop at a futures session boundary such as Sunday
18:00 instead of continuing to older available bars.

## Observations

Manual validation after Step 405 showed two remaining issues:

- fast mouse drag still has a small pointer/content drift of a few K-lines;
- 1m left drag could stop around a closed/session boundary even though the
  session range is wider.

The first issue now needs delta instrumentation. The second issue has a clear
runtime cause: a backward bounded display-window request can land in a sparse
or empty market period and return no older bars. If replay stops there,
`loadedCoverage.from` does not move left and the next viewport demand repeats
the same boundary.

## Decision

Bar-data runtime continues to own individual bounded window requests. Replay
runtime owns display-history growth and may perform capped sparse seek across
multiple bounded backward windows when the current window adds no older display
bars.

Sparse seek is allowed only when:

- the request direction is backward;
- the requested visible range is materially earlier than the current earliest
  display bar;
- the returned window does not add an older display bar;
- the max seek attempt limit has not been reached.

## Implementation

1. Added replay-runtime helpers for:
   - earliest display timestamp;
   - previous bounded-window anchor;
   - sparse backward seek eligibility.

2. Updated `loadDisplayWindow()` to try up to six bounded backward windows when
   the initial request adds no older display bars.

3. Preserved normal duplicate/cached behavior for small repeated requests near
   the current earliest display bar.

4. Added `displayWindow.attempts` and `displayWindow.seekAttempts` to display
   load results for diagnostics.

5. Added `replay-display-sparse-backward-seek-smoke.js` and included it in
   `v5/scripts/smoke_all.js`.

6. Follow-up real-data validation showed the first Sunday 18:00 backward window
   can return a few opening bars but still leave a large empty gap on the left.
   The seek predicate now continues when the requested viewport is materially
   earlier and the returned window's earliest display bar is still far to the
   right of the bounded window start.

## Checks

- `node v5/tests/replay-display-sparse-backward-seek-smoke.js`
- `node v5/tests/replay-display-timeframe-smoke.js`
- `node v5/tests/replay-display-viewport-demand-wiring-smoke.js`
- `node v5/tests/chart-native-interaction-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Next

Manually retest 1m left drag over the Sunday open boundary. If it still stops,
inspect `displayWindow.attempts` to see whether the V4 bars API returns empty
windows, duplicate boundary bars, or older valid bars that filtering rejects.

If the remaining fast-drag offset is still noticeable, add a browser diagnostic
that records pointer `clientX` deltas, Lightweight logical-range deltas, and V5
manual visible-range deltas for the same drag gesture.

Real API validation on 2026-07-01 confirmed a request anchored at
`2026-05-31T18:00:00.000Z` seeks across the weekend gap and reaches
`2026-05-29T15:48:00.000Z` data after five seek attempts.
