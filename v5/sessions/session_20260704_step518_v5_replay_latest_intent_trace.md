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
- Step 518.3: completed. Added deeper chart-runtime and host-sync trace marks
  around append state update, rendered-bar computation, adapter append, resize,
  and fallback rendering.
- Step 518.4: completed. Added sliding-window tail append support so replay
  follow can use incremental adapter append when the rendered window shifts
  left and new bars enter on the right.
- Step 518.5: completed. Re-ran relevant gates and recorded remaining risk.

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

Second trace sample after adding chart-runtime details:

- final-click-to-visible: about 298ms.
- replay chart append: about 172ms.
- chart sync append: about 90ms.
- chart runtime append: about 88ms.
- chart runtime state update: about 0.1ms.
- chart runtime host sync: about 88ms.
- chart host rendered compute: about 0.2ms.
- adapter append / Lightweight append: not entered.

Interpretation: the visible window slides during replay follow, so the old
prefix-only append detector treats the update as non-append and falls back to a
full host sync / replacement path. The next optimization should support a
sliding-window tail append so the engine can call incremental series updates
when the right edge advances, even when old left-side rendered bars leave the
visible window.

Post-fix trace sample:

- final-click-to-visible: about 275ms.
- replay chart append: about 97ms.
- chart sync append: about 11ms.
- chart runtime append: about 10.5ms.
- chart runtime host sync: about 10ms.
- chart host adapter append: about 4.3ms.
- Lightweight append / series update: about 3.7ms.

Result: chart host sync now enters incremental `lightweight.append` instead of
falling back to replacement. This removed the main chart replacement cost. The
remaining user-visible delay is now more likely in controls batching / browser
event scheduling / command dispatch around rapid clicks rather than bar-data
fetch or chart replacement.

Verification:

- `node v5/tests/replay-latest-intent-trace-browser-smoke.js` passed.
- `node v5/tests/replay-latest-intent-browser-smoke.js` passed when run alone.
- `node v5/tests/multi-pane-rapid-next-performance-browser-smoke.js` passed.
- `node v5/tests/replay-viewport-follow-browser-smoke.js` passed.
- `node v5/tests/chart-runtime-engine-adapter-smoke.js` passed.

Test note: running multiple headless browser smokes in parallel can inflate
latest-intent latency above the current browser threshold even though the chart
append path remains incremental. Use sequential browser runs for latency gates
until the next step separates control/event-loop delay from browser resource
contention.

## Next Recommended Step

Step 519 should target controls/input batching. The chart replacement bottleneck
is removed, but user testing still reports perceptible delay versus FXReplay.
The next trace target is the gap between the final button click and
`controls.next.flush.start` / `replay.next.start`, plus whether rapid clicks
should update a latest desired cursor without waiting for a timer-backed flush.

## After Reboot Handoff

Repository state before reboot:

- Branch: `v5/fx-replay-workstation`.
- Worktree was clean after Step 518 commits.
- Latest Step 518 commits:
  - `c2afdd2 docs(v5): plan replay latest-intent trace step`
  - `15d075c test(v5): add replay latest-intent trace smoke`
  - `044ae34 test(v5): trace chart append replay phases`
  - `b479788 fix(v5): append sliding replay windows incrementally`
  - `7250f27 docs(v5): close replay latest-intent trace step`

Recommended startup checks after reboot:

1. Confirm branch and clean worktree:
   - `git branch --show-current`
   - `git status --short`
2. Confirm no stale local servers are already using the V5 dev port:
   - `ss -ltnp | rg ':8011|:8001|:8765|:8766'`
3. Run latency browser smokes sequentially, not in parallel:
   - `node v5/tests/replay-latest-intent-trace-browser-smoke.js`
   - `node v5/tests/replay-latest-intent-browser-smoke.js`
   - `node v5/tests/multi-pane-rapid-next-performance-browser-smoke.js`
4. If latency smoke fails immediately after reboot, rerun once sequentially
   before treating it as a product regression. If manual testing still feels
   slower than FXReplay, proceed to Step 519.

Step 519 entry point:

- Start from `v5/src/features/chart-replay/chart-replay-controls.js`.
- Focus on `handleNextClick`, `schedulePendingNext`, `flushPendingNext`,
  `runNext`, and `runReplayCommand`.
- Measure the gap from final click to `controls.next.flush.start` and
  `replay.next.start`.
- Decide whether `Next` should dispatch immediately on the first click and
  coalesce only extra pending clicks, instead of always waiting for a
  timer-backed flush.
