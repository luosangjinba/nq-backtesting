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

- Step 518.1: completed. The trace contract and handoff are documented.
- Step 518.2: completed. Added opt-in trace marks and a single-pane browser
  trace smoke.

## Initial Trace

First trace sample for 20 rapid `Next` clicks on single-pane 1m replay:

- final-click-to-visible: about 290ms.
- final-click-to-animation-frame: about 304ms.
- controls flush: about 191ms.
- replay command: about 185ms.
- replay next: about 178ms.
- bar-data load window: about 0.1ms.
- replay chart append: about 175ms.
- chart sync append: about 96ms.

Interpretation: the remaining delay is not forward data fetching. The dominant
measured segment is the chart append/follow path. Step 518.3 should add deeper
chart-runtime/adapter timing around append host sync, Lightweight update, resize,
and visible-range follow before choosing an optimization.
