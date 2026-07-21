# Session — R5.6i Third Human Review Rejection

Date: 2026-07-21
Status: rejected; corrective implementation required

## Human Evidence

The third R5.6 review confirmed that higher-timeframe latency is substantially
better, while identifying two remaining correctness regressions:

1. after switching ETH/RTH and/or timeframe, candles can fail to extend across
   the expected loaded interval;
2. after switching to `1h`, the chart can contain an approximately ten-day
   candle-free interval followed by a discontinuous price jump.

The supplied screenshots show the same Session and visible-through cursor, so
the gap is not accepted as Replay movement. Correction must preserve the new
bounded high-timeframe request behavior and its latency improvement.

## Suspected Boundary

The first investigation target is the Replay Workspace source-batch ledger.
Replacement currently retains every older batch ending before the new request,
even when the retained tail and replacement window are not adjacent. Projection
correctly preserves those windows without inventing bars, which can expose the
resulting internal hole on the chart.

## Required Evidence Before Re-Review

- focused ledger coverage for overlapping replacement windows and adjacency;
- ETH/RTH and low/high/low timeframe switch sequences cannot construct an
  internal source-window hole;
- complete Replay Workspace real-browser regression and V7 Harness suite;
- high-timeframe bounded request and interaction latency remain intact;
- `git diff --check` passes.
