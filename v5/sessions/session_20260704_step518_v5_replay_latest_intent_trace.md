# Session 2026-07-04 - Step 518 Replay Latest-Intent Trace

## Goal

Measure the remaining manual replay `Next` delay with phase-level trace data,
then apply only a bounded optimization that the trace justifies.

## Plan

1. Document the Step 518 trace contract and update TODO/session handoff.
2. Add an opt-in replay latest-intent trace harness for single-pane rapid
   `Next`, with phase timestamps from input to visible cursor.
3. Run the trace, identify the dominant delay segment, and apply one bounded
   optimization if the data points to a clear fix.
4. Re-run single-pane and multi-pane replay gates, update the handoff with
   timings, and commit the final result.

## Product Standard

- Product target remains about 100ms from latest `Next` intent to expected
  candle visible.
- V4 and FXReplay already provide the target feel, so V5 delay is a V5 defect.
- Pane count must not introduce a user-visible per-pane or per-candle queue.

## Status

- Step 518.1: in progress.
