# Session 2026-07-04 - Step 521 Visibility Measurement

## Goal

Determine whether the remaining latest-intent latency after Step 520 is a real
production visibility delay or a browser-smoke measurement artifact.

## Product Standard

- Product target remains about 100ms from latest `Next` intent to expected
  candle visible.
- Step 520 made replay command runtime about 16ms, so Step 521 must not
  reintroduce a replay command bottleneck.
- Production changes must stay inside V5 ownership rules: chart runtime writes
  chart/metadata, replay runtime owns cursor/reveal state, bar-data runtime owns
  data loading, and UI does not mutate runtime internals.

## Reference Check

- V5 vendor notes still apply: Lightweight Charts native APIs own chart drawing
  and incremental series updates; V5 should not infer true paint completion
  from a polling loop when metadata is written synchronously by the chart
  adapter.
- The relevant V5 code path writes `data-viewport-cursor-timestamp` through
  chart-engine DOM metadata before `lightweight.append.metadata` is marked.

## Detailed Plan

1. Step 521.1 - Plan and boundary setup.
   - Record Step 520 baseline and the hypothesis that the remaining gap may be
     detection/polling rather than production delay.
   - Non-goals: no production chart/replay change until observer timing proves
     the DOM update itself is late.
   - Commit plan docs.

2. Step 521.2 - Add observer-based visibility trace.
   - In `replay-latest-intent-trace-browser-smoke.js`, attach a
     `MutationObserver` to `data-chart-canvas` before rapid clicks.
   - Record the timestamp when `data-viewport-cursor-timestamp` first reaches
     the expected cursor.
   - Keep the existing polling wait temporarily and report both observer and
     polling timings.
   - Record rAF timing after observer detection.
   - Commit trace-only changes.

3. Step 521.3 - Apply the justified fix.
   - If observer timing is near metadata apply but polling is late, change the
     latest-intent trace smoke to use observer timing as the visibility metric.
   - If observer timing is also late, inspect production metadata write order
     and optimize only the owning chart adapter/runtime path.
   - Keep assertions around no-future display, final cursor, reveal count, and
     no forward fetch.
   - Commit the smallest justified change.

4. Step 521.4 - Regression and closeout.
   - Run:
     `node v5/tests/replay-latest-intent-trace-browser-smoke.js`
     `node v5/tests/replay-latest-intent-browser-smoke.js`
     `node v5/tests/multi-pane-rapid-next-performance-browser-smoke.js`
     `node v5/tests/route-teardown-browser-smoke.js`
     `node v5/tests/replay-controls-browser-smoke.js`
     `git diff --check`
   - Update TODO/session handoff with measured before/after timings.
   - Commit closeout docs.

## Non-Goals

- Do not change replay cursor/reveal semantics.
- Do not make UI own replay state or chart writes.
- Do not bypass chart runtime to write metadata.
- Do not tune browser smoke thresholds without explaining the measurement.

## Status

- Step 521.1: completed. Planned the visibility measurement step and recorded
  the no-production-change-until-proven boundary.
- Step 521.2: completed. Added `MutationObserver` visibility timing to the
  latest-intent trace smoke while keeping polling/rAF comparison metrics.

## Baseline From Step 520

- final-click-to-visible by polling: about 138ms.
- final-click-to-replay-start: about 1ms.
- replay next: about 16ms.
- chart runtime append: about 12ms.
- Lightweight append: about 6ms.
- replay end to polling-visible detection: about 121ms.
- Lightweight metadata to polling-visible detection: about 131ms.

Interpretation: the remaining gap is after the chart adapter has already
applied metadata. Step 521 should prove whether the DOM mutation is visible
earlier than the polling loop records.

## Observer Trace

- `node --check v5/tests/replay-latest-intent-trace-browser-smoke.js` passed.
- `node v5/tests/replay-latest-intent-trace-browser-smoke.js` passed.
- Trace sample:
  - final-click-to-observed-visible: about 12ms.
  - observer reason: `mutation`.
  - observer-to-polling-visible: about 3ms.
  - observer-to-animation-frame: about 126ms.
  - final-click-to-replay-start: about 0.5ms.
  - replay next: about 14ms.
  - chart runtime append: about 10ms.
  - Lightweight metadata to observed visible: about 7ms.

Interpretation: production metadata visibility is already fast. The remaining
large number was a measurement artifact from using later rAF/polling timing as
the primary latest-intent metric. Step 521.3 should make observer detection the
primary trace metric and keep polling/rAF as secondary diagnostics.
