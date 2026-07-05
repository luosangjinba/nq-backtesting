# Step 538 V5 Different-TF Next Fast Path

Date: 2026-07-04

## Trigger

Manual testing reported that `Next` felt close to half a second again after the
mixed-timeframe pane fixes.

## Initial Findings

- Step 517 cursor persistence queue is still present.
- Step 518 `APPEND_BARS` / Lightweight `series.update` fast path is still
  present.
- Single-pane cadence automation measured max visible latency around 10.4ms.
- Single-pane latest-intent trace showed `fallbackAppendMs: null`, confirming
  incremental append is still active.
- Same-TF multi-pane latest-intent observer measured about 17ms, but polling /
  frame observations can be much later.
- The likely regression is Step 537 putting different-TF display-window
  projection on the `Next` click path even when the target pane already covers
  the cursor bucket.

## Plan

1. Document and commit this plan.
2. Add a regression for covered different-TF projection.
3. Add a fast path that syncs viewport follow without display-window load when
   pane bars already cover the cursor bucket.
4. Run targeted latency and replay regressions, then close the docs.

## Status

In progress.
