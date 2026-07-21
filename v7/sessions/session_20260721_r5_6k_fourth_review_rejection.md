# Session — R5.6k Fourth Human Review Rejection

Date: 2026-07-21
Status: rejected; responsive history correction required

## Human Evidence

Across all timeframes, rapidly dragging candles right until the left blank area
is large triggers earlier-history loading that takes about two to three seconds.
During that work the system appears frozen and does not respond to mouse input.

The supplied `8h` screenshot preserves the May 1 Replay-visible cursor but
shows 1,348 accepted aggregate candles and a wall near September. This indicates
that repeated 35-day history chunks have accumulated into the active pane and
are being synchronously reprocessed/repainted as one growing snapshot.

## Required Correction Evidence

- real-Chrome rapid-drag reproduction on a high timeframe;
- phase timings for acquisition, Projection, series mutation, and paint;
- pointer/main-thread responsiveness evidence during history loading;
- coalesced boundary intent rather than one queued request per repeated pointer
  release;
- no regression in continuous source windows, no-future visibility, cursor
  retention, completion slots, or higher-timeframe Next latency;
- complete V7 Harnesses and `git diff --check`.
