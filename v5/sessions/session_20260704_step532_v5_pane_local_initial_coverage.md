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
- Step 532.3-532.6: pending.

## Step 532.2 Verification

- `node --check v5/tests/multi-pane-initial-coverage-browser-smoke.js`
- `node v5/tests/multi-pane-initial-coverage-browser-smoke.js`
- `git diff --check`

## Next

Implement Step 532.3 next: make display-window loading continue bounded
backward seeking when initial rendered coverage is below the target pane's
visible capacity, then flip the baseline smoke to target behavior.
