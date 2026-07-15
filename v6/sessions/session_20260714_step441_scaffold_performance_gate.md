# Session — Step 441 Scaffold Performance Gate

Date: 2026-07-14

## Outcome

The time scaffold has a direct incremental performance invariant: after the
initial candle load, 1,000 appended Replay bars use 1,000 `update()` calls and
zero additional candle `setData()` calls. The auxiliary 32-point scaffold may
refresh independently without rebuilding candle history.

The current cache-hit, mixed-timeframe, manual-next HTF, auto-play HTF,
time-axis scaffold, drag, and multi-Pane browser gates pass.

## Historical Harness Finding

`replay-safe-leftward-history-latency-browser-step187-smoke.js` still fails its
separate requirement that a pending older-window request must append bars. Its
Manual Next timing threshold was not loosened. The append assertion depends on
available older data and is not a deterministic measurement of the dual-Series
hot path; Step 443 must retire or rewrite that historical coupling.

## Verification

- `node v6/tests/time-axis-scaffold-incremental-performance-smoke.js`
- `node v6/tests/time-axis-scaffold-browser-smoke.js`
- `node v6/tests/visible-latency-cache-hit-browser-smoke.js`
- `node v6/tests/mixed-timeframe-visible-latency-browser-smoke.js`
- `node v6/tests/manual-next-htf-visible-latency-browser-step197-smoke.js`
- `node v6/tests/auto-play-htf-visible-latency-browser-step199-smoke.js`
- chart browser pack: first 11 current gates pass; Step 187 historical append
  coupling fails and is explicitly routed to Step 443
- `node v6/tests/boundary-smoke.js`
- `git diff --check`
