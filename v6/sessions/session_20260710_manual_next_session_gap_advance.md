# 2026-07-10 - Manual Next Session Gap Advance

## Context

Manual replay could stop at the first no-bar minute around a session break.
For example, a session starting before the 17:00 break advanced the replay
cursor into the gap, but the chart-entry path loaded the last pre-gap bar and
kept appending that stale bar. The same symptom appeared through HTF display
projection because the underlying source cursor did not move to the next real
bar.

## Changes

- Added `replay.setCursorTime` as a replay-owned command for bounded cursor
  realignment.
- Added manual-next gap detection: first probe the requested cursor, then scan
  forward in bounded source-timeframe windows only when the cursor has no exact
  source bar.
- Kept chart-entry ownership intact: chart-entry requests bars and appends
  chart data, while replay runtime still owns replay cursor state.
- Covered 1m, 5m, and 15m display paths in the browser gap smoke.
- Relaxed the display-timeframe leftward auto-chain browser assertion so data
  boundary exhaustion is allowed when the chart has already loaded older data.

## Verification

- `node v6/tests/replay-domain-smoke.js`
- `node v6/tests/replay-runtime-smoke.js`
- `node v6/tests/manual-next-session-gap-step258-smoke.js`
- `node v6/tests/manual-next-session-gap-browser-step258-smoke.js`
- `node v6/tests/chart-entry-manual-next-runtime-smoke.js`
- `node v6/tests/manual-next-htf-projection-step197-smoke.js`
- `node v6/tests/auto-play-htf-projection-step199-smoke.js`
- `node v6/tests/manual-next-htf-visible-latency-browser-step197-smoke.js`
- `node v6/tests/display-timeframe-leftward-auto-chain-browser-smoke.js`
- `node v6/tests/visible-kline-latency-regression-pack-step257-smoke.js`
