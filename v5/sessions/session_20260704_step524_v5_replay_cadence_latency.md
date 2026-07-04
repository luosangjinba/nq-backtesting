# Session 2026-07-04 - Step 524 Replay Cadence Latency

## Goal

Measure the replay `Next` path that was not covered by the previous
latest-intent burst tests: click once, wait until the next candle is visible,
then click again within a short human cadence window.

## Product Context

- Step 521/522 latest-intent gates prove the final intent of a rapid burst is
  visible quickly in single-pane mode.
- That data does not measure the interval-by-interval experience of:
  `click -> candle appears -> click again within <100ms -> next candle appears`.
- Manual testing reports current single-pane and multi-pane feel comparable to
  FXReplay, so this step is a measurement/gate step rather than a runtime
  optimization step.

## Product Standard

- The primary user-facing unit is one visible replay advance per click.
- The test should observe chart-runtime-owned cursor metadata, not replay state
  alone, because the product question is when the candle appears.
- UI remains command-only; replay runtime owns cursor/reveal state; chart
  runtime owns chart writes and chart metadata; bar-data runtime owns fetches
  and cache.

## Detailed Plan

1. Step 524.1 - Plan and boundary setup.
   - Record the cadence-latency gap and scope.
   - Keep this step as test/documentation unless the new smoke finds a
     correctness or clearly perceptible latency issue.
   - Commit docs before test changes.

2. Step 524.2 - Add single-pane cadence latency smoke.
   - Create a browser smoke that starts a replay session, then advances a small
     sequence one click at a time.
   - For each click, start a `MutationObserver` on
     `data-viewport-cursor-timestamp`, click `Next`, wait for the expected
     cursor timestamp, record observed latency, then wait 50ms before the next
     click.
   - Assert each observed advance stays below a 120ms automation ceiling while
     reporting p95/max/average against the 100ms product target.
   - Assert replay cursor/reveal state, chart cursor metadata, bar deltas, and
     no forward request during the cadence path.
   - Commit the smoke harness.

3. Step 524.3 - Run cadence smoke and record findings.
   - Run the new smoke and record measured average, p95, max, and request
     behavior.
   - If the smoke fails for real latency/correctness, diagnose before closing
     the step. If it passes, keep runtime unchanged.
   - Commit findings.

4. Step 524.4 - Regression and closeout.
   - Run:
     `node v5/tests/replay-cadence-latency-browser-smoke.js`
     `node v5/tests/replay-latest-intent-browser-smoke.js`
     `node v5/tests/replay-controls-browser-smoke.js`
     `git diff --check`
   - Update TODO/session handoff with the result and next recommendation.
   - Commit closeout docs.

## Non-Goals

- Do not optimize multi-pane latency in this step unless the cadence test
  reveals a new user-visible problem.
- Do not replace existing latest-intent burst gates; cadence is a separate
  acceptance shape.
- Do not read replay runtime state as a proxy for visual appearance.
- Do not add UI-owned chart or replay state.

## Status

- Step 524.1: active. Planning the cadence-latency measurement and boundary.

## Next

Implement the single-pane cadence browser smoke, then decide from measured data
whether a multi-pane cadence audit is useful as a later optional step.
