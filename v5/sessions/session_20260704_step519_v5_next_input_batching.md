# Session 2026-07-04 - Step 519 Replay Next Input Batching

## Goal

Reduce the remaining perceptible rapid `Next` delay by targeting the controls
input-batching path, after Step 518 proved data loading and chart replacement
are no longer the dominant bottlenecks.

## Product Standard

- Product target remains about 100ms from latest `Next` intent to expected
  candle visible.
- The same standard applies to single pane and multi-pane replay.
- UI may batch click intent, but it must not expose a per-candle queue or delay
  the first replay command behind an avoidable timer.
- UI still dispatches commands only. Chart runtime remains the only chart
  writer, bar-data runtime remains the only requester/cache owner, and replay
  runtime owns cursor/reveal state.

## Plan

1. Run the Step 518 latency smokes sequentially to establish a clean baseline.
2. Add trace coverage for the input path from `controls.next.click` to
   `controls.next.flush.start`, `controls.next.command.start`, and
   `replay.next.start`.
3. Optimize `chart-replay-controls.js` so the first `Next` click starts work
   immediately while later clicks coalesce into pending batch state.
4. Re-run single-pane and multi-pane latency gates, update TODO/session
   handoff, and keep lifecycle disposal of pending `Next` intact.

## Status

- Step 519.1: completed. Baseline smokes were run sequentially after reboot.
- Step 519.2: completed. Added input-batching trace marks for queue/schedule
  and extended the trace smoke to report final-click-to-flush,
  final-click-to-command, and final-click-to-replay-start timing.
- Step 519.3: completed. Replaced timer-backed initial `Next` flush scheduling
  with microtask scheduling so a rapid click burst still coalesces, but the
  flush starts without a timer delay.
- Step 519.4: completed. Ran the focused latency/control regression set and
  closed the TODO/session handoff.

## Baseline

- `node v5/tests/replay-latest-intent-trace-browser-smoke.js` passed on rerun.
  Initial launch failed once at Chrome debug-port connection before app
  assertions; no stale Chrome/debug process remained.
- Trace sample:
  - final-click-to-visible: about 239ms.
  - controls flush: about 116ms.
  - replay command: about 110ms.
  - replay next: about 104ms.
  - load window: about 0.1ms.
  - chart append: about 102ms.
  - chart runtime host sync: about 8ms.
  - Lightweight append / series update: about 4ms.
- `node v5/tests/replay-latest-intent-browser-smoke.js` passed.
- `node v5/tests/multi-pane-rapid-next-performance-browser-smoke.js` passed.

Interpretation: the incremental chart path is active and data loading is not the
problem. Step 519 should measure and reduce timer/queue delay before replay
command start.

## Next

Use the input trace to remove avoidable timer delay from the first rapid `Next`
intent while preserving pending-click coalescing and route teardown cleanup.

## Input Trace

- `node --check v5/src/features/chart-replay/chart-replay-controls.js` passed.
- `node --check v5/tests/replay-latest-intent-trace-browser-smoke.js` passed.
- `node v5/tests/replay-latest-intent-trace-browser-smoke.js` passed.
- Trace sample:
  - final-click-to-visible: about 315ms.
  - final-click-to-flush-start: about 20ms.
  - final-click-to-command-start: about 20ms.
  - final-click-to-replay-start: about 20ms.
  - queue-to-flush-start: about 20ms.
  - controls flush: about 121ms.
  - replay next: about 102ms.
  - chart runtime host sync: about 9ms.

Interpretation: the timer delay is measurable, but the larger remaining segment
is still the single coalesced command doing the visible replay update. The next
change should remove the first-click timer wait without adding one command per
click.

## Input Batching Optimization

- A direct synchronous flush was tested first and rejected: it split a 20-click
  burst into an immediate 1-step command followed by a 19-step command, which
  increased latest-intent latency.
- The accepted implementation uses `queueMicrotask` for the first pending
  `Next` flush. This preserves same-turn click coalescing while avoiding the
  timer queue.
- `pendingNextTimer` remains only for the existing edge path where new pending
  clicks arrive while the controller is refreshing after a completed batch.
- Disposal still clears pending step count and prevents the microtask callback
  from mutating live state after teardown.
- Verification:
  - `node --check v5/src/features/chart-replay/chart-replay-controls.js` passed.
  - `node --check v5/tests/replay-latest-intent-trace-browser-smoke.js` passed.
  - `node v5/tests/replay-latest-intent-trace-browser-smoke.js` passed.
  - `node v5/tests/replay-latest-intent-browser-smoke.js` passed.
- Post-fix trace sample:
  - final-click-to-visible: about 242ms.
  - final-click-to-flush-start: about 0.2ms.
  - final-click-to-command-start: about 0.3ms.
  - final-click-to-replay-start: about 0.8ms.
  - schedule-to-flush-start: about 1ms.
  - controls flush: about 106ms.
  - replay next: about 93ms.

## Final Verification

- `node v5/tests/replay-latest-intent-trace-browser-smoke.js` passed.
- `node v5/tests/replay-latest-intent-browser-smoke.js` passed.
- `node v5/tests/multi-pane-rapid-next-performance-browser-smoke.js` passed.
- `node v5/tests/route-teardown-browser-smoke.js` passed.
- `node v5/tests/replay-controls-browser-smoke.js` passed.
- Final trace sample:
  - final-click-to-visible: about 241ms.
  - final-click-to-flush-start: about 0.1ms.
  - final-click-to-command-start: about 0.2ms.
  - final-click-to-replay-start: about 0.7ms.
  - schedule-to-flush-start: about 1ms.
  - controls flush: about 112ms.
  - replay next: about 93ms.
  - chart runtime host sync: about 12ms.

## Next

Step 520 should target the remaining time inside the coalesced replay command.
Step 519 removed the input/timer gap, but the product target is still not fully
met because final-click-to-visible remains around 240ms in the trace.
