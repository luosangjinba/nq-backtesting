# Session 2026-07-04 - Step 532 Pane-Local Initial Coverage

## Goal

Make pane-local explicit timeframe changes and pane initialization load enough
historical bars to cover the target pane's visible width without requiring an
immediate left drag.

## Trigger

Manual testing showed the left active pane can now switch to `1H` and render,
but initial display may still leave the left side under-covered. Dragging left
then extends and fills the canvas, which points to an initial coverage gap.

## Detailed Plan

1. Step 532.1 - Plan and documentation.
   - Add `pane-local-initial-coverage-plan.md`.
   - Update TODO, docs index, specs index, and session index.
   - Commit planning docs.

2. Step 532.2 - Add two-pane initial coverage smoke.
   - Cover primary/left active switched to `1H`.
   - Assert rendered bars cover the target pane's estimated visible capacity
     without manual left drag.
   - Commit harness.

3. Step 532.3 - Load enough initial display-window bars.
   - Use target pane viewport metrics and bounded backward seek to reach a
     minimum coverage goal.
   - Preserve no-future filtering.
   - Commit runtime fix.

4. Step 532.4 - Guard duplicate demand races.
   - Verify initial coverage does not race with stale viewport demand.
   - Preserve manual left-extension behavior.
   - Commit guard or no-code documentation.

5. Step 532.5 - Add three-pane coverage regression.
   - Verify one pane's `1H` coverage does not mutate other panes.
   - Commit regression and any minimal fix.

6. Step 532.6 - Regression and closeout.
   - Run planned multi-pane/replay gates.
   - Update TODO/spec/session with results.
   - Commit closeout docs.

## Status

- Step 532.1: completed. Planning spec, TODO, docs index, specs index, and
  session index now point to pane-local initial coverage.
- Step 532.2: completed. Added
  `v5/tests/multi-pane-initial-coverage-browser-smoke.js` as a current-bug
  baseline. With sparse weekday-only `1H` data, primary/left active `1H`
  initial load renders only 18 bars against a minimum coverage target around
  52, and only one `1H` display-window request is made.
- Step 532.3: completed. Replay display-window loading now has a minimum
  display coverage target based on target pane viewport metrics. Backward
  display-window loading continues bounded seeking while merged display bars
  are below that target, preserving existing no-future filtering.
- Step 532.4: completed. The initial coverage smoke now also forces a manual
  left-extension after coverage is reached. It verifies another `1H`
  viewport-demand load occurs, primary stays on `1H`, and secondary stays on
  `1m`.
- Step 532.5: completed. Added
  `v5/tests/triple-pane-initial-coverage-browser-smoke.js`. It verifies
  primary `1H` initial coverage reaches target in a triple layout while
  secondary remains `5m` and tertiary remains `1m`.
- Step 532.6: completed. Regression/closeout gates passed and Step 532 is
  closed.

## Step 532.2 Verification

- `node --check v5/tests/multi-pane-initial-coverage-browser-smoke.js`
- `node v5/tests/multi-pane-initial-coverage-browser-smoke.js`
- `git diff --check`

## Step 532.3 Verification

- `node --check v5/src/runtime/replay-runtime-state.js`
- `node --check v5/src/runtime/replay-display-window-controller.js`
- `node --check v5/tests/multi-pane-initial-coverage-browser-smoke.js`
- `node v5/tests/replay-display-timeframe-no-future-smoke.js`
- `node v5/tests/replay-display-progression-smoke.js`
- `node v5/tests/multi-pane-initial-coverage-browser-smoke.js`
- `node v5/tests/multi-pane-timeframe-follow-browser-smoke.js`
- `node v5/tests/multi-pane-viewport-demand-browser-smoke.js`
- `git diff --check`

## Step 532.5 Verification

- `node --check v5/tests/triple-pane-initial-coverage-browser-smoke.js`
- `node v5/tests/triple-pane-initial-coverage-browser-smoke.js`
- `git diff --check`

## Step 532.4 Verification

- `node --check v5/tests/multi-pane-initial-coverage-browser-smoke.js`
- `node v5/tests/multi-pane-initial-coverage-browser-smoke.js`
- `node v5/tests/multi-pane-viewport-demand-browser-smoke.js`
- `git diff --check`

## Step 532.6 Verification

- `node v5/tests/multi-pane-initial-coverage-browser-smoke.js`
- `node v5/tests/triple-pane-initial-coverage-browser-smoke.js`
- `node v5/tests/multi-pane-timeframe-follow-browser-smoke.js`
- `node v5/tests/multi-pane-wheel-timeframe-isolation-browser-smoke.js`
- `node v5/tests/triple-pane-timeframe-isolation-browser-smoke.js`
- `node v5/tests/multi-pane-viewport-demand-browser-smoke.js`
- `node v5/tests/replay-display-timeframe-no-future-smoke.js`
- `node v5/tests/replay-right-edge-follow-browser-smoke.js`
- `git diff --check`

## Next

Step 532 is complete. Manually retest the active-pane `1H` two-pane and
three-pane cases in the running app; if the multi-pane queue is quiet, return
to the Settings parity candidate from Step 528.
